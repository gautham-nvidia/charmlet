import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../extension/node_modules/esbuild/lib/main.js';
import { validateDistribution } from './distribution.mjs';
import { curateArtwork, validateCuration } from './art-curation.mjs';
import { trialCollections } from './trial-collections.mjs';
import { validateLaunch } from './launch.mjs';
import { validateAudience } from './audience.mjs';
import { buildCommerceCatalogue } from '../service/build-catalogue.mjs';
import { securityHeaders } from './security-headers.mjs';

const require = createRequire(import.meta.url);
const { parseCharmPack } = require('../extension/out/charm-packs.js');
const { FLOWERS } = require('../extension/out/garden-core.js');
const { CHARMS, FIDGET_CHARMS, LIVE_CHARMS, ORIGINAL_CHARMS } = require('../extension/out/charm-catalog.js');
const { charmCollection, orderByCollection } = require('../extension/out/charm-collections.js');
const { gardenArtwork, GARDEN_STAGE_FILES } = require('../extension/out/garden-catalog.js');
const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const dist = join(root, 'dist');
const privateReview = process.argv.includes('--review-downloads');
const builtins = JSON.parse(await readFile(join(repo, 'extension', 'src', 'builtin-charms.json'), 'utf8'));
const trial = JSON.parse(await readFile(join(repo, 'extension', 'src', 'trial-charms.json'), 'utf8'));
const trialByKey = new Map(trial.map(charm => [charm.artworkKey, charm]));
const extras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
const collectionConfig = JSON.parse(await readFile(join(root, 'collections.json'), 'utf8'));
const curation = JSON.parse(await readFile(join(root, 'art-curation.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(repo, 'extension', 'package.json'), 'utf8'));
const distribution = validateDistribution(JSON.parse(await readFile(join(root, 'distribution.json'), 'utf8')), manifest);
const launch = validateLaunch(JSON.parse(await readFile(join(root, 'launch.json'), 'utf8')));
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
const currentWorlds = trialCollections(worlds);
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
for (const path of ['assets/default', 'assets/extras', 'assets/previews', 'assets/garden', 'assets/app-review', 'assets/fonts', 'packs', 'downloads', 'studio', 'api/studio']) {
  await mkdir(join(dist, path), { recursive: true });
}
// Static hosting advertises no paid service. Do not copy local API credentials.
await writeFile(join(dist, 'api/studio/config.json'), `${JSON.stringify({ available: false, checkoutUrl: null, testMode: false })}\n`);
for (const name of ['index.html', 'charms.html', 'site.css', 'site.js', 'home.js', 'styles.css', 'app.js', 'concepts.html', 'concepts.css']) {
  await copyFile(join(root, name), join(dist, name));
}
for (const name of ['manrope-variable.ttf', 'OFL.txt']) {
  await copyFile(join(root, 'assets/fonts', name), join(dist, 'assets/fonts', name));
}
{
  await mkdir(join(dist, 'assets/brand'), { recursive: true });
  for (const name of ['brand-lab.html', 'brand-lab.css', 'design-theme.js', 'next.css', 'download.html', 'download.js', 'privacy.html',
    'about.html', 'about-us.html', 'press.html', 'information.css', 'information.js', 'access-client.js',
    'shop.html', 'shop.js', 'store.css', 'gallery-theme.css', '404.html']) {
    await copyFile(join(root, name), join(dist, name));
  }
  // Keep previously shared owner-preview URLs usable after promoting the approved homepage.
  await copyFile(join(root, 'index.html'), join(dist, 'next.html'));
  await writeFile(join(dist, 'audience.json'), `${JSON.stringify(validateAudience(JSON.parse(await readFile(join(root, 'audience.json'), 'utf8'))), null, 2)}\n`);
  await build({
    entryPoints: [join(root, 'audience-page.js')], bundle: true, platform: 'browser',
    format: 'esm', outfile: join(dist, 'audience-page.js'), minify: true, target: ['es2022'],
  });
  for (const name of ['terminal-pendant.svg', 'cali-signature.svg', 'cali-cursor.svg']) {
    await copyFile(join(root, 'assets/brand', name), join(dist, 'assets/brand', name));
  }
  for (const name of ['bricolage-grotesque-variable.ttf', 'BRICOLAGE-OFL.txt']) {
    await copyFile(join(root, 'assets/fonts', name), join(dist, 'assets/fonts', name));
  }
  await build({
    entryPoints: [join(root, 'next.js')], bundle: true, platform: 'browser',
    format: 'esm', outfile: join(dist, 'next.js'),
    minify: true, sourcemap: false, target: ['es2022'],
  });
}
await copyFile(join(repo, 'extension', 'media', 'puzzle.css'), join(dist, 'puzzle.css'));
await copyFile(join(repo, 'extension', 'media', 'celebration.css'), join(dist, 'celebration.css'));
for (const builtin of builtins) {
  await copyFile(join(repo, 'extension', 'media', builtin.file), join(dist, 'assets', 'default', builtin.file));
}
for (const live of [...LIVE_CHARMS, ...FIDGET_CHARMS]) {
  await copyFile(join(repo, 'extension', 'media', live.file), join(dist, 'assets', 'default', live.file));
}
for (const charm of CHARMS) {
  await copyFile(join(repo, 'extension/media', charm.file), join(dist, 'assets/default', charm.file));
}
const liveArt = JSON.parse(await readFile(join(root, 'live-art-assets.json'), 'utf8'));
if (liveArt.version !== 1 || !Array.isArray(liveArt.assets) || liveArt.assets.length !== 36
  || new Set(liveArt.assets.map(asset => asset.file)).size !== 36) throw new Error('Invalid live artwork manifest.');
for (const asset of liveArt.assets) {
  if (!/^live-(?:art-)?[a-z0-9-]+\.png$/.test(asset.file)) throw new Error('Invalid live artwork filename.');
  const bytes = await readFile(join(repo, 'extension/media', asset.file));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Live artwork changed: ${asset.file}`);
  await writeFile(join(dist, 'assets/default', asset.file), bytes);
}
for (const { extra, packPath } of validated) {
  await copyFile(join(root, 'assets', extra.file), join(dist, 'assets', 'extras', extra.file));
  if (privateReview) await copyFile(packPath, join(dist, 'packs', `${extra.id}.charmlet.json`));
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
if (privateReview) await copyFile(join(repo, 'extension', vsix), join(dist, 'downloads', 'charmlet.vsix'));
const charms = [
  ...ORIGINAL_CHARMS.map(item => ({ ...item, kind: 'included', preview: `./assets/default/${item.file}` })),
  ...[...LIVE_CHARMS, ...FIDGET_CHARMS].map(item => ({ ...item, kind: 'extra', live: true, includedInTrial: true,
    collectionId: item.group === 'Live Companions' ? 'live' : 'stress', collectionLabel: item.group,
    preview: `./assets/default/${item.file}`, download: null })),
];
const artPreviews = previews.map(item => ({ ...item, preview: `./assets/previews/${item.file}` }));
const review = await readFile(join(root, 'art-review.json'), 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return undefined;
  throw error;
});
if (review) {
  if (review.status !== 'review-only' || !Array.isArray(review.items) || review.items.length > 256
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
      const world = currentWorlds.find(world => world.name === charmCollection(bundled));
      if (!world) throw new Error(`Missing curated collection: ${bundled.group}`);
      charms.push({ id: item.key, name: item.name, description: bundled.description, accent: item.accent,
        kind: 'extra', review: true, includedInTrial: true, group: bundled.group,
        collectionId: world.id, collectionLabel: world.name, preview: item.preview,
        download: privateReview ? item.download : null, attachment: bundled.attachment });
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
    if (privateReview) await copyFile(source, join(dist, 'packs/review', file.name));
  }
  if (privateReview) {
    for (const name of ['review.html', 'review.js', 'review.css', 'art-review.json']) await copyFile(join(root, name), join(dist, name));
  }
}
const orderedCharms = orderByCollection(charms).map(charm => {
  const world = currentWorlds.find(world => world.name === charmCollection(charm));
  if (!world) throw new Error(`Missing trial pack for ${charm.id}`);
  return { ...charm, collectionId: world.id, collectionLabel: world.name };
});
const collections = currentWorlds.map(world => ({ ...world, charmIds: orderedCharms
  .filter(charm => charm.collectionId === world.id).map(charm => charm.id) }));
if (!trial.length || charms.length !== ORIGINAL_CHARMS.length + trial.length + LIVE_CHARMS.length + FIDGET_CHARMS.length) throw new Error('The complete trial must appear in the gallery.');
await writeFile(join(dist, 'catalogue.json'), `${JSON.stringify({ version: manifest.version,
  extensionDownload: privateReview ? './downloads/charmlet.vsix' : './download.html', distribution, launch, charms: orderedCharms, collections, artPreviews,
  sportsWishlist: collectionConfig.sportsWishlist }, null, 2)}\n`, 'utf8');
console.log(`Built Charmlet gallery ${manifest.version}: ${ORIGINAL_CHARMS.length} original, ${trial.length} rendered designs, ${LIVE_CHARMS.length} live companions and ${FIDGET_CHARMS.length} fidgets included, ${review?.featured ?? 0} selected review designs.`);
const { publicData } = await buildCommerceCatalogue();
await writeFile(join(dist, 'commerce-public.json'), `${JSON.stringify(publicData, null, 2)}\n`);
await writeFile(join(dist, '_headers'), `/*\n${Object.entries(securityHeaders(publicData.apiOrigin)).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`);
if (privateReview) console.log('PRIVATE OWNER PREVIEW: contains review packs and an installer. Do not deploy this output.');
else console.log('Public build excludes installers and raw download packs. Delivery requires the verified-email service.');
