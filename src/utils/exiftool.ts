// src/utils/exiftool.ts
import { Photo, FaceRegion, Person } from '../context/types';

const { execFile } = (window as any).require('child_process') as typeof import('child_process');

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('exiftool', args, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
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

export async function readMetadata(dirPath: string, people: Person[]): Promise<Photo[]> {
  const stdout = await run(['-j', '-n', '-struct', dirPath]);
  const items: any[] = JSON.parse(stdout);
  return items.map(item => ({
    file: item.FileName,
    path: `file://${dirPath}/${item.FileName}`,
    fsPath: `${dirPath}/${item.FileName}`,
    date: parseDate(item.DateTimeOriginal),
    location: parseLocation(item),
    camera: [item.Make, item.Model].filter(Boolean).join(' ') || null,
    caption: item.ImageDescription ?? null,
    faces: parseFaces(item, people),
  }));
}

export async function writeMeta(
  filePath: string,
  meta: { date?: string; caption?: string; location?: { lat: number; lng: number } }
): Promise<void> {
  const args = ['-overwrite_original'];
  if (meta.date) args.push(`-DateTimeOriginal=${meta.date}`);
  if (meta.caption !== undefined) args.push(`-ImageDescription=${meta.caption}`);
  if (meta.location) {
    args.push(`-GPSLatitude=${meta.location.lat}`);
    args.push(`-GPSLatitudeRef=${meta.location.lat >= 0 ? 'N' : 'S'}`);
    args.push(`-GPSLongitude=${Math.abs(meta.location.lng)}`);
    args.push(`-GPSLongitudeRef=${meta.location.lng >= 0 ? 'E' : 'W'}`);
  }
  args.push(filePath);
  await run(args);
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
