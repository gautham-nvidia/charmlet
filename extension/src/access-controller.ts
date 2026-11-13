import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { StateStore } from './state-store';
import { accessibleCatalogue } from './catalogue-access';
import { currentAccess, MAX_ACCESS_TOKEN_LENGTH, verifyAccessGrant, type AccessGrant, type AccessKeyring } from './access-grant';
import type { CharmDefinition } from './charm-catalog';
import betaCatalogue from './beta-catalogue.json';
import config from './access-config.json';
import { refreshAccessToken } from './access-network';

interface SecretStore {
	get(): Promise<string | undefined>;
	set(value: string): Promise<void>;
}
interface AccessRecord { version: 1; betaLegacy: boolean; lastSeenAt: number }
interface AccessOptions { directory: string; secrets: SecretStore; keys?: AccessKeyring; now?: () => number }
interface StoredGrant { token: string; grant: AccessGrant }

export interface AccessSnapshot {
	label: string;
	detail: string;
	canActivate: boolean;
	canBrowse: boolean;
}

/** Signed grants stay in host secure storage; the renderer receives only the permitted catalogue and status. */
export class AccessController {
	private readonly store: StateStore<AccessRecord>;
	private readonly keys: AccessKeyring;
	private readonly now: () => number;
	private record: AccessRecord;
	private grants: StoredGrant[] = [];
	private readOnly = false;
	private timer?: ReturnType<typeof setTimeout>;
	private lastRefreshAt = 0;
	notice?: string;

	constructor(private readonly options: AccessOptions) {
		this.store = new StateStore(join(options.directory, 'access'));
		this.keys = options.keys ?? config.publicKeys;
		this.now = options.now ?? Date.now;
		this.record = { version: 1, betaLegacy: false, lastSeenAt: this.now() };
	}

	async initialize(previousPreferences: unknown): Promise<void> {
		const saved = await this.store.load(undefined);
		const record = saved.value as Partial<AccessRecord> | undefined;
		if (saved.error || saved.value !== undefined && (record?.version !== 1
			|| typeof record.betaLegacy !== 'boolean' || !Number.isFinite(record.lastSeenAt))) {
			this.readOnly = true;
			this.notice = 'Saved access settings could not be read. Your free starter and personal packs remain available.';
		} else if (record) {
			this.record = { version: 1, betaLegacy: record.betaLegacy === true,
				lastSeenAt: Math.max(this.now(), record.lastSeenAt ?? 0) };
		} else {
			const previous = previousPreferences as { version?: unknown; editionVersion?: unknown } | undefined;
			// Pre-access beta preferences are grandfathered once. New installs write editionVersion immediately.
			this.record.betaLegacy = previous?.version === 1 && previous.editionVersion === undefined;
		}
		try {
			const value = await this.options.secrets.get();
			if (value && value.length <= MAX_ACCESS_TOKEN_LENGTH * 8 + 100) {
				const tokens: unknown = JSON.parse(value);
				if (Array.isArray(tokens) && tokens.length <= 8) {
					for (const token of tokens) {
						const grant = await verifyAccessGrant(token, this.keys, { engine: webcrypto as Crypto });
						if (grant) { this.grants.push({ token, grant }); }
					}
				}
			}
		} catch { this.notice = 'Saved activation could not be opened. Import your access file again to restore it.'; }
		if (!this.readOnly) { await this.store.write(this.record); }
	}

	catalogue(all: readonly CharmDefinition[]): CharmDefinition[] {
		const legacyIds = this.record.betaLegacy ? betaCatalogue : [];
		const allowed = new Set(accessibleCatalogue(all, { legacyIds }).map(charm => charm.id));
		for (const { grant } of this.grants) {
			for (const charm of accessibleCatalogue(all, { grant, lastSeenMs: this.record.lastSeenAt }, this.now())) {
				allowed.add(charm.id);
			}
		}
		return all.filter(charm => allowed.has(charm.id));
	}

	get snapshot(): AccessSnapshot {
		const pro = this.grants.some(({ grant }) => grant.kind === 'pro');
		const trial = this.grants.find(({ grant }) => grant.kind === 'trial'
			&& currentAccess(grant, this.now(), this.record.lastSeenAt))?.grant;
		const owned = this.grants.some(({ grant }) => grant.items.length > 0);
		const expired = this.grants.some(({ grant }) => grant.kind === 'trial');
		return {
			label: pro ? 'Charmlet Pro' : trial ? 'Pro trial' : this.record.betaLegacy ? 'Beta collection'
				: owned ? 'Free + your items' : 'Free starter',
			detail: pro ? 'All in-app charms. One permanent purchase for your current apps.'
				: trial ? `Full access until ${new Date(trial.exp! * 1000).toLocaleDateString()}.`
					: this.record.betaLegacy ? 'Your existing beta collection is retained.'
						: expired ? 'Your trial has ended. Free charms, purchases, photos and progress remain.'
							: 'Choose a starter companion. Your photos, garden and imported packs stay yours.',
			canActivate: Object.keys(this.keys).length > 0,
			canBrowse: this.website() !== undefined,
		};
	}

