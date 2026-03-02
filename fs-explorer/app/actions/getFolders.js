'use server';

import { promises as fs } from 'fs';

export async function getFolders(dirPath = '/') {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (err) {
    console.error('getFolders error:', err);
    return [];
  }
}
