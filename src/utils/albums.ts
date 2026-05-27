// src/utils/albums.ts
import { dataPath } from './paths';

const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const IMAGES_DIR = path.join(dataPath, 'images');

export async function listAlbums(): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(IMAGES_DIR, { withFileTypes: true });
    return entries
      .filter((e: any) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e: any) => e.name as string)
      .sort();
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
