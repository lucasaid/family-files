const http = (window as any).require('http') as typeof import('http');

import { AIProvider, AIModel, AIError, KeywordsInput, SummaryInput } from './types';

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
  // Strip a leading "Keywords:" label the model may echo back
  const cleaned = response.replace(/^keywords?:?\s*/i, '');
  return cleaned
    .split(/[,\n;]/)
    .map(k =>
      k.trim().toLowerCase()
        .replace(/^["']|["']$/g, '')     // strip surrounding quotes
        .replace(/^\d+[.)]\s*/, '')      // strip "1. " / "1) " list numbering
        .replace(/^[•\-*]\s*/, '')       // strip bullet points
        .replace(/[\[\]×(){}]/g, '')     // strip brackets and × symbols
        .trim()
    )
    .filter(k =>
      k.length > 1 &&
      k.length <= 60 &&
      !existingSet.has(k) &&
      !/^\d+$/.test(k) &&              // reject pure numbers ("0.39", "42")
      !/^\d+[×x]\d*$/.test(k)          // reject bare scale tokens ("2×", "0.5x")
    );
}

// ── Curated download list ─────────────────────────────────────────────────────

export const RECOMMENDED_MODELS: AIModel[] = [
  { id: 'moondream', name: 'Moondream', sizeGb: 1.7, supportsVision: true },
  { id: 'llava:7b', name: 'LLaVA 7B', sizeGb: 4.5, supportsVision: true },
  { id: 'llava:13b', name: 'LLaVA 13B', sizeGb: 8.0, supportsVision: true },
  { id: 'llama3.2:3b', name: 'Llama 3.2 3B', sizeGb: 2.0, supportsVision: false },
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B', sizeGb: 1.3, supportsVision: false },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────

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
      if (!supportsVision(modelId)) {
        throw new AIError('VISION_REQUIRED', 'This model does not support images — choose a vision model in Settings');
      }
      const existing = input.existingKeywords.join(', ');
      const prompt = `Describe this photo using up to 10 keywords. Reply with ONLY a comma-separated list of plain English words or short phrases — nothing else. No numbers, no coordinates, no explanations, no bullet points. Example format: family, outdoor, summer, children, smiling, garden${existing ? `\n\nDo not include these already-present keywords: ${existing}` : ''}\n\nKeywords:`;
      try {
        const raw = await httpPost(new URL('/api/generate', baseUrl), {
          model: modelId, prompt, images: [input.imageBase64], stream: false,
        });
        const data = JSON.parse(raw);
        console.log('[AI keywords] raw response:', JSON.stringify(data.response));
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
        born: input.birthYear
          ? `${input.birthYear}${input.birthPlace ? ' in ' + input.birthPlace : ''}`
          : undefined,
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

// ── Ollama-specific operations ────────────────────────────────────────────────

export async function pullModel(
  baseUrl: string,
  modelId: string,
  onProgress: (pct: number) => void
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
