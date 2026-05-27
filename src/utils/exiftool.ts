// src/utils/exiftool.ts
import { Photo, FaceRegion, Person } from '../context/types';
import { loadCache, saveCache, statImageFiles } from './metadata-cache';

const { execFile } = (window as any).require('child_process') as typeof import('child_process');

// Packaged .app bundles don't inherit the shell PATH, so exiftool (installed via
// Homebrew) won't be found without explicitly including the Homebrew bin paths.
const EXEC_ENV = {
  ...process.env,
  PATH: [
    process.env.PATH,
    '/usr/local/bin',   // Homebrew on Intel Mac
    '/opt/homebrew/bin', // Homebrew on Apple Silicon
    '/usr/bin',
    '/bin',
  ].filter(Boolean).join(':'),
};

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('exiftool', args, { maxBuffer: 50 * 1024 * 1024, env: EXEC_ENV }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function parseDate(raw: string | undefined): string | null {
  return raw ?? null;
}

function parseLocation(data: any): Photo['location'] {
  if (!data.GPSLatitude || !data.GPSLongitude) return null;
  return { lat: Number(data.GPSLatitude), lng: Number(data.GPSLongitude) };
}

function parseFaces(data: any, people: Person[]): FaceRegion[] {
  const regionInfo = data['RegionInfo'] ?? data['XMP-mwg-rs:RegionInfo'] ?? {};
  const regions = regionInfo['RegionList'] ?? data['RegionList'] ?? data['XMP-mwg-rs:RegionList'] ?? [];
  return regions
    .filter((r: any) => r.RegionType === 'Face' || r.Type === 'Face')
    .map((r: any) => {
      const name: string = r.RegionName ?? r.Name ?? '';
      const area = r.RegionArea ?? r.Area ?? {};
      const personId = people.find(p => p.name === name)?.id ?? null;
      const cx = Number(area.X ?? 0);
      const cy = Number(area.Y ?? 0);
      const w = Number(area.W ?? 0);
      const h = Number(area.H ?? 0);
      return {
        personId,
        name,
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
      };
    });
}

function parseKeywords(data: any): string[] {
  const raw = data.Keywords ?? data.Subject ?? data['XMP:Subject'] ?? [];
  const list: string[] = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === 'string' ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  return Array.from(new Set(list));
}

function parsePhotoItem(item: any, people: Person[], dirPath: string): Photo {
  return {
    file: item.FileName,
    path: `file://${dirPath}/${item.FileName}`,
    fsPath: `${dirPath}/${item.FileName}`,
    thumbnailPath: null,
    album: null as null,
    date: parseDate(item.DateTimeOriginal),
    location: parseLocation(item),
    city: item.City ?? null,
    state: item['Province-State'] ?? null,
    country: item['Country-PrimaryLocationName'] ?? null,
    camera: [item.Make, item.Model].filter(Boolean).join(' ') || null,
    caption: item.ImageDescription ?? null,
    rating: item.Rating != null ? Number(item.Rating) : null,
    keywords: parseKeywords(item),
    faces: parseFaces(item, people),
  };
}

export async function readMetadata(dirPath: string, people: Person[]): Promise<Photo[]> {
  const files = statImageFiles(dirPath);
  if (files.length === 0) return [];

  const cache = loadCache(dirPath);

  const hits: any[] = [];
  const missPaths: string[] = [];

  for (const file of files) {
    const entry = cache.entries[file.name];
    if (entry && entry.mtime === file.mtime && entry.size === file.size) {
      hits.push(entry.data);
    } else {
      missPaths.push(`${dirPath}/${file.name}`);
    }
  }

  let freshItems: any[] = [];
  if (missPaths.length > 0) {
    const stdout = await run(['-j', '-n', '-struct', ...missPaths]);
    freshItems = JSON.parse(stdout);

    for (const item of freshItems) {
      const stat = files.find(f => f.name === item.FileName);
      if (stat) {
        cache.entries[item.FileName] = { mtime: stat.mtime, size: stat.size, data: item };
      }
    }
    saveCache(dirPath, cache);
  }

  // Preserve filesystem order
  const byName = new Map([...hits, ...freshItems].map(item => [item.FileName, item]));
  return files
    .map(f => byName.get(f.name))
    .filter((item): item is any => item !== undefined)
    .map(item => parsePhotoItem(item, people, dirPath));
}

export async function writeMeta(
  filePath: string,
  meta: {
    date?: string;
    caption?: string;
    location?: { lat: number; lng: number } | null;
    city?: string;
    state?: string;
    country?: string;
    rating?: number | null;
    keywords?: string[];
  }
): Promise<void> {
  const args = ['-overwrite_original'];
  if (meta.date) args.push(`-DateTimeOriginal=${meta.date}`);
  if (meta.caption !== undefined) args.push(`-ImageDescription=${meta.caption}`);
  if (meta.location) {
    args.push(`-GPSLatitude=${meta.location.lat}`);
    args.push(`-GPSLatitudeRef=${meta.location.lat >= 0 ? 'N' : 'S'}`);
    args.push(`-GPSLongitude=${Math.abs(meta.location.lng)}`);
    args.push(`-GPSLongitudeRef=${meta.location.lng >= 0 ? 'E' : 'W'}`);
  } else if (meta.location === null) {
    args.push('-GPSLatitude=', '-GPSLongitude=');
  }
  if (meta.city !== undefined) args.push(`-IPTC:City=${meta.city}`);
  if (meta.state !== undefined) args.push(`-IPTC:Province-State=${meta.state}`);
  if (meta.country !== undefined) args.push(`-IPTC:Country-PrimaryLocationName=${meta.country}`);
  if (meta.rating !== undefined) {
    args.push(meta.rating != null ? `-Rating=${meta.rating}` : '-Rating=');
  }
  args.push(filePath);
  await run(args);

  // Keywords must be written in two separate exiftool passes:
  // clear+add in the same invocation doesn't reliably replace list tags.
  // Clear all keyword namespaces (IPTC, XMP:Subject, XMP hierarchical).
  if (meta.keywords !== undefined) {
    await run([
      '-overwrite_original',
      '-IPTC:Keywords=',
      '-XMP:Subject=',
      '-XMP:HierarchicalSubject=',
      '-XMP:LastKeywordXMP=',
      filePath,
    ]);
    if (meta.keywords.length > 0) {
      const kwArgs = ['-overwrite_original'];
      for (const kw of meta.keywords) kwArgs.push(`-IPTC:Keywords+=${kw}`);
      kwArgs.push(filePath);
      await run(kwArgs);
    }
  }
}

export async function writeFaceRegions(filePath: string, faces: FaceRegion[]): Promise<void> {
  // Read image dimensions first (needed for mwg-rs applied dimensions)
  const dimOut = await run(['-j', '-n', '-ImageWidth', '-ImageHeight', filePath]);
  const [dim] = JSON.parse(dimOut);
  const w = dim.ImageWidth ?? 1;
  const h = dim.ImageHeight ?? 1;

  // Build struct args; writing the full list replaces any existing regions
  const args = ['-overwrite_original', '-struct'];

  if (faces.length === 0) {
    args.push('-XMP-mwg-rs:RegionInfo=');
  } else {
    const regionStructs = faces.map(f =>
      `{Type=Face,Name=${f.name},Area={X=${f.x + f.w / 2},Y=${f.y + f.h / 2},W=${f.w},H=${f.h},Unit=normalized}}`
    ).join(',');
    args.push(`-XMP-mwg-rs:RegionInfo={AppliedToDimensions={W=${w},H=${h},Unit=pixel},RegionList=[${regionStructs}]}`);
  }
  args.push(filePath);
  await run(args);
}
