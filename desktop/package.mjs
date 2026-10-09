import { packager } from '@electron/packager';
import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
if (process.platform !== 'win32' && process.platform !== 'darwin') {
  throw new Error(`Desktop packaging supports only win32 and darwin hosts, not ${process.platform}.`);
}
const release = join(root, 'release');
await rm(release, { recursive: true, force: true });
const paths = await packager({
  dir: root,
  name: 'Charmlet',
  appVersion: '0.1.0',
  appBundleId: 'dev.charmlet.desktop',
  platform: process.platform,
  arch: process.arch,
  out: release,
  overwrite: true,
  prune: true,
  asar: false,
  ignore: [
    /^\/src($|\/)/, /^\/test($|\/)/, /^\/test-results($|\/)/, /^\/release($|\/)/,
    /^\/node_modules($|\/)/, /^\/build\.mjs$/, /^\/package\.mjs$/, /^\/tsconfig\.json$/, /^\/package-lock\.json$/, /^\/README\.md$/,
  ],
});
console.log(`Packaged unsigned desktop beta: ${paths.join(', ')}`);
