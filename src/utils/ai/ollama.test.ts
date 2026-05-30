import { supportsVision, parseModels, parseKeywords } from './ollama';

// ── supportsVision ────────────────────────────────────────────────────────────

test('supportsVision: llava:7b → true', () => {
  expect(supportsVision('llava:7b')).toBe(true);
});

test('supportsVision: moondream → true', () => {
  expect(supportsVision('moondream')).toBe(true);
});

test('supportsVision: minicpm-v → true', () => {
  expect(supportsVision('minicpm-v')).toBe(true);
});

test('supportsVision: bakllava → true', () => {
  expect(supportsVision('bakllava')).toBe(true);
});

test('supportsVision: llama3.2:3b → false', () => {
  expect(supportsVision('llama3.2:3b')).toBe(false);
});

test('supportsVision: mistral → false', () => {
  expect(supportsVision('mistral')).toBe(false);
});

// ── parseModels ───────────────────────────────────────────────────────────────

test('parseModels: extracts name and size from valid JSON', () => {
  const json = JSON.stringify({
    models: [
      { name: 'llava:7b', size: 4500000000 },
      { name: 'llama3.2:3b', size: 2000000000 },
    ],
  });
  const result = parseModels(json);
  expect(result).toHaveLength(2);
  expect(result[0]).toMatchObject({ id: 'llava:7b', name: 'llava:7b', sizeGb: 4.5, supportsVision: true });
  expect(result[1]).toMatchObject({ id: 'llama3.2:3b', supportsVision: false });
});

test('parseModels: returns empty array for malformed JSON', () => {
  expect(parseModels('not json')).toEqual([]);
});

test('parseModels: returns empty array for empty models list', () => {
  expect(parseModels(JSON.stringify({ models: [] }))).toEqual([]);
});

// ── parseKeywords ─────────────────────────────────────────────────────────────

test('parseKeywords: splits comma-separated response', () => {
  const result = parseKeywords('outdoor, family, summer', []);
  expect(result).toEqual(['outdoor', 'family', 'summer']);
});

test('parseKeywords: handles newline-separated response', () => {
  const result = parseKeywords('outdoor\nfamily\nsummer', []);
  expect(result).toEqual(['outdoor', 'family', 'summer']);
});

test('parseKeywords: deduplicates against existing keywords (case-insensitive)', () => {
  const result = parseKeywords('outdoor, Family, summer', ['family', 'winter']);
  expect(result).not.toContain('family');
  expect(result).toContain('outdoor');
  expect(result).toContain('summer');
});

test('parseKeywords: strips surrounding quotes', () => {
  const result = parseKeywords('"outdoor", "family"', []);
  expect(result).toEqual(['outdoor', 'family']);
});

test('parseKeywords: filters empty strings', () => {
  const result = parseKeywords('outdoor,,family', []);
  expect(result).toEqual(['outdoor', 'family']);
});
