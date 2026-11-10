// Bundles the engine and all its data into one dependency-free file for the installable skill:
// skills/find-color/scripts/find-color.mjs. Each source module is wrapped in its own scope;
// the data module is replaced by the embedded data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { data, DATA_FILES } from './lib/data.mjs';

const TOOLS = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(TOOLS, '..');
const OUT = path.join(REPO, 'skills/find-color/scripts/find-color.mjs');
const MODULES = [
  ['color', 'lib/color.mjs'],
  ['data', null],
  ['classify', 'classify.mjs'],
  ['diversity', 'lib/diversity.mjs'],
  ['query', 'query.mjs'],
  ['apply', 'apply.mjs'],
  ['cli', 'cli.mjs'],
];

function wrap(name, file) {
  let src = fs.readFileSync(path.join(TOOLS, file), 'utf8');
  const isMain = name === 'cli';
  // CLI blocks: dropped from library modules, kept as the entry point for cli.mjs.
  src = src.replace(/\/\/ cli-start\n([\s\S]*?)\/\/ cli-end\n?/g, (_, block) => {
    if (!isMain) return '';
    return block.replace(/^import .*\n/m, '').replace(/if \(process\.argv\[1\] === fileURLToPath\(import\.meta\.url\)\) \{/, '{');
  });
  src = src.replace(/^import .* from 'node:[^']+';\n/gm, '');
  src = src.replace(/^import \{([^}]+)\} from '\.\/(?:lib\/)?([a-z]+)\.mjs';$/gm, (_, names, mod) => `const {${names}} = __m.${mod};`);
  if (/^import /m.test(src)) throw new Error(`${file}: unhandled import`);
  const exported = [];
  src = src.replace(/^export (async function|function|const) ([A-Za-z0-9_]+)/gm, (_, kind, id) => { exported.push(id); return `${kind} ${id}`; });
  if (/^export /m.test(src)) throw new Error(`${file}: unhandled export`);
  return isMain ? `// ---- ${file}\n${src}` : `// ---- ${file}\n__m.${name} = (() => {\n${src}\nreturn { ${exported.join(', ')} };\n})();\n`;
}

const embedded = Object.fromEntries(Object.keys(DATA_FILES).map((k) => [k, data(k)]));
const json = JSON.stringify(embedded);
const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 12);
const dataModule = `// ---- embedded data (${Object.values(DATA_FILES).join(', ')})\n__m.data = (() => {\nconst __DATA = ${json};\nfunction data(key) { if (!(key in __DATA)) throw new Error('Unknown data key ' + key); return __DATA[key]; }\nreturn { data };\n})();\n`;

const parts = MODULES.map(([name, file]) => (file ? wrap(name, file) : dataModule));
const out = `#!/usr/bin/env node
// no-slop-color find-color engine, bundled by tools/bundle.mjs. Do not edit: edit the repo and rebuild.
// Library: ${embedded.library.count} directions. Data hash: ${hash}. Source: https://github.com/victornasar/no-slop-color
const __m = {};
${parts.join('\n')}`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
fs.chmodSync(OUT, 0o755);
console.log(`bundled ${path.relative(REPO, OUT)} (${Math.round(out.length / 1024)} KB, data ${hash})`);
