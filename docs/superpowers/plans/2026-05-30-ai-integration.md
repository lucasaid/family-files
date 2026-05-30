# AI Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Ollama-backed AI keyword generation (vision) and person summary generation (text) with a provider abstraction that makes adding Claude or other backends a one-file change.

**Architecture:** A `src/utils/ai/` folder holds the `AIProvider` interface, an `OllamaProvider` implementation, and a registry factory. Settings grow four new fields. `MetadataFields` gets a "Generate with AI" button for keywords; `PersonDetail` gets a summary section with a generate/regenerate modal. Summaries persist in `people.json` via a new `UPDATE_PERSON_SUMMARY` reducer action.

**Tech Stack:** TypeScript, React, Node.js `http` module (via `window.require`), Ollama REST API, Vitest.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/ai/types.ts` | **Create** | `AIProvider` interface, `AIModel`, `KeywordsInput`, `SummaryInput`, `AIError` |
| `src/utils/ai/ollama.ts` | **Create** | `OllamaProvider` + pure helpers + `pullModel`/`deleteModel`/`RECOMMENDED_MODELS` |
| `src/utils/ai/registry.ts` | **Create** | `getProvider(settings)` factory |
| `src/utils/ai/index.ts` | **Create** | Re-exports |
| `src/utils/ai/types.test.ts` | **Create** | `AIError` tests |
| `src/utils/ai/ollama.test.ts` | **Create** | Pure helper tests: `supportsVision`, `parseModels`, `parseKeywords` |
| `src/utils/ai/registry.test.ts` | **Create** | `getProvider` tests |
| `src/context/types.ts` | **Modify** | Add `summary?` to `Person`, AI fields to `AppSettings`, `UPDATE_PERSON_SUMMARY` action |
| `src/context/AppContext.tsx` | **Modify** | Handle `UPDATE_PERSON_SUMMARY` in reducer |
| `src/context/AppContext.test.ts` | **Modify** | Add `UPDATE_PERSON_SUMMARY` reducer test |
| `src/Settings/index.tsx` | **Modify** | Add `AISettingsSection` component |
| `src/Photos/MetadataFields.tsx` | **Modify** | Add "Generate with AI" button in keywords section |
| `src/People/PersonDetail.tsx` | **Modify** | Add summary section, generate button, and summary modal |

---

## Task 1: AI types and AIError

**Files:**
- Create: `src/utils/ai/types.ts`
- Create: `src/utils/ai/types.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/ai/types.test.ts`:

```ts
import { AIError } from './types';

test('AIError is an instance of Error', () => {
  const e = new AIError('NOT_RUNNING', 'Ollama is not running');
  expect(e).toBeInstanceOf(Error);
});

test('AIError carries the correct code and message', () => {
  const e = new AIError('MODEL_NOT_FOUND', 'llava:7b not found');
  expect(e.code).toBe('MODEL_NOT_FOUND');
  expect(e.message).toBe('llava:7b not found');
});

