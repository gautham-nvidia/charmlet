import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const require = createRequire(join(repo, 'extension', 'package.json'));
const { chromium } = require('@playwright/test');
const { PNG } = require('pngjs');
const sourcePath = join(repo, 'extension', 'media', 'marketplace-icon.svg');
const outputPath = join(repo, 'extension', 'media', 'marketplace-icon.png');
const source = Buffer.from(await readFile(sourcePath, 'utf8'), 'utf8').toString('base64');
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const base64 = await page.evaluate(async encoded => {
    const image = new Image();
    image.src = `data:image/svg+xml;base64,${encoded}`;
    await image.decode();
    if (image.naturalWidth !== 256 || image.naturalHeight !== 256) {
      throw new Error(`Unexpected icon dimensions ${image.naturalWidth}x${image.naturalHeight}.`);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.clearRect(0, 0, 256, 256);
    context.drawImage(image, 0, 0, 256, 256);
    return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
  }, source);
  const png = Buffer.from(base64, 'base64');
  const decoded = PNG.sync.read(png);
  if (decoded.width !== 256 || decoded.height !== 256) throw new Error('Exported marketplace icon must be 256x256.');
  await writeFile(outputPath, png);
  console.log(`Exported marketplace icon: ${outputPath} (${decoded.width}x${decoded.height})`);
} finally {
  await browser?.close();
}
