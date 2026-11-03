import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';
import { DEFAULT_STATE, clamp, getLayout, type LayoutMode } from './charm-state';
import { DEFAULT_ATTACHMENT, type CharmAttachment } from './charm-attachment';

export type Point = { x: number; y: number };

export class Pendulum {
	readonly engine = Engine.create({ enableSleeping: true });
	readonly body: Body;
	readonly tether: Constraint;
	layout: ReturnType<typeof getLayout>;
	private pointer?: Constraint;
	private walls: Body[] = [];
	private quietFrames = 0;
	private returnMotion?: { from: number; target: number; elapsed: number; fromAngle?: number };

	constructor(width: number, height: number, cordLength: number, size = DEFAULT_STATE.size, mode: LayoutMode = DEFAULT_STATE.layoutMode, attachment: CharmAttachment = DEFAULT_ATTACHMENT) {
		this.layout = getLayout(width, height, cordLength, size, mode, attachment);
		this.body = Bodies.circle(this.layout.anchorX, this.layout.anchorY + this.layout.cordLength + this.layout.attachmentOffset, this.layout.bodyRadius, {
			frictionAir: 0.025,
			restitution: 0.2,
			sleepThreshold: 45,
		});
		Body.setInertia(this.body, Infinity);
		this.tether = Constraint.create({
			pointA: { x: this.layout.anchorX, y: this.layout.anchorY },
			bodyB: this.body,
			length: this.layout.cordLength + this.layout.attachmentOffset,
			stiffness: 0.9,
			damping: 0.08,
		});
		Composite.add(this.engine.world, [this.body, this.tether]);
		this.resize(width, height, cordLength, size, mode, attachment);
	}

	get moving() {
		return Boolean(this.pointer) || Boolean(this.returnMotion) || !this.body.isSleeping;
	}

	get position(): Point {
		return { ...this.body.position };
	}

	get angle() {
		return -Math.atan2(this.body.position.x - this.layout.anchorX, this.body.position.y - this.layout.anchorY);
	}

	resize(width: number, height: number, cordLength: number, size = DEFAULT_STATE.size, mode: LayoutMode = DEFAULT_STATE.layoutMode, attachment: CharmAttachment = DEFAULT_ATTACHMENT) {
		this.returnMotion = undefined;
		this.release();
		const previousRadius = this.layout.bodyRadius;
		this.layout = getLayout(width, height, cordLength, size, mode, attachment);
		const ratio = this.layout.bodyRadius / previousRadius;
		Body.scale(this.body, ratio, ratio);
		Body.setInertia(this.body, Infinity);
		this.tether.pointA = { x: this.layout.anchorX, y: this.layout.anchorY };
		this.tether.length = this.layout.cordLength + this.layout.attachmentOffset;
		for (const wall of this.walls) {
			Composite.remove(this.engine.world, wall);
		}
		this.walls = [
			Bodies.rectangle(-40, this.layout.height / 2, 80, this.layout.height + 200, { isStatic: true }),
			Bodies.rectangle(this.layout.width + 40, this.layout.height / 2, 80, this.layout.height + 200, { isStatic: true }),
			Bodies.rectangle(this.layout.width / 2, this.layout.height + 40, this.layout.width + 200, 80, { isStatic: true }),
		];
		Composite.add(this.engine.world, this.walls);
		this.settle();
	}

	setLength(length: number) {
		this.returnMotion = undefined;
		this.layout.cordLength = clamp(length, this.layout.minimumCord, this.layout.maximumCord);
		this.tether.length = this.layout.cordLength + this.layout.attachmentOffset;
		this.wake();
	}

