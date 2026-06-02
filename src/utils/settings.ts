import { AppSettings } from '../context/types';
import { dataPath } from './paths';

export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED !== 'false';

const fs   = (window as any).require('fs')   as typeof import('fs');
const path = (window as any).require('path') as typeof import('path');

const SETTINGS_PATH = path.join(dataPath, 'settings.json');

export async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.promises.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writeSettings(settings: AppSettings): Promise<void> {
  await fs.promises.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}
