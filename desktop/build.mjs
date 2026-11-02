import { build } from '../extension/node_modules/esbuild/lib/main.js';
import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..');
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const sharedNode = {
  bundle: true, platform: 'node', format: 'cjs', target: 'node20', external: ['electron'], sourcemap: false,
};
await Promise.all([
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'main.ts')], outfile: join(dist, 'main.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'preload.ts')], outfile: join(dist, 'preload.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'window-placement.ts')], outfile: join(dist, 'window-placement.cjs') }),
  build({ ...sharedNode, entryPoints: [join(root, 'src', 'power-behavior.ts')], outfile: join(dist, 'power-behavior.cjs') }),
  build({ entryPoints: [join(root, 'src', 'overlay.ts')], bundle: true, platform: 'browser', format: 'iife', target: 'es2022', outfile: join(dist, 'overlay.js'), sourcemap: false }),
  build({ entryPoints: [join(repo, 'extension', 'src', 'webview.ts')], bundle: true, platform: 'browser', format: 'iife', target: 'es2022', outfile: join(dist, 'renderer.js'), sourcemap: false }),
]);
await cp(join(repo, 'extension', 'media'), join(dist, 'media'), { recursive: true });
await copyFile(join(repo, 'extension', 'media', 'view.html'), join(dist, 'view.html'));
await copyFile(join(repo, 'extension', 'media', 'view.css'), join(dist, 'view.css'));
await copyFile(join(root, 'src', 'desktop.css'), join(dist, 'desktop.css'));
await copyFile(join(repo, 'extension', 'THIRD_PARTY_NOTICES.md'), join(dist, 'THIRD_PARTY_NOTICES.md'));
await copyFile(join(repo, 'extension', 'ARTWORK.md'), join(dist, 'ARTWORK.md'));
await copyFile(join(root, 'README.md'), join(dist, 'DESKTOP_BETA.md'));
console.log('Built Charmlet desktop beta.');
