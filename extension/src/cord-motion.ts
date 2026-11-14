import type { CordPoint } from './cord-design';

/** Secondary cord motion at the same fixed 60 Hz step as the pendulum.
 * The attachment points remain exact; only the curve between them can lag.
 */
export class CordMotion {
	private offset = 0;
	private velocity = 0;
	private previousHook?: CordPoint;

	get bend() { return this.offset; }
	get moving() { return this.offset !== 0 || this.velocity !== 0; }

	reset(hook?: CordPoint) {
		this.offset = 0;
		this.velocity = 0;
		this.previousHook = hook ? { ...hook } : undefined;
	}

	step(anchor: CordPoint, hook: CordPoint) {
		const dx = hook.x - anchor.x, dy = hook.y - anchor.y;
		const length = Math.hypot(dx, dy);
		if (!Number.isFinite(length) || length < 1) { this.reset(); return; }
		const previous = this.previousHook ?? hook;
		const lateral = (-dy * (hook.x - previous.x) + dx * (hook.y - previous.y)) / length;
		this.previousHook = { ...hook };
		const limit = Math.min(64, length * .3);
		this.velocity = (this.velocity - lateral * .28 - this.offset * .11) * .84;
		this.velocity = Math.max(-limit * .4, Math.min(limit * .4, this.velocity));
		this.offset = Math.max(-limit, Math.min(limit, this.offset + this.velocity));
		if (Math.abs(this.offset) < .04 && Math.abs(this.velocity) < .04) {
			this.offset = 0;
			this.velocity = 0;
		}
	}
}
