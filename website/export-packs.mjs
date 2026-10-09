import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('../extension/node_modules/@playwright/test');
const { parseCharmPack } = require('../extension/out/charm-packs.js');
const root = dirname(fileURLToPath(import.meta.url));
const extras = JSON.parse(await readFile(join(root, 'extras.json'), 'utf8'));
const requested = process.argv.slice(2);
if (!requested.length || new Set(requested).size !== requested.length || requested.some(id => !extras.some(item => item.id === id))) {
  throw new Error('Specify unique known charm IDs to export; unchanged packs are frozen.');
}
const selected = extras.filter(entry => requested.includes(entry.id));
const output = join(root, 'packs');
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  for (const entry of selected) {
    const svg = await readFile(join(root, 'assets', entry.file), 'utf8');
    const source = Buffer.from(svg, 'utf8').toString('base64');
    const png = await page.evaluate(async encoded => {
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${encoded}`;
      await image.decode();
      if (image.naturalWidth !== 72 || image.naturalHeight !== 84) {
        throw new Error(`Unexpected SVG dimensions ${image.naturalWidth}x${image.naturalHeight}`);
      }
      const canvas = document.createElement('canvas');
      canvas.width = 288;
      canvas.height = 336;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
    }, source);
    const pack = parseCharmPack(JSON.stringify({
      format: 'charmlet-pack', version: 1, id: entry.id, name: entry.name, author: 'Charmlet',
      charms: [{
        id: entry.id, name: entry.name, group: entry.group, description: entry.description,
        accent: entry.accent, png,
      }],
    }));
    await writeFile(join(output, `${entry.id}.charmlet.json`), `${JSON.stringify(pack)}\n`, 'utf8');
    console.log(`Exported ${entry.id}`);
  }
} finally {
  await browser?.close();
}