	returnToLength(length: number, immediate = false) {
		this.release();
		const target = clamp(length, this.layout.minimumCord, this.layout.maximumCord);
		const angle = this.angle;
		// A fast pointer move may not have reached the rendered body yet.
		const from = Math.max(0, Math.hypot(this.body.position.x - this.layout.anchorX, this.body.position.y - this.layout.anchorY) - this.layout.attachmentOffset);
		const needsArc = this.body.position.y < this.layout.anchorY
			|| target + this.layout.attachmentOffset > this.radiusLimit(angle) + 0.01;
		if (immediate || (!needsArc && Math.abs(target - from) < 0.001)) {
			this.setLength(target);
			if (immediate) { this.settle(); }
			return;
		}
		this.layout.cordLength = from;
		this.tether.length = from + this.layout.attachmentOffset;
		this.returnMotion = { from, target, elapsed: 0, fromAngle: needsArc ? angle : undefined };
		this.wake();
	}

	nudge(direction = -1) {
		this.wake();
		Body.setVelocity(this.body, {
			x: clamp(this.body.velocity.x + direction * 4.5, -10, 10),
			y: -0.5,
		});
	}

	grab(point: Point) {
		this.release();
		this.returnMotion = undefined;
		this.pointer = Constraint.create({
			pointA: { ...point },
			bodyB: this.body,
			pointB: { x: point.x - this.body.position.x, y: point.y - this.body.position.y },
			length: 0,
			stiffness: 0.35,
			damping: 0.15,
		});
		Composite.add(this.engine.world, this.pointer);
		this.wake();
	}

	drag(point: Point, immediate = false) {
		if (!this.pointer) { return; }
		const requested = { x: point.x - this.pointer.pointB.x, y: point.y - this.pointer.pointB.y };
		if (this.layout.mode === 'hanging') {
			const inset = this.layout.visualRadius + this.layout.edgePadding;
			requested.x = clamp(requested.x, inset, this.layout.width - inset);
			requested.y = clamp(requested.y, inset, this.layout.height - inset);
		}
		const dx = requested.x - this.layout.anchorX;
		const dy = requested.y - this.layout.anchorY;
		const distance = Math.hypot(dx, dy);
		const angle = distance > 0.001 ? -Math.atan2(dx, dy) : this.angle;
		const radius = clamp(distance, this.layout.orbitRadius, this.radiusLimit(angle));
		const target = radius === distance ? requested : this.positionAt(angle, radius);
		this.layout.cordLength = radius - this.layout.attachmentOffset;
		this.tether.length = radius;
		this.pointer.pointA = { x: target.x + this.pointer.pointB.x, y: target.y + this.pointer.pointB.y };
		if (immediate) {
			Body.setPosition(this.body, target);
			Body.setVelocity(this.body, { x: 0, y: 0 });
			Sleeping.set(this.body, true);
		} else {
			this.wake();
		}
	}

	release() {
		if (this.pointer) {
			Composite.remove(this.engine.world, this.pointer);
			this.pointer = undefined;
			this.constrainPosition();
			this.wake();
		}
	}

