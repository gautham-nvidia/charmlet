import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { securityHeaders } from '../website/security-headers.mjs';

const root = dirname(fileURLToPath(import.meta.url)), repo = join(root, '..');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const saveJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const accessPath = join(repo, 'extension/src/access-config.json');
const commercePath = join(repo, 'website/commerce.json');
const configPath = join(root, 'wrangler.jsonc');
const access = await readJson(accessPath), commerce = await readJson(commercePath), worker = await readJson(configPath);
const validOrigin = value => {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Enter an HTTPS origin without a path, query or credentials.');
  }
  return url.origin;
};
const email = value => {
  if (!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) throw new Error('Enter a valid public email address.');
  return value;
};

if (process.argv.includes('--check')) {
  const missing = [];
  if (!access.apiOrigin || !access.websiteOrigin) missing.push('Public website and API origins');
  if (!commerce.contactEmail) missing.push('Public support email');
  if (!commerce.turnstileSiteKey) missing.push('Public Turnstile site key');
  if (!access.publicKeys[worker.vars.SIGNING_KEY_ID]) missing.push('Matching public signing key in the apps');
  if (!worker.vars.MAIL_FROM || worker.vars.WEB_ORIGIN !== access.websiteOrigin) missing.push('Verified sender and matching website origin');
  if (!worker.d1_databases[0].database_id || worker.d1_databases[0].database_id === '00000000-0000-0000-0000-000000000000') {
    missing.push('Real D1 database binding');
  }
  if (process.argv.includes('--live')) {
    if (worker.vars.TEST_MODE !== 'false' || worker.vars.CHECKOUT_ENABLED !== 'true' || !commerce.salesEnabled) {
      missing.push('Live mode and explicit checkout switches after end-to-end verification');
    }
    for (const field of ['LEMON_STORE_ID', 'LEMON_PRO_VARIANT_ID', 'LEMON_CART_VARIANT_ID']) {
      if (!/^[1-9]\d*$/.test(worker.vars[field] ?? '')) missing.push(field);
    }
  }
  console.log(missing.length ? `Not configured yet:\n${missing.map(item => `- ${item}`).join('\n')}` : 'Public configuration is consistent. Provider secrets and real delivery still need live verification.');
  process.exitCode = missing.length ? 1 : 0;
} else {
  if (!process.stdin.isTTY) throw new Error('Run this setup in your own terminal. It asks for public settings only, never account passwords.');
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (label, fallback, validate = value => value) => {
    for (;;) {
      const answer = (await terminal.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)).trim() || fallback;
      try { return validate(answer); } catch (error) { console.log(error.message); }
    }
  };
  try {
    console.log('Charmlet public configuration. Finish Cloudflare project/bucket/database and sender setup first.');
    const websiteOrigin = await ask('Website HTTPS origin', access.websiteOrigin, validOrigin);
    const apiOrigin = await ask('Worker HTTPS origin', access.apiOrigin, validOrigin);
    const contactEmail = await ask('Public support email', commerce.contactEmail, email);
    const sender = await ask('Sender email verified in Brevo', worker.vars.MAIL_FROM, email);
    const siteKey = await ask('Public Turnstile site key', commerce.turnstileSiteKey, value => {
      if (!/^[a-z0-9_-]{10,100}$/i.test(value ?? '')) throw new Error('Enter the site key, not its secret.');
      return value;
    });
    const databaseId = await ask('D1 database ID returned by Cloudflare', undefined, value => {
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value ?? '')
        || value === '00000000-0000-0000-0000-000000000000') throw new Error('Enter the real database UUID.');
      return value;
    });
    const kid = worker.vars.SIGNING_KEY_ID;
    if (!/^[A-Za-z0-9_-]{1,48}$/.test(kid)) throw new Error('Choose a safe signing key ID in wrangler.jsonc first.');
    // The user-profile vault is outside the repository. No private value is written to public configuration.
    const vault = join(homedir(), '.charmlet-publisher');
    await mkdir(vault, { recursive: true, mode: 0o700 });
    const keyPath = join(vault, `${kid}.jwk.json`);
    const pepperPath = join(vault, 'email-hash-secret.txt');
    let privateKey = await readJson(keyPath).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    const pepper = await readFile(pepperPath, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (Object.keys(access.publicKeys).length && !pepper) {
      throw new Error('Restore the existing publisher vault backup. Replacing the email hash secret would disconnect trial and purchase records.');
    }
    if (access.publicKeys[kid] && !privateKey) {
      throw new Error('Restore the existing private activation key before reconfiguring this signing key ID.');
    }
    if (!privateKey) {
      const pair = generateKeyPairSync('ed25519');
      privateKey = pair.privateKey.export({ format: 'jwk' });
      await writeFile(keyPath, `${JSON.stringify(privateKey)}\n`, { flag: 'wx', mode: 0o600 });
    }
    if (privateKey.kty !== 'OKP' || privateKey.crv !== 'Ed25519' || !privateKey.d || !privateKey.x) {
      throw new Error('The existing publisher key is not recognized. Preserve it and inspect the configuration.');
    }
    if (access.publicKeys[kid] && access.publicKeys[kid].x !== privateKey.x) {
      throw new Error('The vault and configured public activation key do not match. Preserve both and restore the correct backup.');
    }
    if (pepper !== null && !/^[a-f0-9]{64}$/.test(pepper.trim())) {
      throw new Error('The existing email hash secret is not recognized. Restore its backup; do not replace it.');
    }
    if (pepper === null) await writeFile(pepperPath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
    await saveJson(accessPath, {
      apiOrigin, websiteOrigin,
      publicKeys: { ...access.publicKeys, [kid]: { kty: 'OKP', crv: 'Ed25519', x: privateKey.x, ext: true } },
    });
    await saveJson(commercePath, { ...commerce, contactEmail, turnstileSiteKey: siteKey, salesEnabled: false });
    worker.vars = { ...worker.vars, WEB_ORIGIN: websiteOrigin, MAIL_FROM: sender, TEST_MODE: 'true', CHECKOUT_ENABLED: 'false' };
    worker.d1_databases[0].database_id = databaseId;
    await saveJson(configPath, worker);
    const vercelPath = join(repo, 'vercel.json'), vercel = await readJson(vercelPath);
    const headers = vercel.headers.find(rule => rule.source === '/(.*)').headers;
    for (const [name, value] of Object.entries(securityHeaders(apiOrigin))) {
      const entry = headers.find(item => item.key.toLowerCase() === name.toLowerCase());
      if (entry) entry.value = value;
      else headers.push({ key: name, value });
    }
    await saveJson(vercelPath, vercel);
    console.log(`Public configuration saved. Private publisher material stays in ${vault}.`);
    console.log('Back up that private directory securely. Do not paste its contents into chat or Git.');
    console.log('Next: rebuild/test the apps with this public key, stage approved installers, and follow service/README.md.');
    console.log('Checkout remains off and the worker remains in test mode.');
  } finally { terminal.close(); }
}
