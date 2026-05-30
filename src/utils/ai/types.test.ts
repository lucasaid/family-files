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
