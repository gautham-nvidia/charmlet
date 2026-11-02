import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicationBlockers, requirePublicationReady, validateCandidate } from './check.mjs';

function fixture() {
  const manifest = { name: 'charmlet', publisher: 'gautham-nvidia', version: '0.5.0', pricing: 'Free',
    bugs: { url: 'https://github.com/gautham-nvidia/charmlet/issues' } };
  const files = new Map([
    ['extension/package.json', Buffer.from(JSON.stringify(manifest))],
    ['extension/readme.md', Buffer.from('Charmlet 0.5.0')],
    ['extension/changelog.md', Buffer.from('## 0.5.0 - release preparation')],
    ...['privacy.md', 'third_party_notices.md', 'artwork.md', 'dist/extension.js', 'dist/webview.js',
      'media/view.html', 'media/view.css', 'media/marketplace-icon.png'].map(name => [`extension/${name}`, Buffer.from(name)]),
  ]);
  const built = new Map([...files].filter(([name]) => name.includes('/dist/') || name.includes('/media/') || name.endsWith('/privacy.md')));
  return { manifest, packaged: structuredClone(manifest),
    identity: { Id: 'charmlet', Publisher: 'gautham-nvidia', Version: '0.5.0' }, files, built,
    catalogue: { version: '0.5.0', extensionDownload: './downloads/charmlet.vsix' },
    siteVsix: Buffer.from('same reviewed archive'), vsix: Buffer.from('same reviewed archive'), expectedVersion: '0.5.0' };
}

test('a coherent candidate records identity and checksum without making it publishable', () => {
  const data = fixture();
  const result = validateCandidate(data);
  assert.equal(result.id, 'gautham-nvidia.charmlet');
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal(publicationBlockers({ ...data, target: 'artifact' }).length, 2);
});
test('wrong version, publisher, XML identity and pricing cannot be released', () => {
  for (const change of [
    data => { data.expectedVersion = '0.5.1'; },
    data => { data.packaged.publisher = 'someone-else'; },
    data => { data.manifest.description = 'Updated listing copy'; },
    data => { data.identity.Version = '0.4.3'; },
    data => { data.manifest.pricing = 'Trial'; },
  ]) {
    const data = fixture(); change(data);
    assert.throws(() => validateCandidate(data));
  }
});
test('a stale website download or bundle fails even when metadata matches', () => {
  const data = fixture();
  data.siteVsix = Buffer.from('older archive');
  assert.throws(() => validateCandidate(data), /Website download differs/);
  data.siteVsix = data.vsix;
  data.files.set('extension/dist/webview.js', Buffer.from('older renderer'));
  assert.throws(() => validateCandidate(data), /VSIX differs from built/);
  data.files.set('extension/dist/webview.js', data.built.get('extension/dist/webview.js'));
  data.files.set('extension/privacy.md', Buffer.from('outdated disclosure'));
  assert.throws(() => validateCandidate(data), /VSIX differs from built/);
});
test('private/source files and omitted privacy notices fail the package check', () => {
  for (const name of ['extension/.env.local', 'extension/src/private.ts', 'extension/node_modules/example.js', 'extension/session/notes.md']) {
    const data = fixture(); data.files.set(name, Buffer.from('not for distribution'));
    assert.throws(() => validateCandidate(data), /Unexpected packaged file/);
  }
  const data = fixture(); data.files.delete('extension/privacy.md');
  assert.throws(() => validateCandidate(data), /Required package file/);
});
test('publication requires licence files and credentials for every selected registry', () => {
  const data = fixture();
  assert.throws(() => requirePublicationReady({ ...data, target: 'both' }), /Publication is blocked/);
  data.manifest.license = 'MIT';
  data.files.set('extension/license', Buffer.from('Fixture source licence'));
  data.files.set('extension/artwork-license.md', Buffer.from('Fixture artwork terms'));
  assert.equal(publicationBlockers({ ...data, target: 'both', environment: { VSCE_PAT: 'fixture-only' } }).length, 1);
  requirePublicationReady({ ...data, target: 'both', environment: { VSCE_PAT: 'fixture-only', OVSX_PAT: 'fixture-only' } });
  assert.throws(() => publicationBlockers({ ...data, target: 'unknown' }), /Choose artifact/);
});
