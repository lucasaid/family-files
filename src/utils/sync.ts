// src/utils/sync.ts
import { Photo, Person, FamilyDocument } from '../context/types';
import { readMetadata } from './exiftool';
import { readPeopleJson, writePeopleJson } from './people';
import { readDocumentsJson } from './documents';
import { listAlbums } from './albums';
import { checkThumbnailOnDisk } from './thumbnails';

const path = (window as any).require('path') as typeof import('path');
const fs = (window as any).require('fs') as typeof import('fs');

const IMAGES_DIR = path.join(process.cwd(), 'images');

export interface SyncResult {
  photos: Photo[];
  albums: string[];
  people: Person[];
  documents: FamilyDocument[];
  addedPeople: string[];   // names newly created in people.json
}

export type SyncStatus =
  | 'reading-people'
  | 'reading-documents'
  | 'scanning-images'
  | 'syncing-people'
  | 'done';

export async function syncAndLoad(
  onStatus: (status: SyncStatus, detail?: string) => void
): Promise<SyncResult> {
  onStatus('reading-people');
  const people = await readPeopleJson();

  onStatus('reading-documents');
  const documents = await readDocumentsJson();

  // Check images dir exists before scanning
  onStatus('scanning-images');
  let photos: Photo[] = [];
  let albums: string[] = [];
  try {
    await fs.promises.access(IMAGES_DIR);
    albums = await listAlbums();
    const rootPhotos = (await readMetadata(IMAGES_DIR, people)).map(p => ({ ...p, album: null as null }));
    const albumPhotoArrays = await Promise.all(
      albums.map(async albumName => {
        try {
          const ap = await readMetadata(path.join(IMAGES_DIR, albumName), people);
          return ap.map(p => ({ ...p, album: albumName }));
        } catch {
          return [] as Photo[];
        }
      })
    );
    photos = [...rootPhotos, ...albumPhotoArrays.flat()];
  } catch {
    // No images dir yet — start with empty
  }

  onStatus('syncing-people');

  // Collect all names referenced in image face tags
  const namesInImages = new Set<string>();
  for (const photo of photos) {
    for (const face of photo.faces) {
      if (face.name) namesInImages.add(face.name);
    }
  }

  // Collect all person IDs referenced in documents
  const idsInDocs = new Set<string>();
  for (const doc of documents) {
    for (const id of doc.personIds) idsInDocs.add(id);
  }

  const existingNames = new Set(people.map(p => p.name.toLowerCase()));
  const existingIds = new Set(people.map(p => p.id));

  // Add people found in images that aren't in people.json
  const addedPeople: string[] = [];
  const updatedPeople = [...people];

  for (const name of Array.from(namesInImages)) {
    if (!existingNames.has(name.toLowerCase())) {
      const newPerson: Person = { id: crypto.randomUUID(), name };
      updatedPeople.push(newPerson);
      existingIds.add(newPerson.id);
      addedPeople.push(name);
    }
  }

  if (addedPeople.length > 0) {
    await writePeopleJson(updatedPeople);
  }

  // Re-resolve face personIds now that people list is complete
  const finalPeople = updatedPeople;
  const nameToId = new Map(finalPeople.map(p => [p.name.toLowerCase(), p.id]));
  const resolvedPhotos = photos.map(photo => ({
    ...photo,
    thumbnailPath: checkThumbnailOnDisk(photo.fsPath),
    faces: photo.faces.map(face => ({
      ...face,
      personId: nameToId.get(face.name.toLowerCase()) ?? null,
    })),
  }));

  onStatus('done');

  return { photos: resolvedPhotos, albums, people: finalPeople, documents, addedPeople };
}
