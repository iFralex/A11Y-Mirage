'use server';

import fs from 'fs';
import path from 'path';

export async function getFolders(dirPath = '/') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}
