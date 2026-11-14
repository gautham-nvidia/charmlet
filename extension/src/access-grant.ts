export const TRIAL_SECONDS = 30 * 24 * 60 * 60;
export const MAX_ACCESS_TOKEN_LENGTH = 24000;
export const ACCESS_AUDIENCE = 'charmlet-apps';
export const TEST_ACCESS_AUDIENCE = 'charmlet-apps-test';
export type AccessKeyring = Readonly<Record<string, JsonWebKey>>;
export interface AccessGrant {
	iss: 'charmlet';
	aud: typeof ACCESS_AUDIENCE | typeof TEST_ACCESS_AUDIENCE;
	sub: string;
	kind: 'trial' | 'pro' | 'items';
	items: string[];
	iat: number;
	exp?: number;
	trialStartedAt?: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const skuPattern = /^[a-z0-9][a-z0-9:-]{0,99}$/;
const wholeTime = (value: unknown): value is number =>
	typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export function encodeAccessBytes(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) { binary += String.fromCharCode(byte); }
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
	if (!/^[A-Za-z0-9_-]+$/.test(value)) { throw new Error('Invalid access encoding.'); }
	const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
	const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
	if (encodeAccessBytes(bytes) !== value) { throw new Error('Non-canonical access encoding.'); }
	return bytes;
}

export function validAccessGrant(value: unknown): value is AccessGrant {
	if (!value || typeof value !== 'object' || Array.isArray(value)) { return false; }
	const grant = value as Partial<AccessGrant>;
	if (grant.iss !== 'charmlet' || ![ACCESS_AUDIENCE, TEST_ACCESS_AUDIENCE].includes(grant.aud ?? '')
		|| typeof grant.sub !== 'string' || !/^[a-f0-9]{64}$/.test(grant.sub)
		|| !['trial', 'pro', 'items'].includes(grant.kind ?? '') || !wholeTime(grant.iat)
		|| !Array.isArray(grant.items) || grant.items.length > 512
		|| grant.items.some(item => typeof item !== 'string' || !skuPattern.test(item))
		|| new Set(grant.items).size !== grant.items.length) { return false; }
	if (grant.kind !== 'trial') { return grant.exp === undefined && grant.trialStartedAt === undefined; }
	return wholeTime(grant.exp) && wholeTime(grant.trialStartedAt)
		&& grant.trialStartedAt <= grant.iat && grant.iat < grant.exp
		&& grant.exp - grant.trialStartedAt === TRIAL_SECONDS;
}

/** A signed expired trial remains readable for status, but currentAccess rejects its access. */
export async function verifyAccessGrant(
	token: unknown, keys: AccessKeyring,
	{ engine = crypto, audience = ACCESS_AUDIENCE }: { engine?: Crypto; audience?: AccessGrant['aud'] } = {},
): Promise<AccessGrant | undefined> {
	if (typeof token !== 'string' || token.length > MAX_ACCESS_TOKEN_LENGTH) { return undefined; }
	try {
		const parts = token.split('.');
		if (parts.length !== 3) { return undefined; }
		const header = JSON.parse(decoder.decode(decodeBytes(parts[0])));
		if (!header || header.alg !== 'EdDSA' || header.typ !== 'JWT'
			|| typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,48}$/.test(header.kid)
			|| Object.keys(header).some(name => !['alg', 'typ', 'kid'].includes(name))
			|| !Object.hasOwn(keys, header.kid)) { return undefined; }
		const jwk = keys[header.kid];
		if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || 'd' in jwk) { return undefined; }
		const signature = decodeBytes(parts[2]);
		if (signature.length !== 64) { return undefined; }
		const key = await engine.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
		if (!await engine.subtle.verify('Ed25519', key, signature, encoder.encode(`${parts[0]}.${parts[1]}`))) {
			return undefined;
		}
		const grant: unknown = JSON.parse(decoder.decode(decodeBytes(parts[1])));
		return validAccessGrant(grant) && grant.aud === audience ? grant : undefined;
	} catch { return undefined; }
}

/** Called only by the service with its private signing key. No private key is shipped in either app. */
export async function signAccessGrant(grant: AccessGrant, key: CryptoKey, kid: string): Promise<string> {
	if (!validAccessGrant(grant) || !/^[A-Za-z0-9_-]{1,48}$/.test(kid)) {
		throw new Error('Cannot sign an invalid access grant.');
	}
	const header = encodeAccessBytes(encoder.encode(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid })));
	const payload = encodeAccessBytes(encoder.encode(JSON.stringify(grant)));
	const message = `${header}.${payload}`;
	const signature = await crypto.subtle.sign('Ed25519', key, encoder.encode(message));
	return `${message}.${encodeAccessBytes(new Uint8Array(signature))}`;
}

/** Local clock rollback never extends a trial. Paid, permanent grants do not need a clock lease. */
export function currentAccess(grant: AccessGrant | undefined, nowMs: number, lastSeenMs = 0): boolean {
	if (!grant || !Number.isFinite(nowMs)) { return false; }
	if (grant.kind !== 'trial') { return true; }
	return nowMs >= lastSeenMs - 5 * 60000 && nowMs / 1000 >= grant.iat - 300 && nowMs / 1000 < grant.exp!;
}
