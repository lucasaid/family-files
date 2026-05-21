// src/utils/documents.ts
import { FamilyDocument } from '../context/types';

const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const DOCS_PATH = path.join(process.cwd(), 'documents.json');
const DOCS_DIR = path.join(process.cwd(), 'documents');

export async function readDocumentsJson(): Promise<FamilyDocument[]> {
  try {
    const raw = await fs.promises.readFile(DOCS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function writeDocumentsJson(documents: FamilyDocument[]): Promise<void> {
  await fs.promises.writeFile(DOCS_PATH, JSON.stringify(documents, null, 2), 'utf-8');
}

export async function copyToDocumentsDir(sourcePath: string): Promise<string> {
  await fs.promises.mkdir(DOCS_DIR, { recursive: true });
  const filename = path.basename(sourcePath);
  const dest = path.join(DOCS_DIR, filename);
  await fs.promises.copyFile(sourcePath, dest);
  return filename; // relative path stored in FamilyDocument.filePath
}
