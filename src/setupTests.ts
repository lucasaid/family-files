/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// window.require is not available in jsdom — mock it globally so modules that
// call it at load time (e.g. src/utils/exiftool.ts) don't throw.
(window as any).require = (mod: string) => {
  if (mod === 'path') return {
    join: (...args: string[]) => args.join('/'),
    dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
    basename: (p: string, ext?: string) => {
      const base = p.split('/').pop() ?? '';
      return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
    },
    extname: (p: string) => { const m = (p.split('/').pop() ?? '').match(/\.[^.]+$/); return m ? m[0] : ''; },
  };
  if (mod === 'crypto') {
    const h = (data: string) => {
      let n = 5381;
      for (let i = 0; i < data.length; i++) n = Math.imul(33, n) ^ data.charCodeAt(i);
      return (n >>> 0).toString(16).padStart(8, '0').repeat(4);
    };
    return {
      createHash: (_: string) => {
        let buf = '';
        const obj = { update: (s: string) => { buf += s; return obj; }, digest: (_e: string) => h(buf) };
        return obj;
      }
    };
  }
  if (mod === 'child_process') return { execFile: vi.fn() };
  if (mod === 'electron') return { ipcRenderer: { sendSync: vi.fn().mockReturnValue('/tmp') } };
  return {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    promises: {
      readFile: vi.fn().mockRejectedValue(new Error('not found')),
      readdir: vi.fn().mockResolvedValue([]),
    },
  };
};
