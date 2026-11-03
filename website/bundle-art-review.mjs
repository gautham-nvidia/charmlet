import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { curateArtwork, validateCuration } from './art-curation.mjs';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { parseCharmPack } = require('./out/charm-packs.js');
const root = join(repo, 'website');
const path = join(root, 'art-review.json');
const review = JSON.parse(await readFile(path, 'utf8'));
const rules = JSON.parse(await readFile(join(root, 'art-curation.json'), 'utf8'));
validateCuration(rules, review.items);
const worlds = JSON.parse(await readFile(join(root, 'collections.json'), 'utf8')).collections;
const groups = new Map(worlds.flatMap(world => world.charmIds.map(id => [id, world.name])));
const grouped = new Map();
const byKey = new Map();
async function saveImmutablePack(candidate) {
  let pack = candidate;
  const filename = id => join(root, 'packs', 'review', `${id}.charmlet.json`);
  const readExisting = file => readFile(file).then(bytes => parseCharmPack(bytes), error => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  const existing = await readExisting(filename(pack.id));
  if (existing && JSON.stringify(existing) !== JSON.stringify(pack)) {
    const hash = createHash('sha256').update(JSON.stringify({ ...pack, id: undefined })).digest('hex').slice(0, 8);
    pack = parseCharmPack(JSON.stringify({ ...pack, id: `${pack.id.slice(0, 39)}-${hash}` }));
  }
  const prior = await readExisting(filename(pack.id));
  if (prior) {
    if (JSON.stringify(prior) !== JSON.stringify(pack)) throw new Error(`Review pack identity collision: ${pack.id}`);
  } else {
    await writeFile(filename(pack.id), `${JSON.stringify(pack)}\n`, { flag: 'wx' });
  }
  return pack;
}
review.items = review.items.map(item => {
  if (item.family === 'classics') item.group = groups.get(item.id) ?? item.group;
  return curateArtwork(item, rules);
});
for (const item of review.items) {
  if (!item.featured || item.decision === 'original' || item.family === 'flowers') {
    item.download = null;
    continue;
  }
  const bytes = await readFile(join(root, item.image));
  if (createHash('sha256').update(bytes).digest('hex') !== item.pngSha256) throw new Error(`Prepared image changed: ${item.key}`);
  const charm = { id: item.key, name: item.name, group: item.group,
    description: `${item.name}: illustrated art-review candidate.`, accent: item.accent, png: bytes.toString('base64') };
  const id = `art-${item.key}-r${item.revision}-p${item.profile}`;
  const pack = await saveImmutablePack(parseCharmPack(JSON.stringify({ format: 'charmlet-pack', version: 1, id, name: `Review: ${item.name}`, author: 'Charmlet art review', charms: [charm] })));
  item.download = `./packs/review/${pack.id}.charmlet.json`;
  const group = item.family === 'starters' ? 'Starter Redraws' : item.group;
  byKey.set(item.key, charm);
  if (!grouped.has(group)) grouped.set(group, []);
  grouped.get(group).push(charm);
}
for (const [name, keys] of [
  ['Refresh Sample', ['starter-chip', 'starter-circuit', 'starter-transistor', 'starter-memory-stack',
    'extra-probe-card', 'starter-evil-eye', 'starter-drishti', 'new-stress-ball', 'new-squishy-star']],
  ['Bay Area Days', ['extra-foggy-bay', 'extra-bridge-lights', 'extra-campus-path', 'extra-coffee-street', 'extra-redwood-grove']],
]) {
  const selected = keys.flatMap(key => byKey.has(key) ? [byKey.get(key)] : []);
  if (selected.length) grouped.set(name, selected);
}
const bundles = [];
for (const [group, charms] of grouped) {
  for (let start = 0; start < charms.length; start += 12) {
    const index = Math.floor(start / 12) + 1;
    const slug = group.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `review-${slug}-${index}`;
    const name = `${group}${charms.length > 12 ? ` ${index}` : ''}`;
    const pack = await saveImmutablePack(parseCharmPack(JSON.stringify({ format: 'charmlet-pack', version: 1, id, name: `Review: ${name}`, author: 'Charmlet art review', charms: charms.slice(start, start + 12) })));
    const download = `./packs/review/${pack.id}.charmlet.json`;
    bundles.push({ name, count: pack.charms.length, download });
  }
}
review.bundles = bundles.sort((left, right) => Number(right.name === 'Refresh Sample') - Number(left.name === 'Refresh Sample'));
review.curationDate = rules.reviewedAt;
review.featured = review.items.filter(item => item.featured).length;
await writeFile(path, `${JSON.stringify(review, null, 2)}\n`);
console.log(JSON.stringify({ prepared: review.items.length, featured: review.featured, expected: review.expected, bundles: bundles.map(({ name, count }) => ({ name, count })) }));
