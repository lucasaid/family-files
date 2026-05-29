/// <reference types="vitest" />
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Required for Electron: production build uses file:// protocol,
  // so all asset paths must be relative, not absolute.
  base: './',

  build: {
    // Match CRA's output dir so public/main.js needs no changes.
    outDir: 'build',
    emptyOutDir: true,
  },

  server: {
    // Electron main.js dev path hardcodes port 3000.
    port: 3000,
    strictPort: true,
  },

  optimizeDeps: {
    // Electron is a native module — never bundle it.
    exclude: ['electron'],
  },

  test: {
    globals: true,           // exposes vi, test, expect etc. without imports
    environment: 'jsdom',    // simulates browser DOM, same as CRA's Jest setup
    setupFiles: './src/setupTests.ts',
  },
});
