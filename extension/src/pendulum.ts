import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';
import { clamp, getLayout } from './charm-state';

export type Point = { x: number; y: number };

export class Pendulum {
	readonly engine = Engine.create({ enableSleeping: true });
	readonly body: Body;
	readonly tether: Constraint;
	layout: ReturnType<typeof getLayout>;
	private pointer?: Constraint;
	private walls: Body[] = [];
	private quietFrames = 0;

	constructor(width: number, height: number, cordLength: number) {
		this.layout = getLayout(width, height, cordLength);
		this.body = Bodies.circle(this.layout.anchorX, this.layout.anchorY + this.layout.cordLength + 32, 34, {
			frictionAir: 0.025,
			restitution: 0.2,
			sleepThreshold: 45,
		});
		Body.setInertia(this.body, Infinity);
		this.tether = Constraint.create({
			pointA: { x: this.layout.anchorX, y: this.layout.anchorY },
			bodyB: this.body,
			length: this.layout.cordLength + 32,
			stiffness: 0.9,
			damping: 0.08,
		});
		Composite.add(this.engine.world, [this.body, this.tether]);
		this.resize(width, height, cordLength);
	}

	get moving() {
		return Boolean(this.pointer) || !this.body.isSleeping;
	}

	get position(): Point {
		return { ...this.body.position };
	}

	get angle() {
		return -Math.atan2(this.body.position.x - this.layout.anchorX, this.body.position.y - this.layout.anchorY);
	}

	resize(width: number, height: number, cordLength: number) {
		this.release();
		this.layout = getLayout(width, height, cordLength);
		this.tether.pointA = { x: this.layout.anchorX, y: this.layout.anchorY };
		this.tether.length = this.layout.cordLength + 32;
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
		this.layout.cordLength = clamp(length, 48, this.layout.maximumCord);
		this.tether.length = this.layout.cordLength + 32;
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

	drag(point: Point) {
		if (this.pointer) {
			this.pointer.pointA = {
				x: clamp(point.x, 34, this.layout.width - 34),
				y: clamp(point.y, 12, this.layout.height - 34),
			};
			this.wake();
		}
	}

	release() {
		if (this.pointer) {
			Composite.remove(this.engine.world, this.pointer);
			this.pointer = undefined;
			this.wake();
		}
	}

	step() {
		if (!this.moving) {
			return;
		}
		Engine.update(this.engine, 1000 / 60);
		const resting = !this.pointer && this.body.speed < 0.12
			&& Math.abs(this.body.position.x - this.layout.anchorX) < 0.8;
		this.quietFrames = resting ? this.quietFrames + 1 : 0;
		if (this.quietFrames > 30 || this.body.isSleeping) {
			this.settle();
		}
	}

	settle() {
		Body.setPosition(this.body, {
			x: this.layout.anchorX,
			y: this.layout.anchorY + this.layout.cordLength + 32,
		});
		Body.setVelocity(this.body, { x: 0, y: 0 });
		Sleeping.set(this.body, true);
		this.quietFrames = 0;
	}

	dispose() {
		Composite.clear(this.engine.world, false);
		Engine.clear(this.engine);
	}

	private wake() {
		Sleeping.set(this.body, false);
		this.quietFrames = 0;
	}
}