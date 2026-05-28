// src/utils/albums.ts
import { dataPath } from './paths';

const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const IMAGES_DIR = path.join(dataPath, 'images');

export async function listAlbums(): Promise<string[]> {
  async function walk(dir: string, prefix: string): Promise<string[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const albumPath = prefix ? `${prefix}/${e.name}` : e.name;
      results.push(albumPath);
      try {
        const nested = await walk(path.join(dir, e.name), albumPath);
        results.push(...nested);
      } catch { /* unreadable subdir — skip */ }
    }
    return results;
  }
  try {
    return (await walk(IMAGES_DIR, '')).sort();
  } catch {
    return [];
  }
}

export async function createAlbum(name: string): Promise<void> {
  const albumPath = path.join(IMAGES_DIR, name);
  await fs.promises.mkdir(albumPath, { recursive: true });
}

export async function movePhotoToAlbum(
  fsPath: string,
  targetAlbum: string | null,
): Promise<{ newFsPath: string; newPath: string }> {
  const filename = path.basename(fsPath);
  const targetDir = targetAlbum ? path.join(IMAGES_DIR, targetAlbum) : IMAGES_DIR;
  const newFsPath = path.join(targetDir, filename);
  await fs.promises.rename(fsPath, newFsPath);
  return { newFsPath, newPath: `file://${newFsPath}` };
}
