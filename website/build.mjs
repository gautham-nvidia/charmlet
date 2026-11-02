import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../extension/node_modules/esbuild/lib/main.js';
import { validateDistribution } from './distribution.mjs';

const require = createRequire(import.meta.url);
const { parseCharmPack } = require('../extension/out/charm-packs.js');
const { FLOWERS } = require('../extension/out/garden-core.js');
const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const dist = join(root, 'dist');
const builtins = JSON.parse(await readFile(join(repo, 'extension', 'src', 'builtin-charms.json'), 'utf8'));
const extras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
const collectionConfig = JSON.parse(await readFile(join(root, 'collections.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
const distribution = validateDistribution(JSON.parse(await readFile(join(root, 'distribution.json'), 'utf8')), manifest);
if (builtins.length !== 10 || extras.length !== 60) throw new Error('Expected ten included and sixty extra charms.');
const ids = new Set([...builtins, ...extras].map(item => item.id));
if (ids.size !== 70) throw new Error('Charm IDs must be unique across the gallery.');
const expectedCollections = { 'Compute & Silicon': 18, 'Test Bench': 12, 'AI & Code': 14, 'Places & Nature': 16 };
for (const [name, count] of Object.entries(expectedCollections)) {
  if (extras.filter(item => item.collection === name).length !== count) throw new Error(`Unexpected collection size: ${name}`);
}
if (extras.some(item => !Object.hasOwn(expectedCollections, item.collection))) throw new Error('Unknown collection.');
const expectedWorlds = { ai: 7, coding: 7, silicon: 18, testing: 12, animals: 0, trees: 2, space: 1, parks: 6, cities: 5, culture: 0, sports: 0, luck: 2 };
const worlds = collectionConfig.collections;
const previews = collectionConfig.previews;
if (!Array.isArray(worlds) || worlds.length !== 12 || !Array.isArray(previews) || previews.length !== 4) throw new Error('Expected twelve collection worlds and four art previews.');
const worldIds = new Set();
const worldByCharm = new Map();
const extraIds = new Set(extras.map(item => item.id));
for (const world of worlds) {
  if (!Object.hasOwn(expectedWorlds, world.id) || worldIds.has(world.id) || !Array.isArray(world.charmIds)
    || world.charmIds.length !== expectedWorlds[world.id] || typeof world.name !== 'string'
    || !/^#[0-9a-f]{6}$/i.test(world.accent)) throw new Error('Invalid collection world.');
  worldIds.add(world.id);
  for (const id of world.charmIds) {
    if (!extraIds.has(id) || worldByCharm.has(id)) throw new Error(`Missing or repeated collection charm: ${id}`);
    worldByCharm.set(id, world);
  }
}
if (worldByCharm.size !== extras.length) throw new Error('Every classic download must have exactly one collection world.');
const previewIds = new Set();
for (const preview of previews) {
  if (!/^[a-z][a-z0-9-]*$/.test(preview.id) || previewIds.has(preview.id) || !worldIds.has(preview.collection)
    || preview.file !== `${preview.id}.webp`) throw new Error('Invalid art preview metadata.');
  previewIds.add(preview.id);
}
if (worlds.some(world => world.preview && !previewIds.has(world.preview))) throw new Error('Collection preview is missing.');
const validated = [];
for (const extra of extras) {
  if (extra.file !== `${extra.id}.svg`) throw new Error(`Source filename must match charm ID: ${extra.id}`);
  await readFile(join(root, 'assets', extra.file), 'utf8');
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
for (const path of ['assets/default', 'assets/extras', 'assets/previews', 'assets/garden', 'packs', 'downloads', 'studio']) {
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
for (const preview of previews) {
  await copyFile(join(root, 'assets', 'previews', preview.file), join(dist, 'assets', 'previews', preview.file));
}
for (const stage of ['seed', 'sprout', 'leaves', 'bud', ...FLOWERS.map(flower => flower.id)]) {
  await copyFile(join(repo, 'extension', 'media', `garden-${stage}.svg`), join(dist, 'assets', 'garden', `${stage}.svg`));
}
await build({
  entryPoints: [join(root, 'demo.ts')], bundle: true, platform: 'browser',
  format: 'iife', globalName: 'CharmletDemo', outfile: join(dist, 'demo.js'),
  minify: true, sourcemap: false, target: ['es2022'],
});
await mkdir(join(dist, 'studio'), { recursive: true });
await copyFile(join(root, 'studio', 'index.html'), join(dist, 'studio', 'index.html'));
await copyFile(join(root, 'studio', 'style.css'), join(dist, 'studio', 'style.css'));
await build({
  entryPoints: [join(root, 'studio', 'page.js')], bundle: true, platform: 'browser',
  format: 'iife', outfile: join(dist, 'studio', 'studio.js'),
  minify: true, sourcemap: false, target: ['es2022'],
});
const vsix = `charmlet-${manifest.version}.vsix`;
await copyFile(join(repo, 'extension', vsix), join(dist, 'downloads', 'charmlet.vsix'));
const charms = [
  ...builtins.map(item => ({ ...item, kind: 'included', preview: `./assets/default/${item.file}` })),
  ...extras.map(item => ({ ...item, kind: 'extra', collectionId: worldByCharm.get(item.id).id,
    collectionLabel: worldByCharm.get(item.id).name, preview: `./assets/extras/${item.file}`, download: `./packs/${item.id}.charmlet.json` })),
];
const artPreviews = previews.map(item => ({ ...item, preview: `./assets/previews/${item.file}` }));
await writeFile(join(dist, 'catalogue.json'), `${JSON.stringify({ version: manifest.version,
  extensionDownload: './downloads/charmlet.vsix', distribution, charms, collections: worlds, artPreviews,
  sportsWishlist: collectionConfig.sportsWishlist }, null, 2)}\n`, 'utf8');
const review = await readFile(join(root, 'art-review.json'), 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return undefined;
  throw error;
});
if (review) {
  if (review.status !== 'review-only' || !Array.isArray(review.items) || review.items.length > 120
    || new Set(review.items.map(item => item.key)).size !== review.items.length) throw new Error('Invalid bounded art review.');
  await mkdir(join(dist, 'assets/review'), { recursive: true });
  await mkdir(join(dist, 'packs/review'), { recursive: true });
  for (const item of review.items) {
    if (!/^\.\/assets\/review\/[a-z0-9-]+\.png$/.test(item.image)
      || !/^\.\/assets\/review\/[a-z0-9-]+\.webp$/.test(item.preview)) throw new Error('Invalid review image path.');
    await copyFile(join(root, item.image), join(dist, item.image));
    await copyFile(join(root, item.preview), join(dist, item.preview));
    if (item.download) {
      if (item.family === 'flowers' || !/^\.\/packs\/review\/[a-z0-9-]+\.charmlet\.json$/.test(item.download)) throw new Error('Invalid review download.');
      parseCharmPack(await readFile(join(root, item.download)));
      await copyFile(join(root, item.download), join(dist, item.download));
    }
  }
  for (const bundle of review.bundles ?? []) {
    if (!/^\.\/packs\/review\/[a-z0-9-]+\.charmlet\.json$/.test(bundle.download)) throw new Error('Invalid review bundle path.');
    const pack = parseCharmPack(await readFile(join(root, bundle.download)));
    if (pack.charms.length !== bundle.count) throw new Error('Review bundle count mismatch.');
    await copyFile(join(root, bundle.download), join(dist, bundle.download));
  }
  for (const name of ['review.html', 'review.js', 'review.css', 'art-review.json']) await copyFile(join(root, name), join(dist, name));
}
console.log(`Built Charmlet gallery ${manifest.version}: ${builtins.length} included, ${extras.length} extras, ${review?.items.length ?? 0} art-review candidates.`);
