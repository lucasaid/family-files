// src/utils/people.ts
import { Person } from '../context/types';

const fs = (window as any).require('fs') as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const PEOPLE_PATH = path.join(process.cwd(), 'people.json');

export async function readPeopleJson(): Promise<Person[]> {
  try {
    const raw = await fs.promises.readFile(PEOPLE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function writePeopleJson(people: Person[]): Promise<void> {
  await fs.promises.writeFile(PEOPLE_PATH, JSON.stringify(people, null, 2), 'utf-8');
}
