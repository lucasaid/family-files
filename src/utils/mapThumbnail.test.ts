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

test('mapFileName: formats as lat_lng.png', () => {
  expect(mapFileName(48.8566, 2.3522)).toBe('48.8566_2.3522.png');
});

test('mapFileName: handles negative coordinates', () => {
  expect(mapFileName(-33.8688, 151.2093)).toBe('-33.8688_151.2093.png');
});

test('mapFilePath: joins mapsDir and filename', () => {
  expect(mapFilePath('/images/.maps', 48.8566, 2.3522)).toBe('/images/.maps/48.8566_2.3522.png');
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
