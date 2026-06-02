# AI Integration — Design Spec
_Date: 2026-05-30_

## Overview

Add an AI assistant to Family Files with two tasks: generating photo keywords (vision) and generating biographical person summaries (text). The backend is Ollama running locally. The architecture uses a provider abstraction so Claude or other providers can be added later without touching the feature code. Claude is shown in the UI as a disabled "coming soon" option.

---

## Decisions

| Question | Decision |
|---|---|
| Keywords save behaviour | Manual — AI suggestions merge into the draft; user saves explicitly |
| Summary persistence | Stored in `people.json` as `Person.summary` |
| Model selection | Per-task: separate model for keywords and summaries (user may pick the same model for both) |
| Bulk generation | Out of scope — deferred to a future background-task feature |
| Provider scope | Ollama only (active); Claude shown as coming-soon but not implemented |
| Metadata-derived keywords | Out of scope for this iteration |

---

## Architecture

### Provider abstraction — `src/utils/ai/`

```
src/utils/ai/
  types.ts      — AIProvider interface, AIModel, task input/output types
  ollama.ts     — OllamaProvider: implements AIProvider, model management
  registry.ts   — provider registry map + getProvider(settings) factory
  index.ts      — re-exports
```

**`types.ts`**

```ts
export interface AIModel {
  id: string;           // e.g. 'llava:7b', 'moondream'
  name: string;         // display name
  sizeGb?: number;      // download size hint
  supportsVision: boolean;
}

export interface KeywordsInput {
  imageBase64: string;
  mimeType: string;       // 'image/jpeg' | 'image/png'
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
  documentTypes: string[];  // e.g. ['birth certificate', 'census']
  locationNames: string[];  // unique city/country names from photos
}

export interface AIProvider {
  readonly id: string;    // stable key: 'ollama', 'claude', etc.
  readonly name: string;  // display name
  isAvailable(): Promise<boolean>;
  listModels(): Promise<AIModel[]>;
  generateKeywords(input: KeywordsInput, modelId: string): Promise<string[]>;
  generatePersonSummary(input: SummaryInput, modelId: string): Promise<string>;
}
```

**`registry.ts`**

```ts
// All known providers registered here. Adding a new provider = one import + one line.
const PROVIDERS: Record<string, AIProvider> = {
  ollama: ollamaProvider,
  // claude: claudeProvider,  // uncomment when implemented
};

export function getProvider(id: string | null | undefined): AIProvider | null {
  return id ? PROVIDERS[id] ?? null : null;
}

export function getAllProviders(): AIProvider[] {
  return Object.values(PROVIDERS);
}
```

New providers are added by: (1) creating `src/utils/ai/<name>.ts`, (2) registering in `PROVIDERS`. No changes to feature code.

---

### Ollama provider — `src/utils/ai/ollama.ts`

Uses Electron's `http` module (not `https`) to talk to the local Ollama daemon.

**Model management:**

- `listModels()` → `GET /api/tags` → returns installed models with `supportsVision` derived from name (any model containing `llava`, `moondream`, `minicpm-v`, `bakllava` is flagged as vision-capable)
- `pullModel(modelId, onProgress)` → streaming `POST /api/pull` → calls `onProgress(percent)` as chunks arrive, resolves when complete
- `deleteModel(modelId)` → `DELETE /api/delete`

**Keyword generation:**

Sends a `/api/generate` request with the image encoded inline:
```
Prompt: "List up to 10 descriptive keywords for this photo. Include: 
activities, emotions, setting type (indoor/outdoor), era or decade if 
apparent, and notable objects. Do not include: [existingKeywords].
Return only a comma-separated list. No explanation."
```
Response is split on commas, trimmed, lowercased, deduplicated against `existingKeywords`.

**Summary generation:**

Sends a `/api/generate` request (text-only, no image):
```
Prompt: "Write a short detailed biographical summary of [name] based on 
this family archive data. Be factual about what is documented. Use a 
measured, respectful tone where information is sparse. Make sure to add any interesting findings within the data.

Data: [JSON of SummaryInput fields]"
```
Returns the raw prose string.

**Error handling:** All methods throw a typed `AIError` with a `code`:
- `NOT_RUNNING` — Ollama not reachable
- `MODEL_NOT_FOUND` — requested model not installed
- `VISION_REQUIRED` — image task sent to non-vision model
- `REQUEST_FAILED` — inference error

---

## Data model changes

### `AppSettings` (in `src/context/types.ts`)

```ts
interface AppSettings {
  // ...existing fields...
  aiProvider?: string | null;       // 'ollama' | null (string for extensibility)
  aiOllamaUrl?: string;             // default: 'http://localhost:11434'
  aiOllamaKeywordsModel?: string;   // e.g. 'llava:7b'
  aiOllamaSummaryModel?: string;    // e.g. 'llama3.2:3b'
}
```

