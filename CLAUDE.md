# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop app ("Family Files") for browsing family photos and a family tree. The React app runs on `localhost:3000` and Electron loads it via `win.loadURL('http://localhost:3000')`.

## Development

**Always run both processes simultaneously:**

```bash
# Terminal 1 — React dev server
yarn start

# Terminal 2 — Electron (after React server is up)
yarn electron-dev
```

Other commands:
```bash
yarn test          # Run tests (watch mode)
yarn test --watchAll=false  # Run tests once
yarn build         # Production build
```

## Architecture

- `public/main.js` — Electron main process. Opens a `BrowserWindow` pointing at `localhost:3000`. Node integration is enabled with `contextIsolation: false`, which allows renderer code to use Node APIs directly via `window.require(...)`.
- `src/App.tsx` — Root component. Uses `HashRouter` (required for Electron file:// routing), Bootstrap navbar, and React Router routes for `/`, `/photos`, and `/tree`.
- `src/Photos/index.tsx` — Photos route. Uses `window.require('fs')` (Node.js fs via Electron) to read `public/images/` at runtime, parses EXIF data with `exifreader`, and displays images in a `react-slick` carousel with an Offcanvas panel for EXIF metadata.

## Key constraints

- **`window.require` instead of `import` for Node modules**: Because `contextIsolation: false` and `nodeIntegration: true`, Node built-ins (like `fs`) must be accessed via `window.require('fs')`, not ES module imports.
- **Images go in `public/images/`**: The Photos component reads from `${process.cwd()}/public/images/` using the Node `fs` API — this path is relative to where Electron is launched.
- **HashRouter is required**: Electron loads the app via URL; `BrowserRouter` would break navigation since there's no server handling HTML5 history routes.
