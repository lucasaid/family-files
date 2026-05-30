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

test('parseKeywords: strips brackets and × symbols from coordinate-like tokens', () => {
  const result = parseKeywords('outdoor, [0.39×, 0.42×], family', []);
  expect(result).toContain('outdoor');
  expect(result).toContain('family');
  expect(result).not.toContain('0.39×');
});

test('parseKeywords: rejects pure numbers', () => {
  const result = parseKeywords('0.39, outdoor, 42', []);
  expect(result).toContain('outdoor');
  expect(result).not.toContain('0.39');
  expect(result).not.toContain('42');
});

test('parseKeywords: keeps decade keywords like 1950s', () => {
  expect(parseKeywords('1950s, outdoor, black-and-white', [])).toContain('1950s');
});

test('parseKeywords: strips numbered list prefixes', () => {
  const result = parseKeywords('1. outdoor\n2. family\n3. summer', []);
  expect(result).toEqual(['outdoor', 'family', 'summer']);
});

test('parseKeywords: rejects bare scale tokens like 2×', () => {
  expect(parseKeywords('outdoor, 2×, 0.5x, family', [])).toEqual(['outdoor', 'family']);
});

test('parseKeywords: strips "Keywords:" label if model echoes it', () => {
  const result = parseKeywords('Keywords: outdoor, family, summer', []);
  expect(result).not.toContain('keywords:');
  expect(result).toContain('outdoor');
  expect(result).toContain('family');
});

test('parseKeywords: extracts words from natural language prose', () => {
  const result = parseKeywords(
    'I see a family gathered outdoors near a garden. Children are playing and smiling.',
    []
  );
  expect(result).toContain('family');
  expect(result).toContain('gathered');
  expect(result).toContain('outdoors');
  expect(result).toContain('garden');
  expect(result).toContain('children');
  expect(result).toContain('playing');
  expect(result).toContain('smiling');
  // stop words filtered
  expect(result).not.toContain('a');
  expect(result).not.toContain('the');
  expect(result).not.toContain('are');
});
