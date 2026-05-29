const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const CACHE_VERSION = 2;
const CACHE_FILENAME = 'metadata-v2.json';

const IMAGE_EXT = /\.(jpe?g|png|gif|heic|heif|tiff?|webp|bmp|raw|cr2|nef|arw|orf|rw2|dng|pef|sr2|raf)$/i;

interface CacheEntry {
  mtime: number;
  size: number;
  data: any;
}

interface MetadataCache {
  version: number;
  entries: Record<string, CacheEntry>;
}

export interface FileStats {
  name: string;
  mtime: number;
  size: number;
}

function cachePath(dirPath: string): string {
  return path.join(dirPath, '.cache', CACHE_FILENAME);
}

export function loadCache(dirPath: string): MetadataCache {
  try {
    const raw = fs.readFileSync(cachePath(dirPath), 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.version !== CACHE_VERSION) return empty();
    return parsed;
  } catch {
    return empty();
  }
}

export function saveCache(dirPath: string, cache: MetadataCache): void {
  try {
    const dir = path.join(dirPath, '.cache');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cachePath(dirPath), JSON.stringify(cache), 'utf-8');
  } catch {
    // non-fatal — next launch will re-scan the missed files
  }
}

export function statImageFiles(dirPath: string): FileStats[] {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter(e => e.isFile() && IMAGE_EXT.test(e.name))
      .map(e => {
        const stat = fs.statSync(path.join(dirPath, e.name));
        return { name: e.name, mtime: stat.mtimeMs, size: stat.size };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  } catch {
    return [];
  }
}

function empty(): MetadataCache {
  return { version: CACHE_VERSION, entries: {} };
}
