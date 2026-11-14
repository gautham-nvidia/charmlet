import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, type FileHandle } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { CharmState } from './charm-state';

async function replaceStateFile(source: string, destination: string): Promise<void> {
	for (let attempt = 0; ; attempt++) {
		try {
			await rename(source, destination);
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? '') || attempt >= 5) {
				throw error;
			}
			// Windows can briefly deny replacing an open file. Keep the old file
			// intact and bound the wait so persistent permission errors still surface.
			await delay(25 * 2 ** attempt);
		}
	}
}

export interface LoadedState {
	value: unknown;
	source: 'file' | 'legacy';
	error?: unknown;
}

export class StateStore<Value = CharmState> {
	readonly path: string;

	constructor(private readonly directory: string, private readonly filename: 'preferences.json' | 'companion.json' = 'preferences.json') {
		if (filename !== 'preferences.json' && filename !== 'companion.json') { throw new Error('Unsupported state filename.'); }
		this.path = join(directory, filename);
	}

	async read(): Promise<unknown> {
		return JSON.parse(await readFile(this.path, 'utf8'));
	}

	async load(legacy: unknown): Promise<LoadedState> {
		try {
			return { value: await this.read(), source: 'file' };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return { value: legacy, source: 'legacy' };
			}
			return { value: legacy, source: 'legacy', error };
		}
	}

	async write(value: Value): Promise<void> {
		await mkdir(this.directory, { recursive: true });
		const temporary = join(this.directory, `.${this.filename.slice(0, -5)}-${randomUUID()}.tmp`);
		let handle: FileHandle | undefined;
		try {
			handle = await open(temporary, 'wx', 0o600);
			await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
			await handle.sync();
			await handle.close();
			handle = undefined;
			await replaceStateFile(temporary, this.path);
		} finally {
			await handle?.close().catch(() => undefined);
			await rm(temporary, { force: true }).catch(() => undefined);
		}
	}
}
