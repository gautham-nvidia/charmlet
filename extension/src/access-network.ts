import config from './access-config.json';
import { MAX_ACCESS_TOKEN_LENGTH } from './access-grant';

/** No email or user content is sent. A signed activation proves which ownership record to refresh. */
export async function refreshAccessToken(token: string): Promise<string | undefined> {
	if (!config.apiOrigin) { return undefined; }
	const origin = new URL(String(config.apiOrigin));
	if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username
		|| origin.password || origin.search || origin.hash) { throw new Error('Invalid access service origin.'); }
	const response = await fetch(new URL('/v1/access/refresh', origin), {
		method: 'POST', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token }), redirect: 'error', signal: AbortSignal.timeout(10000),
	});
	if (!response.ok || !response.body) { throw new Error('Access refresh is temporarily unavailable.'); }
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) { break; }
			size += value.byteLength;
			if (size > 64 * 1024) { await reader.cancel(); throw new Error('Access response is too large.'); }
			chunks.push(value);
		}
	} finally { reader.releaseLock(); }
	const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { license?: unknown };
	if (typeof body.license !== 'string' || body.license.length > MAX_ACCESS_TOKEN_LENGTH) {
		throw new Error('Access response was not recognized.');
	}
	return body.license;
}
