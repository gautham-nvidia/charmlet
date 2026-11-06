import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractGreenScreen } from './art-cutout.mjs';

const site = dirname(fileURLToPath(import.meta.url));
const repo = join(site, '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { PNG } = require('pngjs');
const { chromium } = require('@playwright/test');
const { parseCharmPack } = require('./out/charm-packs.js');
const jobs = JSON.parse(await readFile(join(site, 'garden-art-jobs.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const previous = await readFile(join(site, 'garden-art.json'), 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return { items: [] };
  throw error;
});
const items = [];
const swapGreenBlue = pixels => {
  // Reuse the proven green-key extractor with a blue background, preserving
  // natural green foliage. The raw image and its receipt are never rewritten.
  for (let offset = 0; offset < pixels.length; offset += 4) {
    [pixels[offset + 1], pixels[offset + 2]] = [pixels[offset + 2], pixels[offset + 1]];
  }
};
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const job of jobs) {
    if (!/^garden-(seed|sprout|leaves|bud)$/.test(job.key) || !/^garden-[a-z]+-r\d+$/.test(job.variant)) {
      throw new Error('Expected a bounded garden-stage job.');
    }
    const sourceVariant = job.sourceVariant ?? job.variant;
    if (!/^garden-[a-z]+-r\d+$/.test(sourceVariant)) throw new Error('Invalid garden source.');
    const raw = await readFile(join(repo, 'output/imagegen/phase-4-redraw/raw', `${sourceVariant}.png`));
    const receipt = JSON.parse(await readFile(join(repo, 'output/imagegen/phase-4-redraw/raw', `${sourceVariant}.json`), 'utf8'));
    if (digest(raw) !== receipt.sha256 || digest(job.prompt) !== receipt.promptHash) throw new Error(`Garden source changed: ${job.key}`);
    const file = `${job.variant}.png`;
    const target = join(repo, 'extension/media', file);
    const saved = previous.items.find(item => item.key === job.key && item.file === file);
    if (saved) {
      if (saved.rawSha256 !== receipt.sha256 || digest(await readFile(target)) !== saved.pngSha256) throw new Error(`Use a new garden revision: ${job.key}`);
      items.push(saved);
      continue;
    }
    const decoded = PNG.sync.read(raw);
    if (job.blueSpillCleanup) {
      // These subjects are explicitly authored without blue materials.
      for (let offset = 0; offset < decoded.data.length; offset += 4) {
        const [red, green, blue] = decoded.data.subarray(offset, offset + 3);
        if (blue > 55 && blue - Math.max(red, green) > 35) {
          decoded.data[offset] = 0; decoded.data[offset + 1] = 0; decoded.data[offset + 2] = 255;
        }
      }
    }
    swapGreenBlue(decoded.data);
    const cutout = extractGreenScreen(decoded);
    swapGreenBlue(cutout.data);
    const clean = PNG.sync.write({ width: cutout.width, height: cutout.height, data: Buffer.from(cutout.data) });
    const encoded = await page.evaluate(async ({ imageData, bounds }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${imageData}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 216; canvas.height = 252;
      const scale = Math.min(144 / bounds.width, 224 / bounds.height);
      const width = bounds.width * scale, height = bounds.height * scale;
      canvas.getContext('2d').drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, (216 - width) / 2, 240 - height, width, height);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { imageData: clean.toString('base64'), bounds: cutout.bounds });
    const png = Buffer.from(encoded, 'base64');
    parseCharmPack(JSON.stringify({
      format: 'charmlet-pack', version: 1, id: job.key, name: job.name, author: 'Charmlet',
      charms: [{ id: job.key, name: job.name, description: 'Botanical garden growth artwork.', group: 'Garden', accent: '#a96b47', png: encoded }],
    }));
    await writeFile(target, png, { flag: 'wx' });
    items.push({
      key: job.key, file, model: receipt.model, rawSha256: receipt.sha256,
      promptHash: receipt.promptHash, pngSha256: digest(png), width: 216, height: 252,
      bytes: png.length, generatedAt: receipt.generatedAt,
      ...(job.sourceVariant ? { sourceVariant } : {}),
      ...(job.blueSpillCleanup ? { blueSpillCleanup: true } : {}),
    });
  }
  await writeFile(join(site, 'garden-art.json'), `${JSON.stringify({ profile: 1, items }, null, 2)}\n`);
  for (const old of previous.items.filter(old => !items.some(item => item.file === old.file))) {
    if (!/^garden-(seed|sprout|leaves|bud)-r\d+\.png$/.test(old.file)) throw new Error('Invalid superseded garden filename.');
    const path = join(repo, 'extension/media', old.file);
    if (digest(await readFile(path)) !== old.pngSha256) throw new Error(`Preserve the edited garden asset: ${old.file}`);
    await unlink(path);
  }
  console.log(JSON.stringify({ prepared: items.length, files: items.map(item => item.file) }));
} finally { await browser.close(); }
