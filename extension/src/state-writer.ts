export class StateWriter<State> {
	private tail: Promise<void> = Promise.resolve();

	constructor(
		private readonly write: (value: State) => PromiseLike<void>,
		private readonly read: () => unknown,
		private readonly matches: (expected: State, actual: unknown) => boolean,
	) {}

	save(value: State): Promise<void> {
		const operation = this.tail.catch(() => undefined).then(async () => {
			await this.write(value);
			if (!this.matches(value, this.read())) {
				throw new Error('Charmlet could not confirm its saved settings.');
			}
		});
		this.tail = operation;
		return operation;
	}

	async flush(): Promise<void> {
		let pending: Promise<void>;
		do {
			pending = this.tail;
			await pending.catch(() => undefined);
		} while (pending !== this.tail);
	}
}
