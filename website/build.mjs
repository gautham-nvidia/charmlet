import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { parseCharmPack } = require('../extension/out/charm-packs.js');
const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const dist = join(root, 'dist');
const builtins = JSON.parse(await readFile(join(repo, 'extension', 'src', 'builtin-charms.json'), 'utf8'));
const extras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
if (builtins.length !== 10 || extras.length !== 6) throw new Error('Expected ten included and six extra charms.');
const ids = new Set([...builtins, ...extras].map(item => item.id));
if (ids.size !== 16) throw new Error('Charm IDs must be unique across the gallery.');
const validated = [];
for (const extra of extras) {
  const packPath = join(root, 'packs', `${extra.id}.charmlet.json`);
  const pack = parseCharmPack(await readFile(packPath));
  const charm = pack.charms[0];
  if (pack.id !== extra.id || pack.name !== extra.name || pack.charms.length !== 1
    || charm.id !== extra.id || charm.name !== extra.name || charm.group !== extra.group
    || charm.description !== extra.description || charm.accent !== extra.accent.toLowerCase()) {
    throw new Error(`Pack metadata does not match extras.json for ${extra.id}.`);
  }
  validated.push({ extra, packPath });
}
await rm(dist, { recursive: true, force: true });
for (const path of ['assets/default', 'assets/extras', 'packs', 'downloads']) {
  await mkdir(join(dist, path), { recursive: true });
}
for (const name of ['index.html', 'styles.css', 'app.js']) await copyFile(join(root, name), join(dist, name));
for (const builtin of builtins) {
  await copyFile(join(repo, 'extension', 'media', builtin.file), join(dist, 'assets', 'default', builtin.file));
}
for (const { extra, packPath } of validated) {
  await copyFile(join(root, 'assets', extra.file), join(dist, 'assets', 'extras', extra.file));
  await copyFile(packPath, join(dist, 'packs', `${extra.id}.charmlet.json`));
}
const vsix = `charmlet-${manifest.version}.vsix`;
await copyFile(join(repo, 'extension', vsix), join(dist, 'downloads', 'charmlet.vsix'));
const charms = [
  ...builtins.map(item => ({ ...item, kind: 'included', preview: `./assets/default/${item.file}` })),
  ...extras.map(item => ({ ...item, kind: 'extra', preview: `./assets/extras/${item.file}`, download: `./packs/${item.id}.charmlet.json` })),
];
await writeFile(join(dist, 'catalogue.json'), `${JSON.stringify({ version: manifest.version, extensionDownload: './downloads/charmlet.vsix', charms }, null, 2)}\n`, 'utf8');
console.log(`Built Charmlet gallery ${manifest.version}: ${builtins.length} included, ${extras.length} extras.`);
