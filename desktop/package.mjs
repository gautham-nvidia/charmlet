import { packager } from '@electron/packager';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
if (process.platform !== 'win32' && process.platform !== 'darwin') {
  throw new Error(`Desktop packaging supports only win32 and darwin hosts, not ${process.platform}.`);
}
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const release = join(root, 'release', manifest.version);
const paths = await packager({
  dir: root,
  name: 'Charmlet',
  appVersion: manifest.version,
  appBundleId: 'dev.charmlet.desktop',
  platform: process.platform,
  arch: process.arch,
  out: release,
  overwrite: false,
  prune: true,
  asar: false,
  ignore: [
    /^\/src($|\/)/, /^\/test($|\/)/, /^\/test-results($|\/)/, /^\/release($|\/)/, /^\/distribution($|\/)/,
    /^\/node_modules($|\/)/, /^\/build\.mjs$/, /^\/package\.mjs$/, /^\/archive\.mjs$/, /^\/tsconfig\.json$/, /^\/package-lock\.json$/, /^\/README\.md$/,
  ],
});
console.log(`Packaged unsigned desktop beta: ${paths.join(', ')}`);
