# TODO

## Features

### 1. Photo browsing
- [x] Make image directory configurable (currently hardcoded to `public/images/`)
- [x] Add grid/thumbnail view as an alternative to the carousel
- [x] Show filename / basic info in carousel caption (replace placeholder text)

### 2. Metadata display
Show the following EXIF fields in the side panel when viewing a photo:
- [x] Date taken (`DateTimeOriginal`)
- [ ] Location — GPS coordinates, reverse-geocoded to a human-readable place name
- [x] Camera / device (`Make`, `Model`)
- [x] Caption / description (`ImageDescription` or XMP `dc:description`)

### 3. Metadata editing
- [x] Editable fields in the side panel: date, caption, location
- [x] Write changes back to the image file (EXIF/XMP)
  - Investigate: `exiftool` via Electron's `child_process` (most reliable, handles XMP too), or a pure-JS option like `piexifjs`
- [ ] Confirmation before overwriting (warn that originals will be modified)

### 4. People tagging
- [x] Draw a bounding box on the photo to mark a face region
- [x] Assign a person from the global people roster to each bounding box
- [x] Display bounding boxes + name labels when viewing a photo
- [x] Store face regions in the image file using XMP face region metadata (`mwg-rs:Regions`)
- [x] Edit / remove existing face tags

### 5. People roster
- [x] Global list of people stored in a local `people.json` (next to the app, not inside images)
- [x] Dedicated screen or settings panel to add, rename, and remove people
- [x] Autocomplete / dropdown when assigning a person during face tagging
- [x] Show all photos a person appears in (filtered gallery view)

## Technical decisions made
- Metadata writes back to image files (EXIF/XMP) — originals will be modified
- Face tagging uses bounding boxes (XMP `mwg-rs:Regions` standard)
- People roster is a global in-app list, persisted to `people.json`



# BUGS
- albums
- light/dark theme switcher
- A11y