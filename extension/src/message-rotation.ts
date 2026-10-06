export const MESSAGE_ROTATION_MS = 5 * 60 * 1000;

export class MessageRotation {
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly advance: () => void) {}

	update(enabled: boolean) {
		this.stop();
		if (!enabled) { return; }
		this.timer = setTimeout(() => {
			this.timer = undefined;
			this.advance();
		}, MESSAGE_ROTATION_MS);
	}

	stop() {
		if (this.timer !== undefined) { clearTimeout(this.timer); }
		this.timer = undefined;
	}
}
