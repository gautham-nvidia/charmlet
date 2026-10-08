import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, type FileHandle } from 'node:fs/promises';
import { join } from 'node:path';
import type { CharmState } from './charm-state';

export interface LoadedState {
	value: unknown;
	source: 'file' | 'legacy';
	error?: unknown;
}

export class StateStore {
	readonly path: string;

	constructor(private readonly directory: string) {
		this.path = join(directory, 'preferences.json');
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

	async write(value: CharmState): Promise<void> {
		await mkdir(this.directory, { recursive: true });
		const temporary = join(this.directory, `.preferences-${randomUUID()}.tmp`);
		let handle: FileHandle | undefined;
		try {
			handle = await open(temporary, 'wx', 0o600);
			await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
			await handle.sync();
			await handle.close();
			handle = undefined;
			await rename(temporary, this.path);
		} finally {
			await handle?.close().catch(() => undefined);
			await rm(temporary, { force: true }).catch(() => undefined);
		}
	}
}
