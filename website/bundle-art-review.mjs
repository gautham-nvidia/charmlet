import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { parseCharmPack } = require('./out/charm-packs.js');
const root = join(repo, 'website');
const path = join(root, 'art-review.json');
const review = JSON.parse(await readFile(path, 'utf8'));
const worlds = JSON.parse(await readFile(join(root, 'collections.json'), 'utf8')).collections;
const groups = new Map(worlds.flatMap(world => world.charmIds.map(id => [id, world.name])));
const grouped = new Map();
for (const item of review.items) {
  if (item.family === 'classics') item.group = groups.get(item.id) ?? item.group;
  if (item.family === 'flowers') continue;
  const bytes = await readFile(join(root, item.image));
  if (createHash('sha256').update(bytes).digest('hex') !== item.pngSha256) throw new Error(`Prepared image changed: ${item.key}`);
  const charm = { id: item.key, name: item.name, group: item.group,
    description: `${item.name}: illustrated art-review candidate.`, accent: item.accent, png: bytes.toString('base64') };
  const id = `art-${item.key}-r${item.revision}-p${item.profile}`;
  const pack = parseCharmPack(JSON.stringify({ format: 'charmlet-pack', version: 1, id, name: `Review: ${item.name}`, author: 'Charmlet art review', charms: [charm] }));
  item.download = `./packs/review/${id}.charmlet.json`;
  await writeFile(join(root, item.download), `${JSON.stringify(pack)}\n`);
  const group = item.family === 'starters' ? 'Starter Redraws' : item.group;
  if (!grouped.has(group)) grouped.set(group, []);
  grouped.get(group).push(charm);
}
const bundles = [];
for (const [group, charms] of grouped) {
  for (let start = 0; start < charms.length; start += 12) {
    const index = Math.floor(start / 12) + 1;
    const slug = group.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id = `review-${slug}-${index}`;
    const name = `${group}${charms.length > 12 ? ` ${index}` : ''}`;
    let pack = parseCharmPack(JSON.stringify({ format: 'charmlet-pack', version: 1, id, name: `Review: ${name}`, author: 'Charmlet art review', charms: charms.slice(start, start + 12) }));
    const previous = review.bundles?.find(bundle => bundle.name === name);
    if (previous) {
      const prior = parseCharmPack(await readFile(join(root, previous.download)));
      const same = JSON.stringify(prior.charms) === JSON.stringify(pack.charms);
      const revisedId = same ? prior.id : `${id}-${createHash('sha256').update(JSON.stringify(pack.charms)).digest('hex').slice(0, 8)}`;
      pack = parseCharmPack(JSON.stringify({ ...pack, id: revisedId }));
    }
    const download = `./packs/review/${pack.id}.charmlet.json`;
    await writeFile(join(root, download), `${JSON.stringify(pack)}\n`);
    bundles.push({ name, count: pack.charms.length, download });
  }
}
review.bundles = bundles;
await writeFile(path, `${JSON.stringify(review, null, 2)}\n`);
console.log(JSON.stringify({ prepared: review.items.length, expected: review.expected, bundles: bundles.map(({ name, count }) => ({ name, count })) }));
