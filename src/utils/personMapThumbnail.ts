const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');
const https = (window as any).require('https') as typeof import('https');
const crypto = (window as any).require('crypto') as typeof import('crypto');

import { Photo } from '../context/types';
import { latLngToTile } from './mapThumbnail';

const TILE_SIZE = 256;
const OUTPUT_W = 400;
const OUTPUT_H = 220;

// ── Location input types ──────────────────────────────────────────────────────

export interface GpsInput {
  type: 'gps';
  lat: number;
  lng: number;
}

export interface TextInput {
  type: 'text';
  city: string;
  state: string;
  country: string;
}

export type LocationInput = GpsInput | TextInput;

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function collectLocationInputs(photos: Photo[]): LocationInput[] {
  const gpsMap = new Map<string, GpsInput>();
  const textMap = new Map<string, TextInput>();

  for (const p of photos) {
    if (p.location) {
      const key = `${p.location.lat},${p.location.lng}`;
      if (!gpsMap.has(key)) {
        gpsMap.set(key, { type: 'gps', lat: p.location.lat, lng: p.location.lng });
      }
    } else if (p.city || p.state || p.country) {
      const key = `${p.city ?? ''}|${p.state ?? ''}|${p.country ?? ''}`;
      if (!textMap.has(key)) {
        textMap.set(key, { type: 'text', city: p.city ?? '', state: p.state ?? '', country: p.country ?? '' });
      }
    }
  }

  return [...gpsMap.values(), ...textMap.values()];
}

export function personMapHash(photos: Photo[]): string {
  const inputs = collectLocationInputs(photos);
  const gpsLines = inputs
    .filter((i): i is GpsInput => i.type === 'gps')
    .map(i => `${i.lat},${i.lng}`)
    .sort();
  const textLines = inputs
    .filter((i): i is TextInput => i.type === 'text')
    .map(i => `${i.city}|${i.state}|${i.country}`)
    .sort();
  const combined = [...gpsLines, ...textLines].join('\n');
  return crypto.createHash('md5').update(combined).digest('hex');
}

export function personMapFilePath(mapsDir: string, hash: string): string {
  return path.join(mapsDir, `${hash}.png`);
}

function personMapJsonPath(mapsDir: string, hash: string): string {
  return path.join(mapsDir, `${hash}.json`);
}

// ── Geocoding ─────────────────────────────────────────────────────────────────

