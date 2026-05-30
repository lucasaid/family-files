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
