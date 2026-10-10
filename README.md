# Family Files

A private desktop archive for browsing and organizing a family's photos, documents, and genealogy. Built with Electron, React, TypeScript, and Vite.

Family Files is designed to be self-contained on a local disk or external drive — your photos, documents, and metadata live alongside the app, never in the cloud. Optional AI features run entirely locally via [Ollama](https://ollama.com).

## Features

- **Photos** — browse a photo library with a carousel and grid view, view and edit EXIF/XMP metadata (date, caption, location, rating, keywords), and write changes back to the original files via `exiftool`.
- **Face tagging** — draw bounding boxes on photos and assign people from the roster; face regions are stored in the image using the XMP `mwg-rs:Regions` standard.
- **Albums** — organize photos into albums (subfolders of `images/`).
- **Documents** — attach and view family documents (PDFs, scans) with their own metadata and people associations.
- **People** — a global roster persisted to `people.json`, with per-person photo galleries, document lists, and data export. People referenced in photo face tags are added to the roster automatically on load.
- **Family tree** — render a family tree from a GEDCOM (`family-tree.ged`) file using `family-chart`. The tab only appears when a GEDCOM file is present.
- **Research profiles** — per-person research pages.
- **Maps** — GPS-tagged photos and people can be shown on a Leaflet map.
- **Local AI (optional)** — generate photo keywords (vision models) and person summaries using a local Ollama server. No data leaves your machine.
- **Light / dark theme** and an in-app settings panel.

## Requirements

- **Node.js 18+**
- **[pnpm](https://pnpm.io)** (this repo uses a `pnpm-lock.yaml`)
- **[exiftool](https://exiftool.org)** installed and on your `PATH` — required for reading and writing photo metadata
  - macOS: `brew install exiftool`
  - Linux: `sudo apt install libimage-exiftool-perl`
  - Windows: download from exiftool.org and add to `PATH`
- **[Ollama](https://ollama.com)** — optional, only needed for the local AI features

Install dependencies once:

```bash
pnpm install
```

## Development

The app runs as two processes: the Vite dev server (React app on `localhost:3000`) and Electron, which loads it. Run both simultaneously:

```bash
# Terminal 1 — Vite dev server (must be up first)
pnpm start

# Terminal 2 — Electron
pnpm electron-dev
```

Vite is pinned to port 3000 (`strictPort`) because the Electron main process hardcodes `localhost:3000` in development.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm start` | Start the Vite dev server on `localhost:3000`. |
| `pnpm electron-dev` | Launch Electron against the dev server. |
| `pnpm build` | Type-check (`tsc`) and build the React app to `build/`. |
| `pnpm preview` | Preview the production build. |
| `pnpm test` | Run the test suite in watch mode (Vitest). |
| `pnpm test:run` | Run the test suite once. |
| `pnpm dist` | Build the React app and package a macOS `.app` with electron-builder. |

## Building the macOS app

```bash
pnpm dist
```

This runs `vite build` to compile the React app, then `electron-builder --mac` to package it. The output lands in `dist/Family Files.app`.

### Portable layout (local disk or external drive)

The app finds its data **next to** the `.app`, not inside it. Copy `Family Files.app` from `dist/` into a folder alongside your data:

```
/Volumes/MyDrive/FamilyFiles/
  Family Files.app       ← the app itself
  images/                ← photo library (subfolders = albums)
  documents/             ← attached documents
  research/              ← research profile JSON files
  people.json            ← people roster
  documents.json         ← document metadata
  categories.json        ← document categories
  settings.json          ← app settings
  family-tree.ged        ← GEDCOM family tree (optional)
```

The app resolves all data paths relative to its own location (the folder containing the `.app`). To move everything to another machine or drive, copy the whole folder. In development, this same data lives in the project root.

All of these data files are git-ignored — they are personal archive content, not source.

## AI features (optional)

AI runs locally through Ollama and is configured in the in-app **Settings** panel:

1. Install and start [Ollama](https://ollama.com).
2. Open **Settings → AI**, select the **Ollama (local)** provider, and confirm the server URL (default `http://localhost:11434`).
3. Download a model from within Settings, or pull one yourself. Recommended models:
   - **Vision** (for photo keywords): `moondream`, `llava:7b`, `llava:13b`
   - **Text** (for person summaries): `llama3.2:3b`, `llama3.2:1b`
4. Choose a keywords model (must be a vision model) and a summary model.

Inference works fully offline; only downloading new models needs an internet connection.

AI features can be disabled at build/run time with an environment variable (see `example.env`):

```
VITE_AI_ENABLED=false
```

## Architecture

- **`public/main.js`** — Electron main process. Creates the `BrowserWindow`, disables hardware acceleration (avoids GPU crashes on recent macOS), and resolves the data path: the project root in development, or the folder containing `Family Files.app` when packaged. Exposes `get-data-path` and a file-open dialog over IPC. Loads `localhost:3000` in dev and the built `index.html` in production.
- **`src/App.tsx`** — Root component. Uses `HashRouter` (required for Electron's `file://` routing) with routes for Home, Photos, Albums, Documents, People, Family Tree, and research Profiles. On launch it runs `syncAndLoad`, which reads the GEDCOM, people, documents, and images, reconciles face tags against the roster, and populates app context.
- **`src/utils/paths.ts`** — Resolves the single `dataPath` via IPC; all file utilities import from here rather than using `process.cwd()`.
- **`src/utils/exiftool.ts`** — Reads and writes photo metadata by shelling out to `exiftool` through Electron's `child_process`. Augments `PATH` with Homebrew bin directories so the packaged app can find the binary.
- **`src/utils/sync.ts`, `gedcom.ts`, `people.ts`, `documents.ts`, `albums.ts`, `thumbnails.ts`** — Data loading, GEDCOM-to-tree conversion, and JSON persistence.
- **`src/utils/ai/`** — Pluggable AI provider layer with an Ollama implementation (vision keywords, person summaries, model management).
