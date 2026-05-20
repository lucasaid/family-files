// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// window.require is not available in jsdom — mock it globally so modules that
// call it at load time (e.g. src/utils/exiftool.ts) don't throw.
(window as any).require = (mod: string) => {
  if (mod === 'path') return { join: (...args: string[]) => args.join('/') };
  if (mod === 'child_process') return { execFile: jest.fn() };
  return {
    promises: {
      readFile: jest.fn().mockRejectedValue(new Error('not found')),
      readdir: jest.fn().mockResolvedValue([]),
    },
  };
};
