// Loads the repo's data files once. The bundled skill script replaces this module with embedded data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILES = {
  primary: 'classifications/primary.json',
  secondary: 'classifications/secondary.json',
  domains: 'contexts/domains.json',
  conventions: 'contexts/conventions.json',
  library: 'library/directions.json',
};
const cache = {};

export function data(key) {
  if (!(key in FILES)) throw new Error(`Unknown data key ${key}`);
  return (cache[key] ??= JSON.parse(fs.readFileSync(path.join(REPO, FILES[key]), 'utf8')));
}

export const DATA_FILES = FILES;