	website(): string | undefined {
		try {
			const url = new URL(String(config.websiteOrigin));
			if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/'
				&& !url.search && !url.hash) { return new URL('/charms.html', url).href; }
		} catch { /* The public website is not configured in a review build. */ }
		return undefined;
	}

	/** Returns false for normal image packs so both kinds can use the existing explicit Import action. */
	async importDocument(bytes: Uint8Array): Promise<boolean> {
		if (bytes.byteLength > MAX_ACCESS_TOKEN_LENGTH + 1024) { return false; }
		let document: unknown;
		try { document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
		catch { return false; }
		const value = document as { format?: unknown; version?: unknown; token?: unknown } | null;
		if (value?.format !== 'charmlet-access') { return false; }
		if (this.readOnly) { throw new Error('Repair the saved access settings before importing an activation file.'); }
		if (value.version !== 1) { throw new Error('This access file version is not supported.'); }
		const grant = await verifyAccessGrant(value.token, this.keys, { engine: webcrypto as Crypto });
		if (!grant) { throw new Error('This access file is invalid or is not recognized by this build.'); }
		const existing = this.grants.find(item => item.grant.sub === grant.sub);
		if (existing && (existing.grant.iat > grant.iat
			|| existing.grant.iat === grant.iat && existing.grant.kind === 'pro' && grant.kind !== 'pro')) {
			throw new Error('This file is older than your current access. Keep the current activation.');
		}
		const next = [...this.grants.filter(item => item.grant.sub !== grant.sub), { token: value.token as string, grant }];
		if (next.length > 8) { throw new Error('This device already has access for eight email addresses.'); }
		await this.options.secrets.set(JSON.stringify(next.map(item => item.token)));
		this.grants = next;
		if (grant.kind === 'trial' && (!existing || grant.iat > existing.grant.iat)) {
			// A freshly signed server timestamp can recover from an accidentally advanced local clock.
			this.record.lastSeenAt = Math.max(grant.iat * 1000, this.now());
		}
		await this.observeClock();
		return true;
	}

	async observeClock(): Promise<void> {
		if (this.readOnly) { return; }
		this.record.lastSeenAt = Math.max(this.record.lastSeenAt, this.now());
		await this.store.write(this.record);
	}

	private async refreshOnline(): Promise<void> {
		if (this.readOnly || !this.grants.length || this.now() - this.lastRefreshAt < 6 * 60 * 60000) { return; }
		this.lastRefreshAt = this.now();
		for (const existing of [...this.grants]) {
			try {
				const token = await refreshAccessToken(existing.token);
				if (!token) { continue; }
				const grant = await verifyAccessGrant(token, this.keys, { engine: webcrypto as Crypto });
				if (!grant || grant.sub !== existing.grant.sub || grant.iat <= existing.grant.iat) { continue; }
				await this.importDocument(Buffer.from(JSON.stringify({ format: 'charmlet-access', version: 1, token })));
			} catch {
				// Offline use retains the last signed grant; trial expiry is still enforced locally.
				console.warn('Charmlet could not refresh online access; using its last signed activation.');
			}
		}
	}

	watch(changed: () => Promise<void>, failed: () => void): void {
		const schedule = () => {
			const next = this.grants.map(item => (item.grant.exp ?? 0) * 1000)
				.filter(expiry => expiry > this.now()).sort((a, b) => a - b)[0];
			this.timer = setTimeout(async () => {
				try {
					if (this.grants.some(item => item.grant.kind === 'trial')) { await this.observeClock(); }
				} catch { failed(); }
				try { await changed(); } catch { failed(); }
				await this.refreshOnline();
				try { await changed(); } catch { failed(); }
				if (this.timer) { schedule(); }
			}, Math.min(60000, Math.max(1, next ? next - this.now() : 60000)));
			this.timer.unref();
		};
		if (this.timer) { clearTimeout(this.timer); }
		schedule();
	}

	dispose(): void {
		if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
	}
}