test('AIError.name is AIError', () => {
  expect(new AIError('REQUEST_FAILED', 'oops').name).toBe('AIError');
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
yarn test:run src/utils/ai/types.test.ts
```

Expected: `Cannot find module './types'`

- [ ] **Step 3: Create `src/utils/ai/types.ts`**

```ts
export type AIErrorCode =
  | 'NOT_RUNNING'
  | 'MODEL_NOT_FOUND'
  | 'VISION_REQUIRED'
  | 'REQUEST_FAILED';

export class AIError extends Error {
  constructor(public readonly code: AIErrorCode, message: string) {
    super(message);
    this.name = 'AIError';
  }
}

export interface AIModel {
  id: string;
  name: string;
  sizeGb?: number;
  supportsVision: boolean;
}

export interface KeywordsInput {
  imageBase64: string;
  mimeType: string;
  existingKeywords: string[];
}

export interface SummaryInput {
  name: string;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
  occupation?: string;
  nationality?: string;
  spouses: string[];
  children: string[];
  parents: string[];
  photoCount: number;
  documentTypes: string[];
  locationNames: string[];
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<AIModel[]>;
  generateKeywords(input: KeywordsInput, modelId: string): Promise<string[]>;
  generatePersonSummary(input: SummaryInput, modelId: string): Promise<string>;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
yarn test:run src/utils/ai/types.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/ai/types.ts src/utils/ai/types.test.ts
git commit -m "feat: add AI provider types and AIError"
```

---

## Task 2: Ollama pure helpers + tests

**Files:**
- Create: `src/utils/ai/ollama.ts` (pure helpers only — HTTP added in Task 3)
- Create: `src/utils/ai/ollama.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/ai/ollama.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
yarn test:run src/utils/ai/ollama.test.ts
```

Expected: `Cannot find module './ollama'`

- [ ] **Step 3: Create `src/utils/ai/ollama.ts` with pure helpers and stubs**

```ts
const http = (window as any).require('http') as typeof import('http');

import { AIProvider, AIModel, AIError, KeywordsInput, SummaryInput } from './types';
import { AppSettings } from '../../context/types';

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export function supportsVision(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return ['llava', 'moondream', 'minicpm-v', 'bakllava'].some(v => id.includes(v));
}

export function parseModels(json: string): AIModel[] {
  try {
    const data = JSON.parse(json);
    return (data.models ?? []).map((m: any) => ({
      id: m.name,
      name: m.name,
      sizeGb: m.size ? Math.round(m.size / 1e8) / 10 : undefined,
      supportsVision: supportsVision(m.name),
    }));
  } catch {
    return [];
  }
}

export function parseKeywords(response: string, existing: string[]): string[] {
  const existingSet = new Set(existing.map(k => k.toLowerCase()));
  return response
    .split(/[,\n]/)
    .map(k => k.trim().toLowerCase().replace(/^["']|["']$/g, ''))
    .filter(k => k.length > 0 && !existingSet.has(k));
}

// ── Curated download list ─────────────────────────────────────────────────────

export const RECOMMENDED_MODELS: AIModel[] = [
  { id: 'moondream', name: 'Moondream', sizeGb: 1.7, supportsVision: true },
  { id: 'llava:7b', name: 'LLaVA 7B', sizeGb: 4.5, supportsVision: true },
  { id: 'llava:13b', name: 'LLaVA 13B', sizeGb: 8.0, supportsVision: true },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', sizeGb: 2.0, supportsVision: false },
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', sizeGb: 1.3, supportsVision: false },
];

// ── HTTP helpers (internal) ───────────────────────────────────────────────────

function httpGet(url: URL): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: url.hostname, port: parseInt(url.port) || 80, path: url.pathname, method: 'GET' },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function httpPost(url: URL, body: object): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: url.hostname, port: parseInt(url.port) || 80,
        path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpDelete(url: URL, body: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: url.hostname, port: parseInt(url.port) || 80,
        path: url.pathname, method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      res => { res.resume(); res.on('end', resolve); }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpStream(url: URL, body: object, onLine: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: url.hostname, port: parseInt(url.port) || 80,
        path: url.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      res => {
        let buf = '';
        res.on('data', (c: Buffer) => {
          buf += c.toString();
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          lines.filter(Boolean).forEach(onLine);
        });
        res.on('end', () => { if (buf.trim()) onLine(buf); resolve(); });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── OllamaProvider factory ────────────────────────────────────────────────────

export function createOllamaProvider(baseUrl: string): AIProvider {
  return {
    id: 'ollama',
    name: 'Ollama (local)',

    async isAvailable(): Promise<boolean> {
      try {
        await httpGet(new URL('/', baseUrl));
        return true;
      } catch {
        return false;
      }
    },

    async listModels(): Promise<AIModel[]> {
      try {
        const raw = await httpGet(new URL('/api/tags', baseUrl));
        return parseModels(raw);
      } catch (e) {
        if ((e as any).code === 'ECONNREFUSED') throw new AIError('NOT_RUNNING', 'Ollama is not running');
        throw new AIError('REQUEST_FAILED', (e as Error).message);
      }
    },

    async generateKeywords(input: KeywordsInput, modelId: string): Promise<string[]> {
      if (!supportsVision(modelId)) throw new AIError('VISION_REQUIRED', 'This model does not support images — choose a vision model in Settings');
      const existing = input.existingKeywords.join(', ');
      const prompt = `List up to 10 descriptive keywords for this photo. Include activities, emotions, setting type (indoor/outdoor), era or decade if apparent, and notable objects.${existing ? ` Do not include: ${existing}.` : ''} Return only a comma-separated list. No explanation.`;
      try {
        const raw = await httpPost(new URL('/api/generate', baseUrl), {
          model: modelId, prompt, images: [input.imageBase64], stream: false,
        });
        const data = JSON.parse(raw);
        return parseKeywords(data.response ?? '', input.existingKeywords);
      } catch (e) {
        if (e instanceof AIError) throw e;
        if ((e as any).code === 'ECONNREFUSED') throw new AIError('NOT_RUNNING', 'Ollama is not running');
        throw new AIError('REQUEST_FAILED', (e as Error).message);
      }
    },

    async generatePersonSummary(input: SummaryInput, modelId: string): Promise<string> {
      const payload = JSON.stringify({
        name: input.name,
        born: input.birthYear ? `${input.birthYear}${input.birthPlace ? ' in ' + input.birthPlace : ''}` : undefined,
        died: input.deathYear,
        occupation: input.occupation,
        nationality: input.nationality,
        family: { parents: input.parents, spouses: input.spouses, children: input.children },
        photos: input.photoCount,
        locations: input.locationNames,
        documents: input.documentTypes,
      }, null, 2);
      const prompt = `Write a short detailed biographical summary of ${input.name} based on this family archive data. Be factual about what is documented. Use a measured, respectful tone where information is sparse. Make sure to add any interesting findings within the data.\n\nData:\n${payload}`;
      try {
        const raw = await httpPost(new URL('/api/generate', baseUrl), {
          model: modelId, prompt, stream: false,
        });
        const data = JSON.parse(raw);
        return data.response ?? '';
      } catch (e) {
        if (e instanceof AIError) throw e;
        if ((e as any).code === 'ECONNREFUSED') throw new AIError('NOT_RUNNING', 'Ollama is not running');
        throw new AIError('REQUEST_FAILED', (e as Error).message);
      }
    },
  };
}

// ── Ollama-specific operations (not on AIProvider interface) ──────────────────

export async function pullModel(
  baseUrl: string, modelId: string, onProgress: (pct: number) => void
): Promise<void> {
  await httpStream(new URL('/api/pull', baseUrl), { name: modelId }, line => {
    try {
      const d = JSON.parse(line);
      if (d.total && d.completed) {
        onProgress(Math.round((d.completed / d.total) * 100));
      }
    } catch { /* skip malformed lines */ }
  });
}

export async function deleteModel(baseUrl: string, modelId: string): Promise<void> {
  await httpDelete(new URL('/api/delete', baseUrl), { name: modelId });
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
yarn test:run src/utils/ai/ollama.test.ts
```

Expected: 13 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/ai/ollama.ts src/utils/ai/ollama.test.ts
git commit -m "feat: add Ollama provider with pure helpers and HTTP implementation"
```

---

## Task 3: Registry and index

**Files:**
- Create: `src/utils/ai/registry.ts`
- Create: `src/utils/ai/index.ts`
- Create: `src/utils/ai/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/ai/registry.test.ts`:

```ts
import { getProvider } from './registry';
import { AppSettings } from '../../context/types';

function settings(patch: Partial<AppSettings> = {}): AppSettings {
  return { ...patch };
}

test('getProvider: returns null when aiProvider is not set', () => {
  expect(getProvider(settings())).toBeNull();
});

test('getProvider: returns null when aiProvider is null', () => {
  expect(getProvider(settings({ aiProvider: null }))).toBeNull();
});

test('getProvider: returns null for an unknown provider id', () => {
  expect(getProvider(settings({ aiProvider: 'unknown' }))).toBeNull();
});

test('getProvider: returns an AIProvider for ollama', () => {
  const p = getProvider(settings({ aiProvider: 'ollama' }));
  expect(p).not.toBeNull();
  expect(p!.id).toBe('ollama');
  expect(typeof p!.isAvailable).toBe('function');
  expect(typeof p!.generateKeywords).toBe('function');
  expect(typeof p!.generatePersonSummary).toBe('function');
});

test('getProvider: uses aiOllamaUrl from settings', () => {
  const p = getProvider(settings({ aiProvider: 'ollama', aiOllamaUrl: 'http://192.168.1.10:11434' }));
  expect(p).not.toBeNull();
  expect(p!.id).toBe('ollama');
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
yarn test:run src/utils/ai/registry.test.ts
```

Expected: `Cannot find module './registry'`

- [ ] **Step 3: Create `src/utils/ai/registry.ts`**

```ts
import { AIProvider } from './types';
import { createOllamaProvider } from './ollama';
import { AppSettings } from '../../context/types';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

// To add a new provider: add a case here and create src/utils/ai/<name>.ts
export function getProvider(settings: AppSettings): AIProvider | null {
  switch (settings.aiProvider) {
    case 'ollama':
      return createOllamaProvider(settings.aiOllamaUrl ?? DEFAULT_OLLAMA_URL);
    // case 'claude':
    //   return createClaudeProvider(settings.claudeApiKey ?? '');
    default:
      return null;
  }
}
```

- [ ] **Step 4: Create `src/utils/ai/index.ts`**

```ts
export { getProvider } from './registry';
export type { AIProvider, AIModel, KeywordsInput, SummaryInput, AIErrorCode } from './types';
export { AIError } from './types';
export { RECOMMENDED_MODELS, pullModel, deleteModel } from './ollama';
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
yarn test:run src/utils/ai/registry.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 6: Run all AI tests together**

```bash
yarn test:run src/utils/ai/
```

Expected: 21 tests PASS across types, ollama, registry

- [ ] **Step 7: Commit**

```bash
git add src/utils/ai/registry.ts src/utils/ai/index.ts src/utils/ai/registry.test.ts
git commit -m "feat: add AI provider registry"
```

---

## Task 4: Data model — Person.summary, AppSettings AI fields, UPDATE_PERSON_SUMMARY

**Files:**
- Modify: `src/context/types.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/context/AppContext.test.ts`

- [ ] **Step 1: Write the failing reducer test**

Add to `src/context/AppContext.test.ts`:

```ts
test('UPDATE_PERSON_SUMMARY: sets summary on the matching person', () => {
  const s0 = appReducer(initialState, { type: 'SET_PEOPLE', people: [person] });
  const s1 = appReducer(s0, { type: 'UPDATE_PERSON_SUMMARY', id: 'p1', summary: 'Alice was born...' });
  expect(s1.people.find(p => p.id === 'p1')?.summary).toBe('Alice was born...');
});

test('UPDATE_PERSON_SUMMARY: does not affect other people', () => {
  const alice = { id: 'p1', name: 'Alice' };
  const bob   = { id: 'p2', name: 'Bob' };
  const s0 = appReducer(initialState, { type: 'SET_PEOPLE', people: [alice, bob] });
  const s1 = appReducer(s0, { type: 'UPDATE_PERSON_SUMMARY', id: 'p1', summary: 'Alice...' });
  expect(s1.people.find(p => p.id === 'p2')?.summary).toBeUndefined();
});
```

- [ ] **Step 2: Run — confirm they fail**

```bash
yarn test:run src/context/AppContext.test.ts
```

Expected: TypeScript error — `UPDATE_PERSON_SUMMARY` not in `AppAction`

- [ ] **Step 3: Update `src/context/types.ts`**

Add `summary?: string` to `Person`:

```ts
export interface Person {
  id: string;
  name: string;
  familyTreeId?: string;
  primaryPhotoFile?: string;
  summary?: string;
}
```

Add AI fields to `AppSettings`:

```ts
export interface AppSettings {
  familyTreeStartId?: string;
  photosAlwaysEdit?: boolean;
  photosSaveOnNavigate?: boolean;
  aiProvider?: string | null;
  aiOllamaUrl?: string;
  aiOllamaKeywordsModel?: string;
  aiOllamaSummaryModel?: string;
}
```

Add `UPDATE_PERSON_SUMMARY` to `AppAction` (alongside the other person actions):

```ts
| { type: 'UPDATE_PERSON_SUMMARY'; id: string; summary: string }
```

- [ ] **Step 4: Handle `UPDATE_PERSON_SUMMARY` in `src/context/AppContext.tsx`**

Add this case inside the `switch` in `appReducer`, after `case 'UPDATE_PERSON':`:

```ts
case 'UPDATE_PERSON_SUMMARY':
  return {
    ...state,
    people: state.people.map(p =>
      p.id === action.id ? { ...p, summary: action.summary } : p
    ),
  };
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
yarn test:run src/context/AppContext.test.ts
```

Expected: all tests PASS (including the 2 new ones)

- [ ] **Step 6: Build check**

```bash
yarn build 2>&1 | tail -5
```

Expected: clean build

- [ ] **Step 7: Commit**

```bash
git add src/context/types.ts src/context/AppContext.tsx src/context/AppContext.test.ts
git commit -m "feat: add Person.summary, AI settings fields, UPDATE_PERSON_SUMMARY action"
```

---

## Task 5: Settings modal — AI Integration section

**Files:**
- Modify: `src/Settings/index.tsx`

- [ ] **Step 1: Add `AISettingsSection` and new imports to `src/Settings/index.tsx`**

Add these imports at the top of the file (after existing imports):

```ts
import { getProvider, RECOMMENDED_MODELS, pullModel, deleteModel } from '../utils/ai';
import type { AIModel } from '../utils/ai';
```

Add the `AISettingsSection` component before the `export default function SettingsModal` line:

```tsx
function AISettingsSection() {
  const { state, dispatch } = useAppContext();
  const s = state.settings;
  const isOllama = s.aiProvider === 'ollama';
  const ollamaUrl = s.aiOllamaUrl ?? 'http://localhost:11434';

  const [installedModels, setInstalledModels] = useState<AIModel[] | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [downloadId, setDownloadId] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isOnline = navigator.onLine;

  async function save(patch: Partial<typeof s>) {
    const updated = { ...s, ...patch };
    dispatch({ type: 'SET_SETTINGS', settings: updated });
    await writeSettings(updated);
  }

  async function loadModels() {
    try {
      const provider = getProvider({ ...s, aiProvider: 'ollama' });
      const models = await provider!.listModels();
      setInstalledModels(models);
    } catch {
      setInstalledModels([]);
    }
  }

  React.useEffect(() => {
    if (isOllama) loadModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOllama, ollamaUrl]);

  async function testConnection() {
    setTestStatus('testing');
    try {
      const provider = getProvider({ ...s, aiProvider: 'ollama' });
      setTestStatus((await provider!.isAvailable()) ? 'ok' : 'error');
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  }

  async function handleDownload() {
    if (!downloadId) return;
    setDownloadProgress(0);
    setDownloadError(null);
    try {
      await pullModel(ollamaUrl, downloadId, pct => setDownloadProgress(pct));
      setDownloadProgress(null);
      setDownloadId('');
      await loadModels();
    } catch (e) {
      setDownloadError((e as Error).message);
      setDownloadProgress(null);
    }
  }

  async function handleDelete(modelId: string) {
    try {
      await deleteModel(ollamaUrl, modelId);
      await loadModels();
    } catch { /* best-effort */ }
  }

  const visionModels = (installedModels ?? []).filter(m => m.supportsVision);
  const downloadable = RECOMMENDED_MODELS.filter(
    rm => !(installedModels ?? []).some(
      im => im.id === rm.id || im.id.split(':')[0] === rm.id.split(':')[0]
    )
  );

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
  const fieldLbl: React.CSSProperties = { fontSize: 'var(--font-size-ui)', color: 'var(--text-3)', minWidth: 86, flexShrink: 0 };
  const inp: React.CSSProperties = {
    flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 3, padding: '3px 7px', color: 'var(--input-text)',
    fontSize: 'var(--font-size-ui)', fontFamily: 'inherit',
  };
  const sel: React.CSSProperties = { ...inp, flex: 'none', minWidth: 150 };
  const btnSm: React.CSSProperties = {
    background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)',
    borderRadius: 3, padding: '3px 9px', fontSize: 'var(--font-size-label)',
    cursor: 'pointer', color: 'var(--btn-cancel-text)', flexShrink: 0,
  };

  return (
    <div>
      <div style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
        AI Integration
      </div>

      {/* Provider selector */}
      <div style={{ ...row, marginBottom: 14 }}>
        <span style={fieldLbl}>Provider</span>
        <select
          style={sel}
          value={s.aiProvider ?? ''}
          onChange={e => save({ aiProvider: e.target.value || null })}
        >
          <option value="">Disabled</option>
          <option value="ollama">Ollama (local)</option>
        </select>
        <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', opacity: 0.45 }}>
          Claude API — coming soon
        </span>
      </div>

      {isOllama && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 10, borderLeft: '2px solid var(--border-muted)' }}>

          {/* URL + Test */}
          <div style={row}>
            <span style={fieldLbl}>URL</span>
            <input style={inp} value={ollamaUrl} onChange={e => save({ aiOllamaUrl: e.target.value })} placeholder="http://localhost:11434" />
            <button style={btnSm} onClick={testConnection} disabled={testStatus === 'testing'}>
              {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? '✓ OK' : testStatus === 'error' ? '✗ Error' : 'Test'}
            </button>
          </div>

          {/* Keywords model (vision only) */}
          <div style={row}>
            <span style={fieldLbl}>Keywords model</span>
            <select style={sel} value={s.aiOllamaKeywordsModel ?? ''} onChange={e => save({ aiOllamaKeywordsModel: e.target.value || undefined })}>
              <option value="">— select —</option>
              {visionModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>vision only</span>
          </div>

          {/* Summary model (all) */}
          <div style={row}>
            <span style={fieldLbl}>Summary model</span>
            <select style={sel} value={s.aiOllamaSummaryModel ?? ''} onChange={e => save({ aiOllamaSummaryModel: e.target.value || undefined })}>
              <option value="">— select —</option>
              {(installedModels ?? []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Installed models list */}
          {installedModels && installedModels.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginBottom: 5 }}>Installed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {installedModels.map(m => (
                  <div key={m.id} style={{ ...row }}>
                    <span style={{ flex: 1, fontSize: 'var(--font-size-ui)', color: 'var(--text-2)' }}>{m.name}</span>
                    {m.sizeGb && <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>{m.sizeGb.toFixed(1)} GB</span>}
                    {m.supportsVision && (
                      <span style={{ fontSize: 9, background: 'var(--tag-bg)', border: '1px solid var(--tag-border)', borderRadius: 8, padding: '1px 6px', color: 'var(--accent)' }}>vision</span>
                    )}
                    <button style={btnSm} onClick={() => handleDelete(m.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download */}
          {downloadable.length > 0 && (
            <div>
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginBottom: 5 }}>Download a model</div>
              <div style={row}>
                <select style={sel} value={downloadId} onChange={e => setDownloadId(e.target.value)}>
                  <option value="">— select —</option>
                  {downloadable.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.sizeGb?.toFixed(1)} GB){m.supportsVision ? ' · vision' : ''}
                    </option>
                  ))}
                </select>
                <button
                  style={{ ...btnSm, background: 'var(--btn-primary-bg)', border: '1px solid var(--btn-primary-border)', color: 'var(--btn-primary-text)' }}
                  onClick={handleDownload}
                  disabled={!downloadId || downloadProgress !== null || !isOnline}
                >
                  {downloadProgress !== null ? 'Downloading…' : 'Download'}
                </button>
              </div>
              {downloadProgress !== null && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: 'var(--accent)', height: '100%', width: `${downloadProgress}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)', marginTop: 3 }}>{downloadProgress}%</div>
                </div>
              )}
              {downloadError && (
                <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-error)', marginTop: 4 }}>{downloadError}</div>
              )}
            </div>
          )}

          {/* Connectivity notice */}
          {!isOnline && (
            <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-3)', background: 'var(--bg-elevated)', borderRadius: 4, padding: '8px 10px', lineHeight: 1.5 }}>
              ⚠ You are offline. Ollama inference works without internet. Model downloads require a connection.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `<AISettingsSection />` to the modal render**

Inside `SettingsModal`, at the end of the inner `<div>` (after the Family Tree Start Point section, before the closing `</div>`), add:

```tsx
        {/* AI Integration */}
        <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: 20 }}>
          <AISettingsSection />
        </div>
```

- [ ] **Step 3: Build check**

```bash
yarn build 2>&1 | tail -5
```

Expected: clean build

- [ ] **Step 4: Run full test suite**

```bash
yarn test:run
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Settings/index.tsx
git commit -m "feat: add AI Integration section to Settings modal"
```

---

## Task 6: Keyword generation in MetadataFields

**Files:**
- Modify: `src/Photos/MetadataFields.tsx`

- [ ] **Step 1: Add imports at the top of `src/Photos/MetadataFields.tsx`**

After the existing imports, add:

```ts
import { getProvider } from '../utils/ai';
import { AIError } from '../utils/ai';
```

- [ ] **Step 2: Add `generatingKeywords` and `keywordsError` state to `MetadataFields`**

Inside the `MetadataFields` function body, after the existing state declarations, add:

```ts
const [generatingKeywords, setGeneratingKeywords] = useState(false);
const [keywordsError, setKeywordsError] = useState<string | null>(null);
```

- [ ] **Step 3: Add the `generateKeywords` handler**

After the `saveRating` function, add:

```ts
const generateKeywords = async () => {
  const provider = getProvider(state.settings);
  const modelId = state.settings.aiOllamaKeywordsModel;
  if (!provider || !modelId || !activePhoto.thumbnailPath) return;

  setGeneratingKeywords(true);
  setKeywordsError(null);
  try {
    const fs = (window as any).require('fs') as typeof import('fs');
    const buf: Buffer = fs.readFileSync(activePhoto.thumbnailPath);
    const imageBase64 = buf.toString('base64');
    const mimeType = activePhoto.thumbnailPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const newKeywords = await provider.generateKeywords(
      { imageBase64, mimeType, existingKeywords: draft.keywords },
      modelId
    );
    if (newKeywords.length > 0) {
      set({ keywords: [...draft.keywords, ...newKeywords] });
    }
  } catch (e) {
    setKeywordsError(e instanceof AIError ? e.message : 'AI generation failed');
  } finally {
    setGeneratingKeywords(false);
  }
};
```

- [ ] **Step 4: Add the button below the `KeywordInput` in the render**

Find the Keywords section in the render (around the `<KeywordInput ... />` line) and add the button immediately after it:

```tsx
      {/* Keywords */}
      <div>
        <div style={label}>Keywords</div>
        <KeywordInput keywords={draft.keywords} onChange={kw => set({ keywords: kw })} readOnly={readOnly} onNavigate={onNavigate} />
        {!readOnly && state.settings.aiProvider && state.settings.aiOllamaKeywordsModel && activePhoto.thumbnailPath && (
          <div style={{ marginTop: 5 }}>
            <button
              type="button"
              onClick={generateKeywords}
              disabled={generatingKeywords}
              style={{
                background: 'none', border: '1px solid var(--border-muted)', borderRadius: 3,
                padding: '3px 9px', fontSize: 'var(--font-size-label)',
                cursor: generatingKeywords ? 'default' : 'pointer',
                color: generatingKeywords ? 'var(--text-4)' : 'var(--text-3)',
              }}
            >
              {generatingKeywords ? 'Generating…' : 'Generate with AI'}
            </button>
            {keywordsError && (
              <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-error)', marginTop: 3 }}>
                {keywordsError}
              </div>
            )}
          </div>
        )}
      </div>
```

- [ ] **Step 5: Build check**

```bash
yarn build 2>&1 | tail -5
```

Expected: clean build

- [ ] **Step 6: Commit**

```bash
git add src/Photos/MetadataFields.tsx
git commit -m "feat: add Generate with AI button to keyword field in MetadataFields"
```

---

## Task 7: Person summary in PersonDetail

**Files:**
- Modify: `src/People/PersonDetail.tsx`

- [ ] **Step 1: Add imports**

Update the existing types import line in `src/People/PersonDetail.tsx` to include `FamilyDocument` and `Photo`:

```ts
// Before:
import { FamilyChartPerson, Person } from '../context/types';
// After:
import { FamilyChartPerson, Person, FamilyDocument, Photo } from '../context/types';
```

Also add after the existing import block:

```ts
import { getProvider, AIError } from '../utils/ai';
import type { SummaryInput } from '../utils/ai';
import Modal from '../components/Modal';
```

- [ ] **Step 2: Add `buildSummaryInput` helper function**

Add this function at module scope, above `PersonDetail` (after the `path` require line):

```ts
function buildSummaryInput(
  person: Person,
  photos: Photo[],
  documents: FamilyDocument[],
  fc: FamilyChartPerson | null,
  chart: FamilyChartPerson[]
): SummaryInput {
  const d = fc?.data;
  const resolveName = (id: string) => {
    const p = chart.find(c => c.id === id);
    return p ? fcName(p) : id;
  };
  const locationNames = [...new Set(
    photos
      .map(p => [p.city, p.country].filter(Boolean).join(', '))
      .filter(Boolean)
  )];
  const documentTypes = [...new Set(documents.map(doc => doc.title))];
  return {
    name: person.name,
    birthYear: d?.birthday?.slice(0, 4),
    deathYear: d?.death?.slice(0, 4),
    birthPlace: d?.birthPlace,
    occupation: d?.occupation,
    nationality: d?.nationality,
    spouses: (fc?.rels.spouses ?? []).map(resolveName),
    children: (fc?.rels.children ?? []).map(resolveName),
    parents: (fc?.rels.parents ?? []).map(resolveName),
    photoCount: photos.length,
    documentTypes,
    locationNames,
  };
}
```

- [ ] **Step 3: Add summary state to the `PersonDetail` component**

After the existing `personMapGenerating` state line, add:

```ts
const [summaryGenerating, setSummaryGenerating] = useState(false);
const [summaryModalOpen, setSummaryModalOpen] = useState(false);
const [summaryDraft, setSummaryDraft] = useState('');
const [summaryError, setSummaryError] = useState<string | null>(null);
```

- [ ] **Step 4: Add `generateSummary` handler inside the component**

After the `personMapGenerating` `useEffect`, add:

```ts
const generateSummary = async () => {
  const provider = getProvider(state.settings);
  const modelId = state.settings.aiOllamaSummaryModel;
  if (!provider || !modelId) return;
  setSummaryGenerating(true);
  setSummaryError(null);
  try {
    const photos = state.photos.filter(p => p.faces.some(f => f.personId === id));
    const documents = state.documents.filter(d => d.personIds.includes(id!));
    const fc = person.familyTreeId
      ? (state.familyChart?.find(f => f.id === person.familyTreeId) ?? null)
      : null;
    const input = buildSummaryInput(person, photos, documents, fc, state.familyChart ?? []);
    const result = await provider.generatePersonSummary(input, modelId);
    setSummaryDraft(result);
    setSummaryModalOpen(true);
  } catch (e) {
    setSummaryError(e instanceof AIError ? e.message : 'AI generation failed');
  } finally {
    setSummaryGenerating(false);
  }
};

const saveSummary = async () => {
  dispatch({ type: 'UPDATE_PERSON_SUMMARY', id: person.id, summary: summaryDraft });
  const updated = state.people.map(p => p.id === person.id ? { ...p, summary: summaryDraft } : p);
  await writePeopleJson(updated);
  setSummaryModalOpen(false);
};
```

- [ ] **Step 5: Add "Generate summary" button to the header action row**

Find the header actions `<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>` and add this button alongside the existing ones:

```tsx
            {state.settings.aiProvider && state.settings.aiOllamaSummaryModel && (
              <button
                onClick={generateSummary}
                disabled={summaryGenerating}
                className="btn-ghost-hover"
                style={{
                  background: 'none', border: '1px solid var(--border-muted)', borderRadius: 5,
                  padding: '6px 12px', cursor: summaryGenerating ? 'default' : 'pointer',
                  fontSize: 'var(--font-size-ui)', color: summaryGenerating ? 'var(--text-4)' : 'var(--text-3)',
                  letterSpacing: 'var(--tracking-wordmark)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {summaryGenerating ? 'Generating…' : person.summary ? 'Regenerate summary' : 'Generate summary'}
              </button>
            )}
            {summaryError && (
              <span style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-error)', alignSelf: 'center' }}>
                {summaryError}
              </span>
            )}
```

- [ ] **Step 6: Add summary display section above the Family Tree section**

Find the comment `{/* Family Tree section */}` and insert the summary section immediately before it:

```tsx
      {/* Summary section */}
      {person.summary && (
        <div style={{ marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, letterSpacing: 'var(--tracking-section)', textTransform: 'uppercase', color: 'var(--text-3)', margin: 0 }}>
              Summary
            </h2>
          </div>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--text-2)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {person.summary}
          </p>
        </div>
      )}
```

- [ ] **Step 7: Add the summary review modal**

At the bottom of the return, just before the closing `</div>` of the page, add:

```tsx
      {/* Summary generation modal */}
      {summaryModalOpen && (
        <Modal title="Review Generated Summary" onClose={() => setSummaryModalOpen(false)} width={620} maxHeight="80vh">
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 20, gap: 14 }}>
            <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--text-4)' }}>
              Review and edit the summary before saving. It will be stored on {person.name}'s profile.
            </div>
            <textarea
              value={summaryDraft}
              onChange={e => setSummaryDraft(e.target.value)}
              style={{
                flex: 1, minHeight: 280, resize: 'vertical',
                background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 4, padding: '10px 12px',
                color: 'var(--input-text)', fontSize: 'var(--font-size-body)',
                fontFamily: 'var(--font-sans)', lineHeight: 1.7,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSummaryModalOpen(false)}
                style={{
                  background: 'var(--btn-cancel-bg)', border: '1px solid var(--btn-cancel-border)',
                  borderRadius: 4, padding: '5px 14px', fontSize: 'var(--font-size-ui)',
                  cursor: 'pointer', color: 'var(--btn-cancel-text)',
                }}
              >
                Discard
              </button>
              <button
                onClick={saveSummary}
                style={{
                  background: 'var(--btn-save-bg)', border: '1px solid var(--btn-save-border)',
                  borderRadius: 4, padding: '5px 14px', fontSize: 'var(--font-size-ui)',
                  cursor: 'pointer', color: 'var(--btn-save-text)', fontWeight: 500,
                }}
              >
                Save summary
              </button>
            </div>
          </div>
        </Modal>
      )}
```

- [ ] **Step 8: Build check**

```bash
yarn build 2>&1 | tail -5
```

Expected: clean build

- [ ] **Step 9: Run full test suite**

```bash
yarn test:run
```

Expected: all tests pass

- [ ] **Step 10: Commit**

```bash
git add src/People/PersonDetail.tsx
git commit -m "feat: add person summary generation and display to PersonDetail"
```

---

## Task 8: Smoke test

- [ ] **Step 1: Start the app**

```bash
yarn start
# second terminal:
yarn electron-dev
```

- [ ] **Step 2: Verify Settings AI section**

Open Settings. Expected:
- "AI Integration" section visible at the bottom
- Provider dropdown shows "Disabled", "Ollama (local)", and greyed-out "Claude API — coming soon" text
- Selecting "Ollama (local)" reveals URL field, Test button, model pickers, and download section

- [ ] **Step 3: Verify keyword generation**

With Ollama running and a vision model installed, open a photo with a thumbnail. Expected:
- "Generate with AI" button appears below the keywords field
- Clicking it shows "Generating…" spinner
- On success, new keywords appear as tags in the draft (not yet saved)
- Clicking Save persists them

- [ ] **Step 4: Verify person summary**

Open a person with some photos and family tree data. Expected:
- "Generate summary" button appears in the header row when a summary model is configured
- Clicking opens a modal with editable text after generation completes
- Saving writes the summary to the profile and shows it in a "Summary" section above Family Tree
- Revisiting the page shows the saved summary
- The button label changes to "Regenerate summary" when a summary already exists

- [ ] **Step 5: Final commit if any touch-ups were needed**

```bash
git add -p
git commit -m "fix: smoke-test adjustments for AI integration"
```
