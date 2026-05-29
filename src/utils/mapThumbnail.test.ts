import { latLngToTile, mapFileName, mapFilePath, isCoordShared } from './mapThumbnail';
import { Photo } from '../context/types';

function makePhoto(file: string, lat: number | null, lng: number | null): Photo {
  return {
    file, path: `/images/${file}`, fsPath: `/data/images/${file}`,
    thumbnailPath: null, album: null, date: null,
    location: lat !== null && lng !== null ? { lat, lng } : null,
    city: null, state: null, country: null,
    camera: null, caption: null, rating: null, keywords: [], faces: [],
  };
}

test('latLngToTile: null island at zoom 0 maps to tile (0,0)', () => {
  const { x, y } = latLngToTile(0, 0, 0);
  expect(x).toBe(0);
  expect(y).toBe(0);
});

test('latLngToTile: fracX and fracY are in [0, 1)', () => {
  const { fracX, fracY } = latLngToTile(48.8566, 2.3522, 13);
  expect(fracX).toBeGreaterThanOrEqual(0);
  expect(fracX).toBeLessThan(1);
  expect(fracY).toBeGreaterThanOrEqual(0);
  expect(fracY).toBeLessThan(1);
});

test('latLngToTile: x and y are non-negative integers', () => {
  const { x, y } = latLngToTile(51.5074, -0.1278, 10);
  expect(Number.isInteger(x)).toBe(true);
  expect(Number.isInteger(y)).toBe(true);
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
});

test('mapFileName: returns a 32-char hex hash + .png extension', () => {
  expect(mapFileName(48.8566, 2.3522)).toMatch(/^[0-9a-f]{32}\.png$/);
});

test('mapFileName: same coords produce the same filename', () => {
  expect(mapFileName(48.8566, 2.3522)).toBe(mapFileName(48.8566, 2.3522));
});

test('mapFileName: different coords produce different filenames', () => {
  expect(mapFileName(48.8566, 2.3522)).not.toBe(mapFileName(51.5074, -0.1278));
});

test('mapFilePath: joins mapsDir with a hashed .png filename', () => {
  const result = mapFilePath('/images/.maps', 48.8566, 2.3522);
  expect(result.startsWith('/images/.maps/')).toBe(true);
  expect(result.endsWith('.png')).toBe(true);
});

test('isCoordShared: returns false when no other photo has those coords', () => {
  const photos = [
    makePhoto('a.jpg', 48.8566, 2.3522),
    makePhoto('b.jpg', 51.5074, -0.1278),
  ];
  expect(isCoordShared(photos, 'a.jpg', 48.8566, 2.3522)).toBe(false);
});

test('isCoordShared: returns true when another photo shares those coords', () => {
  const photos = [
    makePhoto('a.jpg', 48.8566, 2.3522),
    makePhoto('b.jpg', 48.8566, 2.3522),
  ];
  expect(isCoordShared(photos, 'a.jpg', 48.8566, 2.3522)).toBe(true);
});

test('isCoordShared: does not count the current file itself', () => {
  const photos = [
    makePhoto('a.jpg', 48.8566, 2.3522),
    makePhoto('b.jpg', null, null),
  ];
  expect(isCoordShared(photos, 'a.jpg', 48.8566, 2.3522)).toBe(false);
});
