import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artworkJobs } from './art-review-jobs.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(repo, 'output/imagegen/phase-4-redraw');
const jobs = await artworkJobs(repo);
const command = process.argv[2] ?? 'plan';
const requested = process.argv.slice(3);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(join(output, 'raw'), { recursive: true });
await writeFile(join(output, 'jobs.json'), `${JSON.stringify(jobs, null, 2)}\n`);
if (command === 'plan') {
  console.log(JSON.stringify({ jobs: jobs.length,
    families: Object.fromEntries([...new Set(jobs.map(job => job.family))].map(family => [family, jobs.filter(job => job.family === family).length])),
    output, networkRequests: 0 }));
} else if (command === 'generate') {
  const selected = requested.length === 1 && requested[0] === '--all' ? jobs : jobs.filter(job => requested.includes(job.key));
  if (!selected.length || (requested[0] !== '--all' && selected.length !== new Set(requested).size)) throw new Error('Specify known unique job IDs or --all.');
  const key = process.env.CHARMLET_IMAGE_API_KEY;
  const base = new URL(process.env.CHARMLET_IMAGE_BASE_URL ?? '');
  const model = process.env.CHARMLET_IMAGE_MODEL;
  if (!key || !model || base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Provide the approved HTTPS image endpoint, model and local key.');
  const endpoint = `${base.href.replace(/\/$/, '')}/images/generations`;
  let completed = 0;
  let stopped = false;
  async function generate(job) {
    const imagePath = join(output, 'raw', `${job.variant}.png`);
    const receiptPath = join(output, 'raw', `${job.variant}.json`);
    const promptHash = hash(job.prompt);
    const exists = path => access(path).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
    const preservePrompt = async () => {
      const path = join(output, 'raw', `${job.variant}.prompt.txt`);
      if (await exists(path)) {
        if (await readFile(path, 'utf8') !== job.prompt) throw new Error(`Use a new revision instead of replacing the prompt for ${job.key}.`);
      } else {
        await writeFile(path, job.prompt, { flag: 'wx' });
      }
    };
    const hasImage = await exists(imagePath);
    const hasReceipt = await exists(receiptPath);
    if (hasImage !== hasReceipt) throw new Error(`Partial saved result needs review before retrying: ${job.key}`);
    if (hasImage) {
      const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
      if (receipt.promptHash !== promptHash || receipt.model !== model || receipt.sha256 !== hash(await readFile(imagePath))) throw new Error(`Existing artwork differs from the requested job: ${job.key}`);
      await preservePrompt();
      completed++;
      console.log(JSON.stringify({ key: job.key, status: 'reused', completed, total: selected.length }));
      return;
    }
    await preservePrompt();
    const response = await fetch(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(240000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json', 'x-nv-application': 'charmlet-art-review' },
      body: JSON.stringify({ model, prompt: job.prompt, n: 1, size: '1024x1024', response_format: 'b64_json', imageConfig: { aspectRatio: '1:1', imageSize: '1K' } }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = String(body?.error?.message ?? 'Image request failed').split(key).join('[redacted]').slice(0, 900);
      throw new Error(`${job.key}: HTTP ${response.status}: ${error}`);
    }
    const encoded = body?.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || encoded.length > 24 * 1024 * 1024) {
      const summary = {
        fields: Object.keys(body ?? {}).slice(0, 12),
        results: Array.isArray(body?.data) ? body.data.length : null,
        resultFields: Object.keys(body?.data?.[0] ?? {}).slice(0, 12),
        finishReason: body?.finish_reason ?? body?.data?.[0]?.finish_reason ?? null,
        errorCode: body?.error?.code ?? null,
      };
      throw new Error(`No bounded image returned for ${job.key}: ${JSON.stringify(summary)}`);
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Expected PNG for ${job.key}.`);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (width > 4096 || height > 4096 || width < 512 || height < 512) throw new Error(`Unexpected generated dimensions for ${job.key}.`);
    await writeFile(imagePath, bytes, { flag: 'wx' });
    const receipt = { key: job.key, variant: job.variant, revision: job.revision, model, promptHash, sha256: hash(bytes), bytes: bytes.length, width, height,
      generatedAt: new Date().toISOString(), status: 'unapproved-art-review-candidate' };
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
    completed++;
    console.log(JSON.stringify({ ...receipt, completed, total: selected.length }));
  }
  for (let index = 0; index < selected.length && !stopped; index += 2) {
    const results = await Promise.allSettled(selected.slice(index, index + 2).map(generate));
    for (const result of results) if (result.status === 'rejected') {
      stopped = true;
      console.error(String(result.reason?.message ?? result.reason).split(key).join('[redacted]'));
    }
  }
  console.log(JSON.stringify({ completed, requested: selected.length, stopped, automaticRetries: 0 }));
  if (stopped) process.exitCode = 1;
} else {
  throw new Error('Use plan or generate. Generation never runs during a gallery build.');
}