### `Person` (in `src/context/types.ts`)

```ts
interface Person {
  // ...existing fields...
  summary?: string;   // AI-generated biographical summary, stored in people.json
}
```

New `AppAction`:
```ts
| { type: 'UPDATE_PERSON_SUMMARY'; id: string; summary: string }
```

---

## Settings UI — new AI section in `SettingsModal`

Rendered as a new collapsible section below the existing settings.

```
AI Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provider    [Disabled ▼]   Disabled / Ollama (local) / Claude API — coming soon

── Ollama ──────────────────────────────────────────
URL         [http://localhost:11434        ]  [Test]

Keywords    [moondream ▼]      (only vision-capable models shown)
model

Summary     [llama3.2:3b ▼]   (all models shown)
model

Available models:
  moondream   1.7 GB   vision  [Delete]
  llava:7b    4.5 GB   vision  [Delete]
  llama3.2:3b 2.0 GB           [Delete]

Download a model:
  [llava:7b ▼]  [Download 4.5 GB]
  ██████░░░░░ 58%  Downloading llava:7b...

── Connectivity ────────────────────────────────────
⚠  You are offline. Ollama runs locally and works 
   without an internet connection.
   (Model downloads require internet.)
```

**Behaviour details:**
- "Test" pings `GET /` on the Ollama URL and shows a green tick or error inline
- Provider dropdown: Ollama is selectable; Claude row is rendered but disabled with a "coming soon" badge
- Keywords model picker only lists models where `supportsVision === true`
- Summary model picker lists all installed models
- Download picker lists a curated set of recommended models that aren't yet installed
- Download streams progress; button becomes "Cancel" mid-download
- Connectivity notice uses `navigator.onLine`; for Ollama the note clarifies inference works offline but downloads need internet

---

## Keyword generation UX

Location: `MetadataFields.tsx`, below the Keywords field.

- Button "Generate with AI" shown only when a provider is configured and a keywords model is selected
- On click: read thumbnail from disk → base64 encode → call `provider.generateKeywords(...)` → spinner replaces button text
- On success: new keywords are merged into the draft (existing keywords preserved, duplicates skipped) — **not auto-saved**
- User reviews the new tags and saves with the existing Save button
- On error: inline error message below the button (e.g. "Ollama isn't running — check Settings")
- Button disabled while saving or while another generation is in progress

---

## Person summary UX

Location: `PersonDetail.tsx`.

**Generating:**
- "Generate summary" button in the header action row (alongside "Show in family tree", "Research profile")
- On click: assemble `SummaryInput` from person + photos + documents + family chart data → call `provider.generatePersonSummary(...)` → button shows spinner
- Result appears in a modal with:
  - Editable `<textarea>` pre-filled with the generated text
  - **Save** button → writes to `people.json` via `writePeopleJson`, dispatches `UPDATE_PERSON_SUMMARY`
  - **Discard** button → closes modal, nothing saved

**Displaying:**
- If `person.summary` exists, render a "Summary" section at the top of `PersonDetail` (above Family Tree), styled as readable prose
- "Regenerate" button in the section header reopens the generation flow; saving overwrites the existing summary

---

## Error handling summary

| Scenario | Behaviour |
|---|---|
| Ollama not running | "Test" shows red error; generate button shows inline error |
| Model not installed | Inline error with link to Settings to download |
| Vision model used for text task | Allowed — Ollama handles gracefully |
| Text model used for keywords | `VISION_REQUIRED` error inline: "This model can't process images — choose a vision model in Settings" |
| Offline during generation | Ollama inference still works; error only if model not yet downloaded |
| Offline during model download | Network error inline in Settings |

---

## Files touched

| File | Change |
|---|---|
| `src/utils/ai/types.ts` | **New** — AIProvider interface, AIModel, input/output types |
| `src/utils/ai/ollama.ts` | **New** — OllamaProvider implementation + model management |
| `src/utils/ai/registry.ts` | **New** — provider map + getProvider factory |
| `src/utils/ai/index.ts` | **New** — re-exports |
| `src/context/types.ts` | Add `summary?` to Person, AI fields to AppSettings, `UPDATE_PERSON_SUMMARY` action |
| `src/context/AppContext.tsx` | Handle `UPDATE_PERSON_SUMMARY` in reducer |
| `src/Settings/index.tsx` | Add AI Integration section |
| `src/Photos/MetadataFields.tsx` | Add "Generate with AI" button below keywords |
| `src/People/PersonDetail.tsx` | Add summary section + "Generate summary" button + modal |

---

## Out of scope

- Claude provider implementation (UI shows "coming soon")
- Bulk/background keyword generation
- Metadata-derived keywords (album name, date, location → tags)
- Custom prompt editing
- Per-photo summary generation
