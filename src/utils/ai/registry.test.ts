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
