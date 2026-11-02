import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
if (!['win32', 'darwin'].includes(process.platform)) throw new Error('Desktop archives support Windows and macOS.');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const bundleName = `Charmlet-${process.platform}-${process.arch}`;
const releaseRoot = join(root, 'release', manifest.version);
if (!(await stat(join(releaseRoot, bundleName))).isDirectory()) throw new Error('Package the desktop app before archiving it.');
const distribution = join(root, 'distribution');
await mkdir(distribution, { recursive: true });
const suffix = process.platform === 'win32' ? '.zip' : '.tar.gz';
const archive = join(distribution, `Charmlet-desktop-${manifest.version}-${process.platform}-${process.arch}${suffix}`);
execFileSync('tar', [
  ...(process.platform === 'win32' ? ['-a', '-cf'] : ['-czf']),
  archive, '-C', releaseRoot, bundleName,
], { stdio: 'inherit' });

// Test the downloaded shape, not just the original packager directory. In
// particular, macOS .app executable modes and framework symlinks must survive.
const extracted = await mkdtemp(join(tmpdir(), 'charmlet-distribution-'));
try {
  execFileSync('tar', ['-xf', archive, '-C', extracted], { stdio: 'inherit' });
  execFileSync(process.execPath, [join(root, 'test', 'smoke.mjs'), '--packaged'], {
    stdio: 'inherit',
    env: { ...process.env, CHARMLET_DESKTOP_BUNDLE_ROOT: extracted },
  });
} finally {
  await rm(extracted, { recursive: true, force: true });
}
const hash = createHash('sha256');
for await (const chunk of createReadStream(archive)) hash.update(chunk);
console.log(JSON.stringify({
  archive, bytes: (await stat(archive)).size, sha256: hash.digest('hex'),
  verified: 'extracted archive launched in an owned profile',
}));
