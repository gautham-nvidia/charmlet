import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url)), repo = join(root, '..');
const require = createRequire(join(repo, 'extension/package.json'));

export async function buildCommerceCatalogue({ privateAssets = false } = {}) {
  const { CHARMS } = require('./out/charm-catalog.js');
  const { starterSelection, freeDownloadSelection, charmPriceCents } = require('./out/catalogue-access.js');
  const { charmCollection } = require('./out/charm-collections.js');
  const { parseCharmPack } = require('./out/charm-packs.js');
  const settings = JSON.parse(await readFile(join(repo, 'website/commerce.json'), 'utf8'));
  const access = JSON.parse(await readFile(join(repo, 'extension/src/access-config.json'), 'utf8'));
  const starter = new Set(starterSelection()), free = new Set(freeDownloadSelection());
  if (!settings || Object.keys(settings).some(key => !['contactEmail', 'turnstileSiteKey', 'proPriceCents', 'salesEnabled'].includes(key))
    || ![749, 1749].includes(settings.proPriceCents) || typeof settings.salesEnabled !== 'boolean') {
    throw new Error('Commerce settings accept only public contact, challenge key, approved Pro price and sales flag.');
  }
  if (settings.contactEmail !== null && (typeof settings.contactEmail !== 'string'
    || !/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(settings.contactEmail))) throw new Error('Invalid public contact address.');
  if (settings.turnstileSiteKey !== null && (typeof settings.turnstileSiteKey !== 'string'
    || !/^[a-zA-Z0-9_-]{10,100}$/.test(settings.turnstileSiteKey))) throw new Error('Invalid public challenge key.');
  if (access.apiOrigin !== null) {
    const url = new URL(access.apiOrigin);
    if (url.protocol !== 'https:' || url.origin !== access.apiOrigin || url.username || url.password) {
      throw new Error('Use a public HTTPS API origin, without a path, query, credentials or trailing slash.');
    }
  }
  const privateDirectory = join(root, 'private-assets');
  if (privateAssets) await mkdir(join(privateDirectory, 'packs'), { recursive: true });
  const products = [];
  for (const charm of CHARMS) {
    const collection = charmCollection(charm), slug = charm.id.replaceAll(':', '-');
    const review = ['Music Icons', 'Sports Icons'].includes(collection);
    const proOnly = collection === 'Sports Icons';
    const product = {
      sku: charm.id, name: charm.name, description: charm.description, collection, kind: 'item',
      priceCents: proOnly ? 0 : charmPriceCents(charm), proOnly, items: [charm.id], starter: starter.has(charm.id),
      freeDownload: free.has(charm.id), available: !review, review,
      delivery: charm.file.endsWith('.png') && !charm.id.startsWith('live:') ? 'pack' : 'activation',
      preview: `./assets/default/${charm.file}`,
    };
    if (product.delivery === 'pack') {
      const filename = `${slug}.charmlet.json`;
      product.objectKey = `packs/${filename}`;
      product.filename = filename;
      if (privateAssets && product.available) {
        const bytes = await readFile(join(repo, 'extension/media', charm.file));
        const pack = parseCharmPack(JSON.stringify({
          format: 'charmlet-pack', version: 1, id: slug, name: charm.name, author: 'Charmlet',
          charms: [{ id: slug, name: charm.name, group: charm.group, description: charm.description,
            accent: charm.accent, png: bytes.toString('base64') }],
        }));
        await writeFile(join(privateDirectory, product.objectKey), `${JSON.stringify(pack)}\n`);
      }
    }
    products.push(product);
  }
  products.push({
    sku: 'pro', name: 'Charmlet Pro', kind: 'pro', priceCents: settings.proPriceCents,
    regularPriceCents: 1749, items: [], available: true, delivery: 'activation',
    description: 'The complete in-app collection across VS Code, Windows desktop and Mac desktop. One purchase.',
  });
  const extension = JSON.parse(await readFile(join(repo, 'extension/package.json'), 'utf8'));
  const desktop = JSON.parse(await readFile(join(repo, 'desktop/package.json'), 'utf8'));
  const staged = privateAssets ? null : await readFile(join(root, 'catalogue.json'), 'utf8').then(JSON.parse, error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const releases = [
    { sku: 'app-vscode', name: 'VS Code extension', source: join(repo, 'extension', `charmlet-${extension.version}.vsix`),
      filename: `charmlet-${extension.version}.vsix` },
    { sku: 'app-windows', name: 'Windows desktop (x64)', source: join(repo, 'desktop/distribution', `Charmlet-desktop-${desktop.version}-win32-x64.zip`),
      filename: `Charmlet-desktop-${desktop.version}-win32-x64.zip` },
    { sku: 'app-macos', name: 'Mac desktop (Apple silicon)', source: join(repo, 'desktop/distribution', `Charmlet-desktop-${desktop.version}-darwin-arm64.tar.gz`),
      filename: `Charmlet-desktop-${desktop.version}-darwin-arm64.tar.gz` },
  ];
  for (const release of releases) {
    const product = { sku: release.sku, name: release.name, kind: 'installer', priceCents: 0, items: [],
      available: false, delivery: 'installer', filename: release.filename, objectKey: `apps/${release.filename}` };
    if (privateAssets) {
      const bytes = await readFile(release.source).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (!bytes) {
        product.available = false;
        console.log(`Not staged: ${release.name}; build and validate its archive before enabling this download.`);
      } else {
        product.available = true;
        await mkdir(join(privateDirectory, 'apps'), { recursive: true });
        await writeFile(join(privateDirectory, product.objectKey), bytes);
        product.sha256 = createHash('sha256').update(bytes).digest('hex');
        product.bytes = bytes.length;
      }
    } else if (staged?.version === extension.version && staged?.desktopVersion === desktop.version) {
      const published = staged.products.find(item => item.sku === release.sku && item.filename === release.filename);
      if (published?.available && /^[a-f0-9]{64}$/.test(published.sha256)
        && Number.isSafeInteger(published.bytes) && published.bytes > 0) {
        Object.assign(product, { available: true, sha256: published.sha256, bytes: published.bytes });
      }
    }
    products.push(product);
  }
  const catalogue = { currency: 'USD', version: extension.version, desktopVersion: desktop.version, products };
  const publicData = {
    version: extension.version, currency: 'USD', starterCount: starter.size,
    freeDownloadCount: free.size, apiOrigin: access.apiOrigin, ...settings,
    products: products.map(({ objectKey, ...product }) => product),
  };
  return { catalogue, publicData };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { catalogue } = await buildCommerceCatalogue({ privateAssets: process.argv.includes('--assets') });
  await writeFile(join(root, 'catalogue.json'), `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`Built ${catalogue.products.length} server-controlled products. Private assets stay outside website/dist.`);
}
