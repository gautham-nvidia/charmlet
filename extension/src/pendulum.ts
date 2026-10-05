import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';
import { DEFAULT_STATE, clamp, getLayout } from './charm-state';

export type Point = { x: number; y: number };

export class Pendulum {
	readonly engine = Engine.create({ enableSleeping: true });
	readonly body: Body;
	readonly tether: Constraint;
	layout: ReturnType<typeof getLayout>;
	private pointer?: Constraint;
	private walls: Body[] = [];
	private quietFrames = 0;
	private returnMotion?: { from: number; target: number; elapsed: number };

	constructor(width: number, height: number, cordLength: number, size = DEFAULT_STATE.size) {
		this.layout = getLayout(width, height, cordLength, size);
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
		this.resize(width, height, cordLength, size);
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

	resize(width: number, height: number, cordLength: number, size = DEFAULT_STATE.size) {
		this.returnMotion = undefined;
		this.release();
		const previousRadius = this.layout.bodyRadius;
		this.layout = getLayout(width, height, cordLength, size);
		const ratio = this.layout.bodyRadius / previousRadius;
		Body.scale(this.body, ratio, ratio);
		Body.setInertia(this.body, Infinity);
		this.tether.pointA = { x: this.layout.anchorX, y: this.layout.anchorY };
		this.tether.length = this.layout.cordLength + this.layout.attachmentOffset;
		for (const wall of this.walls) {
			Composite.remove(this.engine.world, wall);
		}
		this.walls = [
			Bodies.rectangle(-40, height / 2, 80, height + 200, { isStatic: true }),
			Bodies.rectangle(this.layout.width + 40, height / 2, 80, height + 200, { isStatic: true }),
			Bodies.rectangle(width / 2, this.layout.height + 40, width + 200, 80, { isStatic: true }),
		];
		Composite.add(this.engine.world, this.walls);
		this.settle();
	}

	setLength(length: number) {
		this.returnMotion = undefined;
		this.layout.cordLength = clamp(length, 48, this.layout.maximumCord);
		this.tether.length = this.layout.cordLength + this.layout.attachmentOffset;
		this.wake();
	}

	returnToLength(length: number, immediate = false) {
		this.release();
		const target = clamp(length, 48, this.layout.maximumCord);
		if (immediate || Math.abs(target - this.layout.cordLength) < 0.001) {
			this.setLength(target);
			if (immediate) {
				this.settle();
			}
			return;
		}
		this.returnMotion = { from: this.layout.cordLength, target, elapsed: 0 };
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
		if (this.pointer) {
			this.pointer.pointA = {
				x: clamp(point.x - this.pointer.pointB.x, this.layout.bodyRadius, this.layout.width - this.layout.bodyRadius) + this.pointer.pointB.x,
				y: clamp(point.y - this.pointer.pointB.y, this.layout.bodyRadius, this.layout.height - this.layout.bodyRadius) + this.pointer.pointB.y,
			};
			if (immediate) {
				Body.setPosition(this.body, {
					x: this.pointer.pointA.x - this.pointer.pointB.x,
					y: this.pointer.pointA.y - this.pointer.pointB.y,
				});
				Body.setVelocity(this.body, { x: 0, y: 0 });
				Sleeping.set(this.body, true);
			} else {
				this.wake();
			}
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
			const progress = Math.min(1, motion.elapsed / 350);
			const eased = progress * progress * (3 - 2 * progress);
			this.layout.cordLength = progress === 1 ? motion.target : motion.from + (motion.target - motion.from) * eased;
			this.tether.length = this.layout.cordLength + this.layout.attachmentOffset;
			Sleeping.set(this.body, false);
			if (progress === 1) {
				this.returnMotion = undefined;
			}
		}
		Engine.update(this.engine, 1000 / 60);
		this.constrainPosition();
		const resting = !this.pointer && !this.returnMotion && this.body.speed < 0.12
			&& Math.abs(this.body.position.x - this.layout.anchorX) < 0.8;
		this.quietFrames = resting ? this.quietFrames + 1 : 0;
		if (!this.returnMotion && (this.quietFrames > 30 || this.body.isSleeping)) {
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

	private constrainPosition() {
		const { x, y } = this.body.position;
		const { bodyRadius, width, height } = this.layout;
		const position = {
			x: clamp(x, bodyRadius, width - bodyRadius),
			y: clamp(y, bodyRadius, height - bodyRadius),
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