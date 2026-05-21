// src/utils/thumbnails.ts — renderer-side thumbnail generation via canvas + Node fs
const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const cache = new Map<string, string | null>();

// Canvas ops run on the main thread; keep concurrency low to avoid jank
const CONCURRENCY = 2;
let running = 0;
const queue: Array<() => void> = [];

function drain() {
  if (running >= CONCURRENCY || queue.length === 0) return;
  running++;
  const task = queue.shift()!;
  task();
}

function thumbPathFor(fsPath: string): string {
  const dir = path.dirname(fsPath);
  const baseName = path.basename(fsPath, path.extname(fsPath));
  return path.join(dir, '.thumbnails', baseName + '.jpg');
}

function generateThumbnail(fsPath: string, thumbPath: string, maxSize: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        blob.arrayBuffer().then(buf => {
          try {
            fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
            fs.writeFileSync(thumbPath, Buffer.from(buf));
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error(`Failed to load: ${fsPath}`));
    img.src = `file://${fsPath}`;
  });
}

export function getThumbnailPath(fsPath: string, maxSize = 400): Promise<string | null> {
  if (cache.has(fsPath)) return Promise.resolve(cache.get(fsPath) ?? null);

  return new Promise(resolve => {
    queue.push(async () => {
      const thumbPath = thumbPathFor(fsPath);
      try {
        if (fs.existsSync(thumbPath)) {
          const url = `file://${thumbPath}`;
          cache.set(fsPath, url);
          resolve(url);
          return;
        }
        await generateThumbnail(fsPath, thumbPath, maxSize);
        const url = `file://${thumbPath}`;
        cache.set(fsPath, url);
        resolve(url);
      } catch {
        cache.set(fsPath, null);
        resolve(null);
      } finally {
        running--;
        drain();
      }
    });
    drain();
  });
}

export function checkThumbnailOnDisk(fsPath: string): string | null {
  const thumbPath = thumbPathFor(fsPath);
  try {
    fs.accessSync(thumbPath);
    return `file://${thumbPath}`;
  } catch {
    return null;
  }
}
