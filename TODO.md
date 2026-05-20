# TODO

## Features

### 1. Photo browsing
- [ ] Make image directory configurable (currently hardcoded to `public/images/`)
- [ ] Add grid/thumbnail view as an alternative to the carousel
- [ ] Show filename / basic info in carousel caption (replace placeholder text)

### 2. Metadata display
Show the following EXIF fields in the side panel when viewing a photo:
- [ ] Date taken (`DateTimeOriginal`)
- [ ] Location — GPS coordinates, reverse-geocoded to a human-readable place name
- [ ] Camera / device (`Make`, `Model`)
- [ ] Caption / description (`ImageDescription` or XMP `dc:description`)

### 3. Metadata editing
- [ ] Editable fields in the side panel: date, caption, location
- [ ] Write changes back to the image file (EXIF/XMP)
  - Investigate: `exiftool` via Electron's `child_process` (most reliable, handles XMP too), or a pure-JS option like `piexifjs`
- [ ] Confirmation before overwriting (warn that originals will be modified)

### 4. People tagging
- [ ] Draw a bounding box on the photo to mark a face region
- [ ] Assign a person from the global people roster to each bounding box
- [ ] Display bounding boxes + name labels when viewing a photo
- [ ] Store face regions in the image file using XMP face region metadata (`mwg-rs:Regions`)
- [ ] Edit / remove existing face tags

### 5. People roster
- [ ] Global list of people stored in a local `people.json` (next to the app, not inside images)
- [ ] Dedicated screen or settings panel to add, rename, and remove people
- [ ] Autocomplete / dropdown when assigning a person during face tagging
- [ ] Show all photos a person appears in (filtered gallery view)

## Technical decisions made
- Metadata writes back to image files (EXIF/XMP) — originals will be modified
- Face tagging uses bounding boxes (XMP `mwg-rs:Regions` standard)
- People roster is a global in-app list, persisted to `people.json`
