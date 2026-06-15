# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop app ("Family Files") — a private, offline family archive for photos, documents, and genealogy. Built with Vite; the React app runs on `localhost:3000` in development and Electron loads it via `win.loadURL('http://localhost:3000')`. When packaged, Electron loads the built `build/index.html` over `file://`. Optional AI features run locally via Ollama.

The package manager is **pnpm** (`pnpm-lock.yaml` is the only committed lockfile).

## Development

**Always run both processes simultaneously:**

```bash
# Terminal 1 — Vite dev server (must be up first)
pnpm start

# Terminal 2 — Electron
pnpm electron-dev
```

Vite is pinned to port 3000 (`strictPort` in `vite.config.ts`) because `public/main.js` hardcodes `localhost:3000` in dev.

Other commands:
```bash
pnpm test          # Vitest, watch mode
pnpm test:run      # Vitest, run once
pnpm build         # tsc + vite build → build/
pnpm dist          # vite build + electron-builder --mac → dist/Family Files.app
```

## Architecture

- `public/main.js` — Electron main process. Opens a `BrowserWindow` (node integration on, `contextIsolation: false`, `webSecurity: false`), disables hardware acceleration, and resolves `global.dataPath` (project root in dev; the folder containing `Family Files.app` when packaged). Exposes `get-data-path` and `show-open-dialog` over IPC. Loads `localhost:3000` in dev, `build/index.html` when packaged.
- `src/App.tsx` — Root component. `HashRouter` (required for Electron `file://` routing) with routes for `/` (Home), `/photos`, `/albums`, `/documents`, `/people`, `/tree` (only shown when a GEDCOM is loaded), and `/profile/:personId`. Wrapped in `ThemeProvider` + `AppProvider`. On launch it runs `syncAndLoad` and populates app context.
- `src/utils/paths.ts` — Resolves the single `dataPath` via the `get-data-path` IPC call. **All file utilities import `dataPath` from here** instead of using `process.cwd()`.
- `src/utils/sync.ts` — `syncAndLoad`: reads `family-tree.ged`, `people.json`, `documents.json`/`categories.json`, scans `images/` (root + album subfolders), reconciles photo face tags against the people roster (auto-adding new names), and returns everything for the initial dispatch.
- `src/utils/exiftool.ts` — Reads/writes photo EXIF/XMP metadata by shelling out to `exiftool` via Electron's `child_process`. Augments `PATH` with Homebrew bin dirs so the packaged app finds the binary.
- `src/utils/ai/` — Pluggable AI provider layer (`registry.ts`, `types.ts`) with an Ollama implementation (`ollama.ts`): vision keywords, person summaries, and model management. Gated by `AI_ENABLED` (`VITE_AI_ENABLED !== 'false'`).
- `src/context/` — `AppContext` (reducer-based app state), `ThemeContext` (light/dark), and shared `types.ts`.
- Feature dirs: `src/Photos/`, `src/Albums/`, `src/Documents/`, `src/People/`, `src/FamilyTree/`, `src/ResearchProfiles/`, `src/Settings/`.

## Key constraints

- **`window.require` instead of `import` for Node modules**: Because `contextIsolation: false` and `nodeIntegration: true`, Node built-ins (`fs`, `path`, `child_process`, `electron`) are accessed via `window.require('...')`, not ES module imports.
- **Data lives next to the app, not in the repo**: photos, documents, and JSON state are resolved relative to `dataPath` (project root in dev; the `.app`'s parent folder when packaged) — never `process.cwd()`. Data files (`images/`, `documents/`, `research/`, `people.json`, `documents.json`, `categories.json`, `settings.json`, `family-tree.ged`) are git-ignored.
- **`exiftool` must be on `PATH`**: metadata reads and writes depend on it.
- **HashRouter is required**: the packaged app loads over `file://`; `BrowserRouter`'s HTML5 history routing would break navigation.