export async function geocodeLocation(
  city: string, state: string, country: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ format: 'json', limit: '1' });
  if (city) params.set('city', city);
  if (state) params.set('state', state);
  if (country) params.set('country', country);

  return new Promise(resolve => {
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    https.get(
      url,
      { headers: { 'User-Agent': 'FamilyFiles/1.0 (personal family photo app)' } } as any,
      (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            if (Array.isArray(data) && data.length > 0) {
              resolve({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    ).on('error', () => resolve(null));
  });
}

async function geocodeAll(
  inputs: TextInput[]
): Promise<{ lat: number; lng: number }[]> {
  const results: { lat: number; lng: number }[] = [];
  for (const input of inputs) {
    const result = await geocodeLocation(input.city, input.state, input.country);
    if (result) results.push(result);
    // Nominatim usage policy: max 1 request per second
    await new Promise(r => setTimeout(r, 1100));
  }
  return results;
}

// ── Tile fetch ────────────────────────────────────────────────────────────────

function fetchTile(x: number, y: number, z: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    https.get(
      url,
      { headers: { 'User-Agent': 'FamilyFiles/1.0 (personal family photo app)' } } as any,
      (res: any) => {
        if (res.statusCode !== 200) {
          reject(new Error(`tile ${x}/${y} status ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(new Blob([Buffer.concat(chunks)], { type: 'image/png' })));
      }
    ).on('error', reject);
  });
}

// ── Zoom fitting ──────────────────────────────────────────────────────────────

function fitZoom(
  minLat: number, maxLat: number, minLng: number, maxLng: number
): number {
  for (let z = 6; z >= 1; z--) {
    const tl = latLngToTile(maxLat, minLng, z);
    const br = latLngToTile(minLat, maxLng, z);
    const cols = br.x - tl.x + 1;
    const rows = br.y - tl.y + 1;
    // Keep tile count manageable (max ~48 tiles)
    if (cols <= 8 && rows <= 6) return z;
  }
  return 1;
}

// ── Map generation ────────────────────────────────────────────────────────────

export async function generatePersonMapThumbnail(
  points: { lat: number; lng: number }[],
  hash: string,
  mapsDir: string
): Promise<void> {
  if (points.length === 0) return;

  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  // Expand degenerate bbox (single point or all coincident)
  if (maxLat - minLat < 1) { minLat -= 5; maxLat += 5; }
  if (maxLng - minLng < 1) { minLng -= 10; maxLng += 10; }

  // 10% padding
  const latPad = (maxLat - minLat) * 0.1;
  const lngPad = (maxLng - minLng) * 0.1;
  minLat = Math.max(-85, minLat - latPad);
  maxLat = Math.min(85, maxLat + latPad);
  minLng = Math.max(-180, minLng - lngPad);
  maxLng = Math.min(180, maxLng + lngPad);

  const zoom = fitZoom(minLat, maxLat, minLng, maxLng);

  const tl = latLngToTile(maxLat, minLng, zoom);
  const br = latLngToTile(minLat, maxLng, zoom);
  let x0 = tl.x, y0 = tl.y;
  let x1 = br.x, y1 = br.y;

  // Ensure canvas is at least OUTPUT_W × OUTPUT_H
  const minCols = Math.ceil(OUTPUT_W / TILE_SIZE) + 1;
  const minRows = Math.ceil(OUTPUT_H / TILE_SIZE) + 1;
  while (x1 - x0 + 1 < minCols) { x0 = Math.max(0, x0 - 1); x1++; }
  while (y1 - y0 + 1 < minRows) { y0 = Math.max(0, y0 - 1); y1++; }

  const cols = x1 - x0 + 1;
  const rows = y1 - y0 + 1;

  const tilePromises: Promise<Blob>[] = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      tilePromises.push(fetchTile(tx, ty, zoom));
    }
  }
  let blobs: Blob[];
  try {
    blobs = await Promise.all(tilePromises);
  } catch {
    return;
  }

  const bitmaps = await Promise.all(blobs.map(b => createImageBitmap(b)));

  const canvas = document.createElement('canvas');
  canvas.width = cols * TILE_SIZE;
  canvas.height = rows * TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  bitmaps.forEach((bm, i) => {
    ctx.drawImage(bm, (i % cols) * TILE_SIZE, Math.floor(i / cols) * TILE_SIZE);
  });

  // Scale pin/text sizes to remain visible after canvas→output downscaling
  const drawScale = Math.max(canvas.width / OUTPUT_W, canvas.height / OUTPUT_H);
  const pinRadius = Math.round(5 * drawScale);
  const strokeWidth = Math.max(1, 1.5 * drawScale);
  const shadowBlur = 4 * drawScale;
  const shadowOffsetY = 2 * drawScale;

  for (const { lat, lng } of points) {
    const { x, y, fracX, fracY } = latLngToTile(lat, lng, zoom);
    const px = (x - x0) * TILE_SIZE + fracX * TILE_SIZE;
    const py = (y - y0) * TILE_SIZE + fracY * TILE_SIZE;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffsetY;
    ctx.beginPath();
    ctx.arc(px, py, pinRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ee0055';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
    ctx.restore();
  }

  // OSM attribution (required by tile usage policy)
  const attribution = '© OpenStreetMap contributors';
  const fontSize = Math.round(10 * drawScale);
  ctx.font = `${fontSize}px sans-serif`;
  const tw = ctx.measureText(attribution).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(canvas.width - tw - 8 * drawScale, canvas.height - fontSize * 1.6, tw + 6 * drawScale, fontSize * 1.4);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(attribution, canvas.width - tw - 5 * drawScale, canvas.height - fontSize * 0.4);

  // Scale the full tile canvas down to OUTPUT_W × OUTPUT_H so all pins remain visible
  const out = document.createElement('canvas');
  out.width = OUTPUT_W;
  out.height = OUTPUT_H;
  const octx = out.getContext('2d')!;
  octx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, OUTPUT_W, OUTPUT_H);

  const buf = Buffer.from(
    out.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
    'base64'
  );
  try {
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(personMapFilePath(mapsDir, hash), buf);
  } catch (err) {
    console.error('[personMapThumbnail] write failed:', err);
  }
}

// ── Top-level entry point ─────────────────────────────────────────────────────

export async function ensurePersonMapThumbnail(
  photos: Photo[],
  mapsDir: string
): Promise<{ url: string; points: { lat: number; lng: number }[] } | null> {
  if (!navigator.onLine) return null;

  const inputs = collectLocationInputs(photos);
  if (inputs.length === 0) return null;

  const hash = personMapHash(photos);
  const filePath = personMapFilePath(mapsDir, hash);
  const jsonPath = personMapJsonPath(mapsDir, hash);

  // Cache hit: return immediately from saved points sidecar
  if (fs.existsSync(filePath) && fs.existsSync(jsonPath)) {
    try {
      const points = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { lat: number; lng: number }[];
      return { url: `file://${filePath}`, points };
    } catch {
      // sidecar corrupt — fall through and regenerate
    }
  }

  const gpsPoints = inputs
    .filter((i): i is GpsInput => i.type === 'gps')
    .map(i => ({ lat: i.lat, lng: i.lng }));

  const textInputs = inputs.filter((i): i is TextInput => i.type === 'text');
  const geocoded = textInputs.length > 0 ? await geocodeAll(textInputs) : [];
  const allPoints = [...gpsPoints, ...geocoded];

  if (allPoints.length === 0) return null;

  await generatePersonMapThumbnail(allPoints, hash, mapsDir);

  if (!fs.existsSync(filePath)) return null;

  try {
    fs.mkdirSync(mapsDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(allPoints));
  } catch { /* non-fatal */ }

  return { url: `file://${filePath}`, points: allPoints };
}
