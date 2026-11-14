import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
const kid = config.vars.SIGNING_KEY_ID;
if (!/^[A-Za-z0-9_-]{1,48}$/.test(kid)) throw new Error('Invalid signing key ID.');
const files = [
  ['SIGNING_KEY', join(homedir(), '.charmlet-publisher', `${kid}.jwk.json`)],
  ['EMAIL_HASH_SECRET', join(homedir(), '.charmlet-publisher', 'email-hash-secret.txt')],
];
for (const [name, path] of files) {
  const input = (await readFile(path, 'utf8')).trim();
  if (!input) throw new Error(`Missing ${name}; run the public configuration helper first.`);
  console.log(`Uploading ${name} to worker ${config.name}; the value will not be displayed.`);
  const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'secret', 'put', name, '--name', config.name], {
    cwd: root, input, stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.error || result.status !== 0) throw new Error(`Could not upload ${name}. Check your Cloudflare login and existing worker.`);
}
