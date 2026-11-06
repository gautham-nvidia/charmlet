import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../extension/node_modules/esbuild/lib/main.js';
import { validateDistribution } from './distribution.mjs';
import { curateArtwork, validateCuration } from './art-curation.mjs';

const require = createRequire(import.meta.url);
const { parseCharmPack } = require('../extension/out/charm-packs.js');
const { FLOWERS } = require('../extension/out/garden-core.js');
const { FIDGET_CHARMS, LIVE_CHARMS, ORIGINAL_CHARMS } = require('../extension/out/charm-catalog.js');
const { gardenArtwork, GARDEN_STAGE_FILES } = require('../extension/out/garden-catalog.js');
const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const dist = join(root, 'dist');
const builtins = JSON.parse(await readFile(join(repo, 'extension', 'src', 'builtin-charms.json'), 'utf8'));
const trial = JSON.parse(await readFile(join(repo, 'extension', 'src', 'trial-charms.json'), 'utf8'));
const trialByKey = new Map(trial.map(charm => [charm.artworkKey, charm]));
const extras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
const collectionConfig = JSON.parse(await readFile(join(root, 'collections.json'), 'utf8'));
const curation = JSON.parse(await readFile(join(root, 'art-curation.json'), 'utf8'));
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
const expectedWorlds = {
  live: 0, ai: 7, coding: 7, silicon: 18, testing: 12, animals: 0, trees: 2, space: 1, parks: 6,
  cities: 5, culture: 0, sports: 0, luck: 2, stress: 0, seasonal: 0,
  'solar-system': 0, gemstones: 0, zodiac: 0, sacred: 0, flowers: 0,
};
const worlds = collectionConfig.collections;
const previews = collectionConfig.previews;
if (!Array.isArray(worlds) || worlds.length !== Object.keys(expectedWorlds).length || !Array.isArray(previews) || previews.length !== 4) throw new Error('Unexpected collection worlds or art previews.');
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
for (const path of ['assets/default', 'assets/extras', 'assets/previews', 'assets/garden', 'assets/app-review', 'packs', 'downloads', 'studio', 'api/studio']) {
  await mkdir(join(dist, path), { recursive: true });
}
// Static hosting advertises no paid service. Do not copy local API credentials.
await writeFile(join(dist, 'api/studio/config.json'), `${JSON.stringify({ available: false, checkoutUrl: null, testMode: false })}\n`);
for (const name of ['index.html', 'styles.css', 'app.js', 'concepts.html', 'concepts.css']) await copyFile(join(root, name), join(dist, name));
for (const builtin of builtins) {
  await copyFile(join(repo, 'extension', 'media', builtin.file), join(dist, 'assets', 'default', builtin.file));
}
for (const live of [...LIVE_CHARMS, ...FIDGET_CHARMS]) {
  await copyFile(join(repo, 'extension', 'media', live.file), join(dist, 'assets', 'default', live.file));
}
for (const { extra, packPath } of validated) {
  await copyFile(join(root, 'assets', extra.file), join(dist, 'assets', 'extras', extra.file));
  await copyFile(packPath, join(dist, 'packs', `${extra.id}.charmlet.json`));
}
for (const preview of previews) {
  await copyFile(join(root, 'assets', 'previews', preview.file), join(dist, 'assets', 'previews', preview.file));
}
for (const file of await readdir(join(root, 'assets/app-review'), { withFileTypes: true })) {
  if (file.isFile() && /^[a-z0-9-]+\.png$/.test(file.name)) {
    await copyFile(join(root, 'assets/app-review', file.name), join(dist, 'assets/app-review', file.name));
  }
}
const gardenArt = JSON.parse(await readFile(join(root, 'garden-art.json'), 'utf8'));
if (gardenArt.items.length !== 4) throw new Error('The garden needs all four growth stages.');
for (const [stage, file] of Object.entries(GARDEN_STAGE_FILES)) {
  const item = gardenArt.items.find(item => item.file === file && item.key === `garden-${stage}`);
  const bytes = await readFile(join(repo, 'extension/media', file));
  if (!item || createHash('sha256').update(bytes).digest('hex') !== item.pngSha256) throw new Error(`Garden artwork changed: ${stage}`);
  parseCharmPack(JSON.stringify({ format: 'charmlet-pack', version: 1, id: `garden-${stage}`, name: stage, author: 'Charmlet',
    charms: [{ id: stage, name: stage, description: 'Garden growth artwork.', group: 'Garden', accent: '#a96b47', png: bytes.toString('base64') }] }));
  await copyFile(join(repo, 'extension/media', file), join(dist, 'assets/garden', `${stage}.png`));
}
for (const flower of FLOWERS) {
  await copyFile(join(repo, 'extension/media', gardenArtwork(flower.id).file), join(dist, 'assets/garden', `${flower.id}.png`));
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
  ...ORIGINAL_CHARMS.map(item => ({ ...item, kind: 'included', preview: `./assets/default/${item.file}` })),
  ...[...LIVE_CHARMS, ...FIDGET_CHARMS].map(item => ({ ...item, kind: 'extra', live: true, includedInTrial: true,
    collectionId: item.group === 'Live 3D' ? 'live' : 'stress', collectionLabel: item.group,
    preview: `./assets/default/${item.file}`, download: null })),
];
const artPreviews = previews.map(item => ({ ...item, preview: `./assets/previews/${item.file}` }));
const review = await readFile(join(root, 'art-review.json'), 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return undefined;
  throw error;
});
if (review) {
  if (review.status !== 'review-only' || !Array.isArray(review.items) || review.items.length > 220
    || new Set(review.items.map(item => item.key)).size !== review.items.length) throw new Error('Invalid bounded art review.');
  validateCuration(curation, review.items);
  await mkdir(join(dist, 'assets/review'), { recursive: true });
  await mkdir(join(dist, 'packs/review'), { recursive: true });
  for (const item of review.items) {
    const selected = curateArtwork(item, curation);
    if (selected.featured !== item.featured || selected.decision !== item.decision || selected.name !== item.name
      || selected.group !== item.group) throw new Error('Refresh the curated review packs before building.');
    if (!/^\.\/assets\/review\/[a-z0-9-]+\.png$/.test(item.image)
      || !/^\.\/assets\/review\/[a-z0-9-]+\.webp$/.test(item.preview)) throw new Error('Invalid review image path.');
    await copyFile(join(root, item.image), join(dist, item.image));
    await copyFile(join(root, item.preview), join(dist, item.preview));
    if (item.family === 'flowers' && item.original) {
      if (!/^[a-z0-9-]+$/.test(item.id) || item.original !== `garden/${item.id}.svg`) {
        throw new Error('Invalid original flower comparison.');
      }
      await copyFile(join(repo, 'extension/media', `garden-${item.id}.svg`), join(dist, 'assets', item.original));
    }
    if (item.download) {
      if (!item.featured || item.decision === 'original' || item.family === 'flowers'
        || !/^\.\/packs\/review\/[a-z0-9-]+\.charmlet\.json$/.test(item.download)) throw new Error('Invalid review download.');
      const pack = parseCharmPack(await readFile(join(root, item.download)));
      const entry = pack.charms[0];
      if (pack.charms.length !== 1 || entry.id !== item.key || entry.name !== item.name || entry.group !== item.group
        || createHash('sha256').update(Buffer.from(entry.png, 'base64')).digest('hex') !== item.pngSha256) {
        throw new Error(`Review download does not match its artwork: ${item.key}`);
      }
    }
    if (item.featured && item.decision !== 'original') {
      const bundled = trialByKey.get(item.key);
      if (!bundled || bundled.artworkHash !== item.pngSha256 || bundled.name !== item.name) {
        throw new Error(`Trial artwork differs from the gallery: ${item.key}`);
      }
      const alias = { 'Silicon & Code': 'silicon', 'Good Luck': 'luck' }[bundled.group];
      const world = worlds.find(world => world.name === bundled.group || world.id === alias);
      if (!world) throw new Error(`Missing curated collection: ${bundled.group}`);
      charms.push({ id: item.key, name: item.name, description: bundled.description, accent: item.accent,
        kind: 'extra', review: true, includedInTrial: true, group: bundled.group,
        collectionId: world.id, collectionLabel: world.name, preview: item.preview,
        download: item.download, attachment: bundled.attachment });
    }
  }
  for (const bundle of review.bundles ?? []) {
    if (!/^\.\/packs\/review\/[a-z0-9-]+\.charmlet\.json$/.test(bundle.download)) throw new Error('Invalid review bundle path.');
    const pack = parseCharmPack(await readFile(join(root, bundle.download)));
    if (pack.charms.length !== bundle.count || pack.charms.some(charm =>
      !review.items.some(item => item.key === charm.id && item.featured && item.download))) {
      throw new Error('Review bundle includes unavailable artwork or has the wrong count.');
    }
  }
  // Keep previously shared download URLs usable without advertising retired
  // designs. Pack identities and the archived bytes remain unchanged.
  for (const file of await readdir(join(root, 'packs/review'), { withFileTypes: true })) {
    if (!file.isFile() || !/^[a-z0-9-]+\.charmlet\.json$/.test(file.name)) continue;
    const source = join(root, 'packs/review', file.name);
    parseCharmPack(await readFile(source));
    await copyFile(source, join(dist, 'packs/review', file.name));
  }
  for (const name of ['review.html', 'review.js', 'review.css', 'art-review.json']) await copyFile(join(root, name), join(dist, name));
}
const collections = worlds.map(world => ({ ...world, charmIds: charms
  .filter(charm => charm.kind === 'extra' && charm.collectionId === world.id).map(charm => charm.id) }));
if (!trial.length || charms.length !== ORIGINAL_CHARMS.length + trial.length + LIVE_CHARMS.length + FIDGET_CHARMS.length) throw new Error('The complete trial must appear in the gallery.');
await writeFile(join(dist, 'catalogue.json'), `${JSON.stringify({ version: manifest.version,
  extensionDownload: './downloads/charmlet.vsix', distribution, charms, collections, artPreviews,
  sportsWishlist: collectionConfig.sportsWishlist }, null, 2)}\n`, 'utf8');
console.log(`Built Charmlet gallery ${manifest.version}: ${ORIGINAL_CHARMS.length} original, ${trial.length} rendered designs, ${LIVE_CHARMS.length} live companions and ${FIDGET_CHARMS.length} fidgets included, ${review?.featured ?? 0} selected review designs.`);
