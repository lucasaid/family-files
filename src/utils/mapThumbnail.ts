const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');
const https = (window as any).require('https') as typeof import('https');
const crypto = (window as any).require('crypto') as typeof import('crypto');

import { Photo } from '../context/types';

const ZOOM = 13;
const TILE_SIZE = 256;
const OUTPUT_W = 236;
const OUTPUT_H = 140;

export function latLngToTile(
  lat: number, lng: number, zoom: number
): { x: number; y: number; fracX: number; fracY: number } {
  const n = Math.pow(2, zoom);
  const xF = (lng + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const yF = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x: Math.floor(xF), y: Math.floor(yF), fracX: xF - Math.floor(xF), fracY: yF - Math.floor(yF) };
}

export function mapFileName(lat: number, lng: number): string {
  const hash = crypto.createHash('md5').update(`${lat}_${lng}`).digest('hex');
  return `${hash}.png`;
}

export function mapFilePath(mapsDir: string, lat: number, lng: number): string {
  return path.join(mapsDir, mapFileName(lat, lng));
}

export function isCoordShared(photos: Photo[], currentFile: string, lat: number, lng: number): boolean {
  return photos.some(p => p.file !== currentFile && p.location?.lat === lat && p.location?.lng === lng);
}

export function getMapUrl(mapsDir: string, lat: number, lng: number): string | null {
  const fp = mapFilePath(mapsDir, lat, lng);
  return fs.existsSync(fp) ? `file://${fp}` : null;
}

function fetchTile(x: number, y: number, z: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    https.get(url, { headers: { 'User-Agent': 'FamilyFiles/1.0 (personal family photo app)' } } as any, (res: any) => {
      if (res.statusCode !== 200) { reject(new Error(`tile ${x}/${y} status ${res.statusCode}`)); return; }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(new Blob([Buffer.concat(chunks)], { type: 'image/png' })));
    }).on('error', reject);
  });
}

export async function generateMapThumbnail(lat: number, lng: number, mapsDir: string): Promise<void> {
  if (!navigator.onLine) return;

  const { x: cx, y: cy, fracX, fracY } = latLngToTile(lat, lng, ZOOM);

  const tilePromises: Promise<Blob>[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tilePromises.push(fetchTile(cx + dx, cy + dy, ZOOM));
    }
  }

  let blobs: Blob[];
  try {
    blobs = await Promise.all(tilePromises);
  } catch {
    return; // any tile failure → abort silently
  }

  const bitmaps = await Promise.all(blobs.map(b => createImageBitmap(b)));

  // Composite 3×3 tiles onto a 768×768 canvas
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE * 3;
  canvas.height = TILE_SIZE * 3;
  const ctx = canvas.getContext('2d')!;
  bitmaps.forEach((bm, i) => {
    ctx.drawImage(bm, (i % 3) * TILE_SIZE, Math.floor(i / 3) * TILE_SIZE);
  });

  // Pin: centre tile offset + fractional pixel position within that tile
  const pinX = TILE_SIZE + fracX * TILE_SIZE;
  const pinY = TILE_SIZE + fracY * TILE_SIZE;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(pinX, pinY, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ee0055';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Attribution (required by OSM tile usage policy)
  const attribution = '© OpenStreetMap contributors';
  ctx.font = '10px sans-serif';
  const tw = ctx.measureText(attribution).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(TILE_SIZE * 3 - tw - 8, TILE_SIZE * 3 - 16, tw + 6, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(attribution, TILE_SIZE * 3 - tw - 5, TILE_SIZE * 3 - 5);

  // Crop to OUTPUT_W × OUTPUT_H centred on the pin
  const out = document.createElement('canvas');
  out.width = OUTPUT_W;
  out.height = OUTPUT_H;
  const octx = out.getContext('2d')!;
  const srcX = Math.max(0, Math.min(pinX - OUTPUT_W / 2, TILE_SIZE * 3 - OUTPUT_W));
  const srcY = Math.max(0, Math.min(pinY - OUTPUT_H / 2, TILE_SIZE * 3 - OUTPUT_H));
  octx.drawImage(canvas, srcX, srcY, OUTPUT_W, OUTPUT_H, 0, 0, OUTPUT_W, OUTPUT_H);

  const buf = Buffer.from(out.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''), 'base64');
  try {
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(mapFilePath(mapsDir, lat, lng), buf);
  } catch (err) {
    console.error('[mapThumbnail] write failed:', err);
  }
}

export async function ensureMapThumbnail(lat: number, lng: number, mapsDir: string): Promise<void> {
  if (fs.existsSync(mapFilePath(mapsDir, lat, lng))) return;
  await generateMapThumbnail(lat, lng, mapsDir);
}

export function deleteMapIfUnshared(
  photos: Photo[], currentFile: string,
  lat: number, lng: number, mapsDir: string
): void {
  if (isCoordShared(photos, currentFile, lat, lng)) return;
  const fp = mapFilePath(mapsDir, lat, lng);
  try {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch (err) {
    console.error('[mapThumbnail] delete failed:', err);
  }
}
