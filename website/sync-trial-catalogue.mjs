import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFile, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artworkJobs } from './art-review-jobs.mjs';
import { curateArtwork, validateCuration } from './art-curation.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { parseCharmPack, packCharms } = require('./out/charm-packs.js');
const { FIDGET_CHARMS, LIVE_CHARMS, ORIGINAL_CHARMS } = require('./out/charm-catalog.js');
const { FLOWERS } = require('./out/garden-core.js');
const check = process.argv.includes('--check');
const site = join(repo, 'website');
const media = join(repo, 'extension/media');
const target = join(repo, 'extension/src/trial-charms.json');
const previous = JSON.parse(await readFile(target, 'utf8'));
const review = JSON.parse(await readFile(join(site, 'art-review.json'), 'utf8'));
const rules = JSON.parse(await readFile(join(site, 'art-curation.json'), 'utf8'));
const jobs = await artworkJobs(repo);
validateCuration(rules, review.items);
assert.equal(review.items.length, jobs.length, 'Prepare every artwork job before syncing the trial.');
const currentJobs = new Map(jobs.map(job => [job.key, job]));
const selected = review.items.map(item => curateArtwork(item, rules))
  .filter(item => item.featured && item.decision !== 'original');
const catalogue = [];
let bytesIncluded = 0;
for (const item of selected) {
  const job = currentJobs.get(item.key);
  assert.equal(item.revision, job?.revision, `Prepared artwork is stale: ${item.key}`);
  assert.match(item.image, /^\.\/assets\/review\/[a-z0-9-]+\.png$/);
  const bytes = await readFile(join(site, item.image));
  const artworkHash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(artworkHash, item.pngSha256, `Image changed: ${item.key}`);
  const group = item.family === 'flowers' ? 'Garden Flowers' : item.group;
  const description = item.family === 'flowers'
    ? `${item.name} artwork. Try it here; your garden still records the flowers you grow.`
    : `${item.name}, included in the complete trial collection.`;
  // Reuse the real importer's bounded PNG validation and cord geometry.
  const pack = parseCharmPack(JSON.stringify({
    format: 'charmlet-pack', version: 1, id: `trial-${item.key}`,
    name: item.name, author: 'Charmlet trial collection',
    charms: [{ id: item.key, name: item.name, group, description, accent: item.accent, png: bytes.toString('base64') }],
  }));
  const attachment = packCharms([pack])[0].attachment;
  const file = `trial-${item.key}-r${item.revision}-p${item.profile}.png`;
  assert.match(file, /^[a-z0-9-]+\.png$/);
  if (check) {
    assert.ok((await readFile(join(media, file))).equals(bytes), `Bundled asset differs: ${file}`);
  } else {
    await copyFile(join(site, item.image), join(media, file));
  }
  catalogue.push({
    id: `trial:${item.key}`, name: item.name, file, description, accent: item.accent, group,
    artworkKey: item.key, artworkHash, attachment,
  });
  bytesIncluded += bytes.length;
}
assert.equal(new Set(catalogue.map(charm => charm.id)).size, catalogue.length);
assert.deepEqual(new Set(catalogue.filter(charm => charm.group === 'Garden Flowers').map(charm => charm.artworkKey)),
  new Set(FLOWERS.map(flower => `flower-${flower.id}`)),
  'All flower artwork must be available without changing earned garden progress.');
const output = `${JSON.stringify(catalogue, null, 2)}\n`;
if (check) {
  assert.deepEqual(previous, catalogue, 'Trial catalogue metadata is stale.');
} else {
  await writeFile(target, output);
  // Only remove our superseded generated copies; authoring images and old packs stay archived.
  const currentFiles = new Set(catalogue.map(charm => charm.file));
  for (const charm of previous.filter(charm => !currentFiles.has(charm.file))) {
    assert.match(charm.file, /^trial-[a-z0-9-]+\.png$/);
    const oldPath = join(media, charm.file);
    const oldBytes = await readFile(oldPath);
    assert.equal(createHash('sha256').update(oldBytes).digest('hex'), charm.artworkHash,
      `A superseded generated file was edited; preserve it for review: ${charm.file}`);
    await unlink(oldPath);
  }
}
assert.deepEqual(new Set((await readdir(media)).filter(file => /^trial-.*\.png$/.test(file))),
  new Set(catalogue.map(charm => charm.file)), 'Unreferenced trial copies must not enter the package.');
console.log(JSON.stringify({
  checked: check, trialCharms: catalogue.length, originalCharms: ORIGINAL_CHARMS.length,
  totalAvailable: catalogue.length + ORIGINAL_CHARMS.length + LIVE_CHARMS.length + FIDGET_CHARMS.length,
  liveCharms: LIVE_CHARMS.length, fidgetCharms: FIDGET_CHARMS.length, bytesIncluded,
  groups: [...new Set(catalogue.map(charm => charm.group))],
}));