	step() {
		if (!this.moving) {
			return;
		}
		if (this.returnMotion) {
			const motion = this.returnMotion;
			motion.elapsed += 1000 / 60;
			const seconds = motion.elapsed / 1000;
			// An underdamped return: a strong first rebound, then progressively smaller
			// ones. Its initial slope is zero, so a held stretch releases smoothly.
			const decay = Math.exp(-4 * seconds) * (Math.cos(12 * seconds) + Math.sin(12 * seconds) / 3);
			const desired = seconds >= 2 ? motion.target : motion.target + (motion.from - motion.target) * decay;
			const progress = Math.min(1, motion.elapsed / 350);
			const eased = progress * progress * (3 - 2 * progress);
			const returningArc = motion.fromAngle !== undefined && motion.elapsed <= 350;
			const angle = returningArc ? motion.fromAngle! * (1 - eased) : this.angle;
			const lowerRadius = this.layout.mode === 'hanging'
				? Math.max(this.layout.orbitRadius, (this.layout.visualRadius + this.layout.edgePadding - this.layout.anchorY) / Math.max(0.001, Math.cos(angle)))
				: this.layout.orbitRadius;
			const upperRadius = this.radiusLimit(angle);
			const radius = clamp(desired + this.layout.attachmentOffset, Math.min(lowerRadius, upperRadius), upperRadius);
			this.layout.cordLength = radius - this.layout.attachmentOffset;
			this.tether.length = radius;
			Sleeping.set(this.body, false);
			if (returningArc) {
				const previous = this.position;
				Body.setPosition(this.body, this.positionAt(angle, radius));
				this.constrainPosition();
				// Carry the arc's last movement into the free swing rather than parking.
				Body.setVelocity(this.body, { x: this.body.position.x - previous.x, y: this.body.position.y - previous.y });
				return;
			}
			if (seconds >= 2) {
				this.returnMotion = undefined;
				this.setLength(motion.target);
			}
		}
		Engine.update(this.engine, 1000 / 60);
		this.constrainPosition();
		if (!this.pointer && this.body.position.y < this.layout.anchorY && this.returnMotion?.fromAngle === undefined) {
			this.returnToLength(this.returnMotion?.target ?? this.layout.cordLength);
		}
		const resting = !this.pointer && !this.returnMotion && this.body.speed < 0.12
			&& Math.abs(this.body.position.x - this.layout.anchorX) < 0.8;
		this.quietFrames = resting ? this.quietFrames + 1 : 0;
		if (!this.pointer && !this.returnMotion && (this.quietFrames > 30 || this.body.isSleeping)) {
			this.settle();
		}
	}

	settle() {
		if (this.returnMotion) {
			this.layout.cordLength = this.returnMotion.target;
			this.tether.length = this.layout.cordLength + this.layout.attachmentOffset;
			this.returnMotion = undefined;
		}
		Body.setPosition(this.body, {
			x: this.layout.anchorX,
			y: this.layout.anchorY + this.layout.cordLength + this.layout.attachmentOffset,
		});
		Body.setVelocity(this.body, { x: 0, y: 0 });
		Sleeping.set(this.body, true);
		this.quietFrames = 0;
	}

	dispose() {
		Composite.clear(this.engine.world, false);
		Engine.clear(this.engine);
	}

	private radiusLimit(angle: number) {
		const { anchorX, anchorY, width, height, visualRadius, edgePadding, orbitRadius } = this.layout;
		const inset = visualRadius + edgePadding;
		const dx = -Math.sin(angle);
		const dy = Math.cos(angle);
		let limit = Number.POSITIVE_INFINITY;
		if (dx > 0.000001) { limit = Math.min(limit, (width - inset - anchorX) / dx); }
		if (dx < -0.000001) { limit = Math.min(limit, (inset - anchorX) / dx); }
		if (dy > 0.000001) { limit = Math.min(limit, (height - inset - anchorY) / dy); }
		if (dy < -0.000001) { limit = Math.min(limit, (inset - anchorY) / dy); }
		return Math.max(orbitRadius, limit);
	}

	private positionAt(angle: number, radius: number): Point {
		return { x: this.layout.anchorX - Math.sin(angle) * radius, y: this.layout.anchorY + Math.cos(angle) * radius };
	}

	private constrainPosition() {
		const { x, y } = this.body.position;
		const { visualRadius, edgePadding, width, height } = this.layout;
		const inset = visualRadius + edgePadding;
		const position = {
			x: clamp(x, inset, width - inset),
			y: clamp(y, inset, height - inset),
		};
		if (position.x !== x || position.y !== y) {
			const velocity = { ...this.body.velocity };
			Body.setPosition(this.body, position);
			Body.setVelocity(this.body, {
				x: position.x !== x ? 0 : velocity.x,
				y: position.y !== y ? 0 : velocity.y,
			});
		}
	}

	private wake() {
		Sleeping.set(this.body, false);
		this.quietFrames = 0;
	}
}