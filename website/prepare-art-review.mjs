import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artworkJobs } from './art-review-jobs.mjs';
import { extractGreenScreen } from './art-cutout.mjs';

// Some neutral fur picked up the green studio backdrop. This opt-in correction
// leaves alpha intact; edge-only mode protects the cats' genuine green irises.
function neutralizeGreen(cutout, mode) {
  const { data, width, height } = cutout;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (!data[offset + 3] || data[offset + 1] <= Math.max(data[offset], data[offset + 2])) continue;
    if (mode === 'edges' && data[offset + 3] >= 250) {
      const pixel = offset / 4, x = pixel % width, y = Math.floor(pixel / width), reach = 10;
      const edge = x < reach || y < reach || x >= width - reach || y >= height - reach
        || data[offset - reach * 4 + 3] < 20 || data[offset + reach * 4 + 3] < 20
        || data[offset - reach * width * 4 + 3] < 20 || data[offset + reach * width * 4 + 3] < 20;
      if (!edge) continue;
    }
    data[offset + 1] = Math.max(data[offset], data[offset + 2]);
  }
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { PNG } = require('pngjs');
const { chromium } = require('@playwright/test');
const { parseCharmPack, MAX_PNG_BYTES } = require('./out/charm-packs.js');
const rawRoot = join(repo, 'output/imagegen/phase-4-redraw/raw');
const imageRoot = join(repo, 'website/assets/review');
const packRoot = join(repo, 'website/packs/review');
const manifestPath = join(repo, 'website/art-review.json');
const allJobs = await artworkJobs(repo);
const requested = process.argv.slice(2);
const jobs = requested.length ? allJobs.filter(job => requested.includes(job.key)) : allJobs;
if (requested.length && jobs.length !== new Set(requested).size) throw new Error('Specify only known unique artwork job IDs.');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const existing = await readFile(manifestPath, 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return { items: [] };
  throw error;
});
const items = new Map(existing.items.map(item => [item.key, item]));
await mkdir(imageRoot, { recursive: true });
await mkdir(packRoot, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [];
try {
  const page = await browser.newPage();
  for (const job of jobs) {
    const profile = job.greenDespill ? 3 : 2;
    const renderId = `${job.variant}-p${profile}`;
    let raw, receipt;
    try {
      const sourceVariant = job.sourceVariant ?? job.variant;
      raw = await readFile(join(rawRoot, `${sourceVariant}.png`));
      receipt = JSON.parse(await readFile(join(rawRoot, `${sourceVariant}.json`), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT' && !requested.length) continue;
      throw error;
    }
    if (receipt.sha256 !== digest(raw)) throw new Error(`Raw artwork hash mismatch: ${job.key}`);
    if (job.sourceVariant && receipt.promptHash !== digest(job.prompt)) throw new Error(`Approved prompt mismatch: ${job.key}`);
    const previous = items.get(job.key);
    if (previous?.profile === profile && previous.revision === job.revision && previous.greenDespill === job.greenDespill) {
      if (previous.rawSha256 !== receipt.sha256) throw new Error(`Use a new revision instead of replacing ${job.key}.`);
      const image = await readFile(join(imageRoot, `${renderId}.png`));
      if (digest(image) !== previous.pngSha256) throw new Error(`Prepared artwork changed unexpectedly: ${job.key}`);
      console.log(JSON.stringify({ key: job.key, status: 'reused' }));
      continue;
    }
    try {
      const decoded = PNG.sync.read(raw);
      // Opt in only for subjects explicitly authored without any green materials.
      // This repeats the cleanup used in the three colour examples the owner approved.
      if (job.greenSpillCleanup) {
        for (let offset = 0; offset < decoded.data.length; offset += 4) {
          const [red, green, blue] = decoded.data.subarray(offset, offset + 3);
          if (green > 55 && green - Math.max(red, blue) > 35) {
            decoded.data[offset] = 0; decoded.data[offset + 1] = 255; decoded.data[offset + 2] = 0;
          }
        }
      }
      const cutout = extractGreenScreen(decoded);
      if (job.greenDespill) neutralizeGreen(cutout, job.greenDespill);
      const clean = PNG.sync.write({ width: cutout.width, height: cutout.height, data: Buffer.from(cutout.data) }, { colorType: 6 });
      const rendered = await page.evaluate(async ({ encoded, bounds }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${encoded}`;
        await image.decode();
        const render = (width, height, type) => {
          const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, width, height);
          const margin = width / 18;
          const scale = Math.min((width - margin * 2) / bounds.width, (height - margin * 2) / bounds.height);
          const drawWidth = bounds.width * scale, drawHeight = bounds.height * scale;
          context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, (width - drawWidth) / 2, margin, drawWidth, drawHeight);
          return canvas.toDataURL(type, .9).split(',')[1];
        };
        return { png: render(216, 252, 'image/png'), preview: render(432, 504, 'image/webp') };
      }, { encoded: clean.toString('base64'), bounds: cutout.bounds });
      const png = Buffer.from(rendered.png, 'base64');
      if (png.length > MAX_PNG_BYTES) throw new Error('Cutout exceeds the existing PNG cap.');
      const packId = `review-${renderId}`;
      const pack = parseCharmPack(JSON.stringify({
        format: 'charmlet-pack', version: 1, id: packId, name: `Review: ${job.name}`, author: 'Charmlet art review',
        charms: [{ id: job.id, name: job.name, group: job.group, description: `${job.name}: illustrated art-review candidate.`, accent: job.accent, png: rendered.png }],
      }));
      await writeFile(join(imageRoot, `${renderId}.png`), png, { flag: 'wx' });
      await writeFile(join(imageRoot, `${renderId}.webp`), Buffer.from(rendered.preview, 'base64'), { flag: 'wx' });
      if (job.family !== 'flowers') await writeFile(join(packRoot, `${packId}.charmlet.json`), `${JSON.stringify(pack)}\n`, { flag: 'wx' });
      const item = {
        key: job.key, id: job.id, name: job.name, group: job.group, family: job.family, accent: job.accent,
        description: job.description,
        original: job.original, preview: `./assets/review/${renderId}.webp`, image: `./assets/review/${renderId}.png`,
        revision: job.revision, profile,
        ...(job.sourceVariant ? { sourceVariant: job.sourceVariant } : {}),
        ...(job.greenSpillCleanup ? { greenSpillCleanup: true } : {}),
        ...(job.greenDespill ? { greenDespill: job.greenDespill } : {}),
        download: job.family === 'flowers' ? null : `./packs/review/${packId}.charmlet.json`,
        pngBytes: png.length, pngSha256: digest(png), rawSha256: receipt.sha256, promptHash: receipt.promptHash,
        model: 'Gemini 3 Pro Image', status: 'review-candidate', width: 216, height: 252,
      };
      items.set(job.key, item);
      console.log(JSON.stringify({ key: job.key, pngBytes: png.length, status: 'prepared-transparent-review' }));
    } catch (error) {
      failures.push({ key: job.key, error: error.message });
      console.error(`${job.key}: ${error.message}`);
    }
    const ordered = allJobs.flatMap(job => {
      const item = items.get(job.key);
      // Keep earlier candidates as archive entries while a requested redraw is
      // still being prepared. Curation excludes them from the visible lineup.
      return (item?.profile === 2 || item?.profile === 3) && item.revision <= job.revision ? [item] : [];
    });
    await writeFile(manifestPath, `${JSON.stringify({ ...existing, status: 'review-only', expected: allJobs.length, prepared: ordered.length,
      note: 'Illustrated Gemini redraw candidates. No final bundled/free/paid decisions are implied. Flowers remain earned rewards.', items: ordered }, null, 2)}\n`);
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ prepared: items.size, expected: allJobs.length, failures }));
if (failures.length) process.exitCode = 1;
