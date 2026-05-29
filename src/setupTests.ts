/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// window.require is not available in jsdom — mock it globally so modules that
// call it at load time (e.g. src/utils/exiftool.ts) don't throw.
(window as any).require = (mod: string) => {
  if (mod === 'path') return { join: (...args: string[]) => args.join('/') };
  if (mod === 'child_process') return { execFile: vi.fn() };
  if (mod === 'electron') return { ipcRenderer: { sendSync: vi.fn().mockReturnValue('/tmp') } };
  return {
    promises: {
      readFile: vi.fn().mockRejectedValue(new Error('not found')),
      readdir: vi.fn().mockResolvedValue([]),
    },
  };
};
