import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
// Use the locked packager's own VSIX/XML reader instead of a second ZIP parser.
const { readVSIXPackage, readZip } = require('@vscode/vsce/out/zip.js');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const targets = ['artifact', 'marketplace', 'open-vsx', 'both'];
const requiredFiles = [
  'extension/package.json', 'extension/readme.md', 'extension/changelog.md',
  'extension/privacy.md', 'extension/third_party_notices.md', 'extension/artwork.md',
  'extension/dist/extension.js', 'extension/dist/webview.js',
  'extension/media/view.html', 'extension/media/view.css', 'extension/media/marketplace-icon.png',
];
const permitted = /^(?:extension\.vsixmanifest|\[content_types\]\.xml|extension\/(?:package\.json|readme\.md|changelog\.md|privacy\.md|third_party_notices\.md|artwork\.md|artwork-license\.md|licen[cs]e(?:\.txt|\.md)?|dist\/(?:extension|webview)\.js|media\/[a-z0-9-]+\.(?:svg|png|html|css)))$/;

export function validateCandidate({ manifest, packaged, identity, files, built, catalogue, siteVsix, vsix, expectedVersion }) {
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Release version must be a stable three-part version.');
  if (expectedVersion) assert.equal(manifest.version, expectedVersion, 'Requested version differs from source.');
  assert.equal(manifest.name, 'charmlet');
  assert.equal(manifest.publisher, 'gautham-nvidia');
  assert.equal(manifest.pricing, 'Free', 'Core extension must remain free.');
  assert.equal(manifest.bugs?.url, 'https://github.com/gautham-nvidia/charmlet/issues', 'Support route is missing.');
  for (const key of ['name', 'publisher', 'version', 'pricing', 'license', 'description', 'homepage', 'bugs', 'keywords', 'categories', 'engines', 'icon', 'main', 'capabilities', 'contributes', 'dependencies']) {
    assert.deepEqual(packaged[key], manifest[key], `VSIX ${key} differs from source.`);
  }
  assert.deepEqual({ id: identity.Id, publisher: identity.Publisher, version: identity.Version },
    { id: manifest.name, publisher: manifest.publisher, version: manifest.version }, 'VSIX XML identity differs from source.');
  for (const name of files.keys()) assert.match(name, permitted, `Unexpected packaged file: ${name}`);
  for (const name of requiredFiles) assert.ok(files.get(name)?.length, `Required package file is missing: ${name}`);
  assert.ok(files.get('extension/changelog.md').toString('utf8').includes(`## ${manifest.version} `), 'Changelog does not describe this version.');
  assert.ok(files.get('extension/readme.md').toString('utf8').includes(manifest.version), 'Listing README has a stale version.');
  for (const [name, bytes] of built) assert.ok(files.get(name)?.equals(bytes), `VSIX differs from built file: ${name}`);
  assert.equal(catalogue.version, manifest.version, 'Website catalogue has a stale version.');
  if (catalogue.extensionDownload === './download.html') {
    assert.equal(siteVsix, null, 'The public website must not contain an installer that bypasses email verification.');
  } else {
    assert.equal(catalogue.extensionDownload, './downloads/charmlet.vsix');
    assert.ok(siteVsix?.equals(vsix), 'Website download differs from the reviewed VSIX.');
  }
  return { id: `${manifest.publisher}.${manifest.name}`, version: manifest.version, bytes: vsix.length, sha256: sha256(vsix), packagedFiles: files.size };
}

export function publicationBlockers({ manifest, files, target, environment = {} }) {
  assert.ok(targets.includes(target), 'Choose artifact, marketplace, open-vsx or both.');
  const blockers = [];
  if (!manifest.license || manifest.license === 'UNLICENSED'
    || ![...files.keys()].some(name => /^extension\/licen[cs]e(?:\.txt|\.md)?$/.test(name))) {
    blockers.push('Choose the source licence, add extension/LICENSE and set package.json license.');
  }
  if (!files.get('extension/artwork-license.md')?.length) {
    blockers.push('Approve the bundled artwork terms and add extension/ARTWORK-LICENSE.md.');
  }
  if (['marketplace', 'both'].includes(target) && !environment.VSCE_PAT?.trim()) {
    blockers.push('Configure VSCE_PAT for the owned gautham-nvidia Marketplace publisher.');
  }
  if (['open-vsx', 'both'].includes(target) && !environment.OVSX_PAT?.trim()) {
    blockers.push('Configure OVSX_PAT for the owned gautham-nvidia Open VSX namespace.');
  }
  return blockers;
}

export function requirePublicationReady(options) {
  const blockers = publicationBlockers(options);
  assert.equal(blockers.length, 0, `Publication is blocked:\n${blockers.join('\n')}`);
}

export async function checkRelease({ root = repo, target = 'artifact', expectedVersion, strict = false, environment = process.env } = {}) {
  const extension = join(root, 'extension');
  const manifest = JSON.parse(await readFile(join(extension, 'package.json'), 'utf8'));
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  const packagePath = join(extension, `charmlet-${manifest.version}.vsix`);
  const [{ manifest: packaged, xmlManifest }, files, vsix, catalogue, siteVsix] = await Promise.all([
    readVSIXPackage(packagePath), readZip(packagePath, () => true), readFile(packagePath),
    readFile(join(root, 'website/dist/catalogue.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'website/dist/downloads/charmlet.vsix')).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    }),
  ]);
  const built = new Map();
  for (const name of ['PRIVACY.md', 'ARTWORK.md', 'THIRD_PARTY_NOTICES.md']) {
    built.set(`extension/${name.toLowerCase()}`, await readFile(join(extension, name)));
  }
  for (const name of files.keys()) {
    if (name.startsWith('extension/dist/') || name.startsWith('extension/media/')) {
      built.set(name, await readFile(join(root, name)));
    }
  }
  const candidate = validateCandidate({
    manifest, packaged, identity: xmlManifest.PackageManifest.Metadata[0].Identity[0].$,
    files, built, catalogue, siteVsix, vsix, expectedVersion,
  });
  const options = { manifest, files, target, environment };
  const blockers = publicationBlockers(options);
  const result = {
    ...candidate,
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    target, publicationReady: target !== 'artifact' && blockers.length === 0, publicationBlockers: blockers,
    note: 'Package checks do not prove namespace ownership, artwork approval or a live store listing.',
  };
  await mkdir(join(root, 'release/dist'), { recursive: true });
  await writeFile(join(root, 'release/dist/release.json'), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(join(root, 'release/dist/SHA256SUMS'), `${result.sha256}  charmlet-${manifest.version}.vsix\n`);
  if (strict) {
    assert.equal(result.sourceDirty, false, 'Commit the reviewed release source before publication.');
    requirePublicationReady(options);
  }
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const unexpected = process.argv.slice(2).filter(argument => argument !== '--strict');
  if (unexpected.length) throw new Error('Only --strict is supported. Set CHARMLET_RELEASE_VERSION / CHARMLET_RELEASE_TARGET for a release.');
  console.log(JSON.stringify(await checkRelease({
    target: process.env.CHARMLET_RELEASE_TARGET || 'artifact',
    expectedVersion: process.env.CHARMLET_RELEASE_VERSION,
    strict: process.argv.includes('--strict'),
  }), null, 2));
}
