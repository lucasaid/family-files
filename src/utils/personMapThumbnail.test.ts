import { collectLocationInputs, personMapHash, personMapFilePath } from './personMapThumbnail';
import { Photo } from '../context/types';

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    file: 'a.jpg', path: '/images/a.jpg', fsPath: '/data/images/a.jpg',
    thumbnailPath: null, album: null, date: null,
    location: null, city: null, state: null, country: null,
    camera: null, caption: null, rating: null, keywords: [], faces: [],
    ...overrides,
  };
}

// ── collectLocationInputs ─────────────────────────────────────────────────────

test('collectLocationInputs: photo with GPS produces a gps entry', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ type: 'gps', lat: 48.8566, lng: 2.3522 });
});

test('collectLocationInputs: photo with city + state + country produces a text entry', () => {
  const photos = [makePhoto({ city: 'Paris', state: 'Île-de-France', country: 'France' })];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ type: 'text', city: 'Paris', state: 'Île-de-France', country: 'France' });
});

test('collectLocationInputs: photo missing state or country is skipped', () => {
  const cityOnly = [makePhoto({ city: 'Paris', state: null, country: null })];
  const noState   = [makePhoto({ city: 'Paris', state: null, country: 'France' })];
  const noCity    = [makePhoto({ city: null,    state: 'CA',  country: 'USA' })];
  expect(collectLocationInputs(cityOnly)).toHaveLength(0);
  expect(collectLocationInputs(noState)).toHaveLength(0);
  expect(collectLocationInputs(noCity)).toHaveLength(0);
});

test('collectLocationInputs: photo with GPS and text fields uses GPS, not text', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 }, city: 'Paris', country: 'France' })];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(1);
  expect(result[0].type).toBe('gps');
});

test('collectLocationInputs: photo with no location data is skipped', () => {
  const photos = [makePhoto()];
  expect(collectLocationInputs(photos)).toHaveLength(0);
});

test('collectLocationInputs: duplicate GPS coordinates are deduplicated', () => {
  const photos = [
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
  ];
  expect(collectLocationInputs(photos)).toHaveLength(1);
});

test('collectLocationInputs: duplicate text locations are deduplicated', () => {
  const photos = [
    makePhoto({ file: 'a.jpg', city: 'Paris', state: 'Île-de-France', country: 'France' }),
    makePhoto({ file: 'b.jpg', city: 'Paris', state: 'Île-de-France', country: 'France' }),
  ];
  expect(collectLocationInputs(photos)).toHaveLength(1);
});

test('collectLocationInputs: mixed GPS and text photos both appear', () => {
  const photos = [
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', city: 'London', state: 'England', country: 'UK' }),
  ];
  const result = collectLocationInputs(photos);
  expect(result).toHaveLength(2);
  expect(result.some(r => r.type === 'gps')).toBe(true);
  expect(result.some(r => r.type === 'text')).toBe(true);
});

// ── personMapHash ─────────────────────────────────────────────────────────────

test('personMapHash: returns a 32-char hex string', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  expect(personMapHash(photos)).toMatch(/^[0-9a-f]{32}$/);
});

test('personMapHash: same inputs produce same hash', () => {
  const photos = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  expect(personMapHash(photos)).toBe(personMapHash(photos));
});

test('personMapHash: different GPS coords produce different hash', () => {
  const a = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  const b = [makePhoto({ location: { lat: 51.5074, lng: -0.1278 } })];
  expect(personMapHash(a)).not.toBe(personMapHash(b));
});

test('personMapHash: adding a text location changes the hash', () => {
  const gpsOnly = [makePhoto({ location: { lat: 48.8566, lng: 2.3522 } })];
  const withText = [
    makePhoto({ location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', city: 'London', state: 'England', country: 'UK' }),
  ];
  expect(personMapHash(gpsOnly)).not.toBe(personMapHash(withText));
});

test('personMapHash: photo order does not affect hash', () => {
  const a = [
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
    makePhoto({ file: 'b.jpg', location: { lat: 51.5074, lng: -0.1278 } }),
  ];
  const b = [
    makePhoto({ file: 'b.jpg', location: { lat: 51.5074, lng: -0.1278 } }),
    makePhoto({ file: 'a.jpg', location: { lat: 48.8566, lng: 2.3522 } }),
  ];
  expect(personMapHash(a)).toBe(personMapHash(b));
});

test('personMapHash: empty photos array produces a stable hash', () => {
  expect(personMapHash([])).toMatch(/^[0-9a-f]{32}$/);
  expect(personMapHash([])).toBe(personMapHash([]));
});

// ── personMapFilePath ─────────────────────────────────────────────────────────

test('personMapFilePath: joins mapsDir with hash and .png extension', () => {
  const result = personMapFilePath('/data/.peoplemaps', 'abc123');
  expect(result).toBe('/data/.peoplemaps/abc123.png');
});
