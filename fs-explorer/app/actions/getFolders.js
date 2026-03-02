'use server';

import { promises as fs } from 'fs';

export async function getFolders() {
  try {
    const entries = await fs.readdir('/', { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
