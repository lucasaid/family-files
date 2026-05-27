# Family Files

An Electron + React + TypeScript desktop app for browsing family photos and a family tree.

## Setup

**Requirements:**
- Node.js 18+
- [exiftool](https://exiftool.org) installed and on your PATH
  - macOS: `brew install exiftool`
  - Linux: `sudo apt install libimage-exiftool-perl`
  - Windows: download from exiftool.org and add to PATH

**Run in development:**

```bash
# Terminal 1 — React dev server
yarn start

# Terminal 2 — Electron (after React server is up)
yarn electron-dev
```

Photos are read from `public/images/`. Documents are stored in `public/documents/`.
People and document metadata are saved to `people.json` and `documents.json` in the project root.

## Building the .app (macOS)

First, install dependencies (only needed once):

```bash
yarn install
```

Then build and package:

```bash
yarn dist
```

This runs `react-scripts build` to compile the React app, then `electron-builder` to package it as a macOS `.app`. The output lands in `dist/Family Files.app`.

### Portable layout (external hard drive)

The app is designed to be self-contained on an external drive. The data files live **next to** the `.app`, not inside it:

```
/Volumes/MyDrive/FamilyFiles/
  Family Files.app       ← the app itself
  images/                ← photo albums (subfolders = albums)
  documents/             ← attached documents
  research/              ← research profile JSON files
  people.json
  documents.json
  categories.json
  settings.json
  family-tree.ged
```

Copy `Family Files.app` from `dist/` into this folder alongside your data. The app will automatically find all files relative to its own location. To move everything to a different machine or drive, just copy the whole folder.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
