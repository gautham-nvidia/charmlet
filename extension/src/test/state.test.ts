import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DEFAULT_STATE, getLayout, restoreState } from '../charm-state';
import { Pendulum } from '../pendulum';

test('missing or invalid saved values restore a usable charm', () => {
	assert.deepEqual(restoreState(undefined), DEFAULT_STATE);
	assert.deepEqual(restoreState({ cordLength: Number.NaN, hidden: 'yes' }), DEFAULT_STATE);
	assert.equal(restoreState({ cordLength: 9999 }).cordLength, 9999);
	assert.equal(restoreState({ cordLength: -10 }).cordLength, 48);
});

test('hide and motion preferences survive a reload without trusting unknown fields', () => {
	assert.deepEqual(restoreState({ cordLength: 180, hidden: true, reducedMotion: true, extra: 'ignored' }), {
		version: 1, cordLength: 180, size: 100, hidden: true, reducedMotion: true,
	});
});

test('size persists and Phase 0 states gain the default without losing their parked length', () => {
	assert.equal(restoreState({ cordLength: 210 }).size, 100);
	assert.equal(restoreState({ cordLength: 210 }).cordLength, 210);
	assert.equal(restoreState({ size: 140 }).size, 140);
	assert.equal(restoreState({ size: 999 }).size, 140);
	assert.equal(restoreState({ size: -1 }).size, 60);
	assert.equal(restoreState({ size: Number.NaN }).size, 100);
});

test('every supported size fits the logical view without overwriting requested preferences', () => {
	for (const size of [60, 100, 140]) {
		for (const height of [80, 144, 240, 500]) {
			const state = restoreState({ cordLength: 320, size });
			const layout = getLayout(96, height, state.cordLength, state.size);
			const bottom = layout.anchorY + layout.cordLength + layout.attachmentOffset + layout.charmHeight / 2;
			assert.ok(bottom <= layout.height, `Size ${size}, height ${height}`);
			assert.ok(layout.anchorX + layout.charmWidth / 2 <= layout.width);
			assert.ok(layout.anchorX - layout.charmWidth / 2 >= 0);
			assert.equal(state.cordLength, 320);
			assert.equal(state.size, size);
		}
	}
});

test('resizing clamps the parked cord to keep the charm in the view', () => {
	for (const height of [144, 200, 400, 800]) {
		const layout = getLayout(280, height, 320);
		assert.ok(layout.anchorY + layout.cordLength + 64 <= layout.height);
		assert.ok(layout.anchorX + 40 <= layout.width);
		assert.ok(layout.cordLength >= 48);
	}
});

test('a click impulse moves the charm, then the pendulum sleeps', () => {
	const pendulum = new Pendulum(280, 350, 128);
	const restingX = pendulum.position.x;
	assert.equal(pendulum.moving, false);
	pendulum.nudge(-1);
	for (let frame = 0; frame < 15; frame++) {
		pendulum.step();
	}
	assert.ok(pendulum.position.x < restingX - 5);
	for (let frame = 0; frame < 1500; frame++) {
		pendulum.step();
	}
	assert.equal(pendulum.moving, false);
	assert.equal(pendulum.position.x, restingX);
	pendulum.dispose();
});

test('opposite nudges have balanced travel in a narrow dock', () => {
	for (const size of [60, 100, 140]) {
		const left = new Pendulum(180, 500, 320, size);
		const right = new Pendulum(180, 500, 320, size);
		try {
			const leftStart = left.position.x;
			const rightStart = right.position.x;
			left.nudge(-1);
			right.nudge(1);
			let leftTravel = 0;
			let rightTravel = 0;
			for (let frame = 0; frame < 120; frame++) {
				left.step();
				right.step();
				leftTravel = Math.max(leftTravel, leftStart - left.position.x);
				rightTravel = Math.max(rightTravel, right.position.x - rightStart);
			}
			assert.ok(leftTravel > 10 && rightTravel > 10, `Size ${size}: both nudges must move`);
			assert.ok(Math.abs(leftTravel - rightTravel) < 1,
				`Size ${size}: left travel ${leftTravel}, right travel ${rightTravel}`);
		} finally {
			left.dispose();
			right.dispose();
		}
	}
});

test('long saved cords use tall views and survive temporary clamping', () => {
	const state = restoreState({ cordLength: 700 });
	assert.equal(state.cordLength, 700);
	assert.equal(getLayout(280, 900, state.cordLength).cordLength, 700);
	assert.ok(getLayout(280, 240, state.cordLength).cordLength < 700);
	assert.equal(state.cordLength, 700);
	assert.equal(getLayout(280, 900, state.cordLength).cordLength, 700);
	const pendulum = new Pendulum(280, 900, 126);
	pendulum.setLength(9999);
	pendulum.settle();
	assert.ok(pendulum.layout.cordLength > 320);
	assert.ok(Math.abs(pendulum.position.y + pendulum.layout.charmHeight / 2 - (pendulum.layout.height - 10)) < 0.001);
	pendulum.dispose();
});

test('rapid circular drags keep the body in view and recover after release', () => {
	for (const immediate of [false, true]) {
		const pendulum = new Pendulum(140, 800, 126, 60);
		try {
			const start = {
				x: pendulum.position.x - pendulum.layout.charmWidth * 0.45,
				y: pendulum.position.y - pendulum.layout.charmHeight * 0.45,
			};
			const assertInside = () => {
				const { x, y } = pendulum.position;
				const { bodyRadius, width, height } = pendulum.layout;
				assert.ok(x >= bodyRadius - 0.001 && x <= width - bodyRadius + 0.001, `Horizontal escape: ${x}`);
				assert.ok(y >= bodyRadius - 0.001 && y <= height - bodyRadius + 0.001, `Vertical escape: ${y}`);
			};
			pendulum.grab(start);
			for (let step = 1; step <= 16; step++) {
				const theta = 2 * Math.PI * step / 16;
				const point = { x: start.x + 160 * (Math.cos(theta) - 1), y: start.y + 160 * Math.sin(theta) };
				const dx = point.x - start.x;
				const dy = point.y - start.y;
				if (Math.abs(dy) > Math.abs(dx)) {
					pendulum.setLength(126 + dy);
				}
				pendulum.drag(point, immediate);
				if (!immediate) {
					pendulum.step();
				}
				assertInside();
			}
			pendulum.release();
			pendulum.setLength(126);
			if (immediate) {
				pendulum.settle();
			}
			for (let step = 0; step < 1500; step++) {
				pendulum.step();
				assertInside();
			}
			assert.equal(pendulum.moving, false);
			assert.equal(pendulum.engine.world.constraints.length, 1);
			assert.equal(pendulum.position.x, pendulum.layout.anchorX);
		} finally {
			pendulum.dispose();
		}
	}
});

test('a stretched cord eases back to its resting length before settling', () => {
	const pendulum = new Pendulum(280, 800, 126);
	try {
		const resting = pendulum.position;
		pendulum.setLength(600);
		pendulum.settle();
		pendulum.returnToLength(126);
		assert.equal(pendulum.layout.cordLength, 600);
		assert.equal(pendulum.moving, true);
		let previous = 600;
		for (let step = 0; step < 30; step++) {
			pendulum.step();
			assert.ok(pendulum.layout.cordLength <= previous && pendulum.layout.cordLength >= 126);
			if (step === 0) {
				assert.ok(pendulum.layout.cordLength > 126 && pendulum.layout.cordLength < 600);
				assert.ok(pendulum.position.y > resting.y);
			}
			previous = pendulum.layout.cordLength;
		}
		assert.equal(pendulum.layout.cordLength, 126);
		for (let step = 0; step < 1500; step++) {
			pendulum.step();
		}
		assert.equal(pendulum.moving, false);
		assert.deepEqual(pendulum.position, resting);
	} finally {
		pendulum.dispose();
	}
});

test('return motion respects reduced motion, grabs, resize and immediate settling', () => {
	const pendulum = new Pendulum(280, 800, 126);
	try {
		pendulum.setLength(600);
		pendulum.settle();
		const clock = pendulum.engine.timing.timestamp;
		pendulum.returnToLength(126, true);
		assert.equal(pendulum.layout.cordLength, 126);
		assert.equal(pendulum.moving, false);
		assert.equal(pendulum.engine.timing.timestamp, clock);
		pendulum.setLength(600);
		pendulum.settle();
		pendulum.returnToLength(126);
		pendulum.step();
		pendulum.grab(pendulum.position);
		const heldLength = pendulum.layout.cordLength;
		for (let step = 0; step < 10; step++) {
			pendulum.step();
		}
		assert.equal(pendulum.layout.cordLength, heldLength);
		pendulum.release();
		pendulum.returnToLength(126);
		pendulum.step();
		pendulum.resize(180, 200, 126);
		const resizedLength = getLayout(180, 200, 126).cordLength;
		for (let step = 0; step < 60; step++) {
			pendulum.step();
		}
		assert.equal(pendulum.layout.cordLength, resizedLength);
		assert.equal(pendulum.moving, false);
		pendulum.resize(280, 800, 126);
		pendulum.setLength(600);
		pendulum.settle();
		pendulum.returnToLength(126);
		pendulum.step();
		pendulum.settle();
		assert.equal(pendulum.layout.cordLength, 126);
		assert.equal(pendulum.moving, false);
	} finally {
		pendulum.dispose();
	}
});

test('pulling extends the cord and releases without a stuck drag constraint', () => {
	const pendulum = new Pendulum(280, 400, 128);
	pendulum.grab(pendulum.position);
	pendulum.setLength(220);
	pendulum.drag({ x: 210, y: 264 });
	for (let frame = 0; frame < 60; frame++) {
		pendulum.step();
	}
	assert.ok(pendulum.position.y > 220);
	pendulum.release();
	for (let frame = 0; frame < 1500; frame++) {
		pendulum.step();
	}
	assert.equal(pendulum.moving, false);
	assert.equal(pendulum.layout.cordLength, 220);
	pendulum.resize(180, 160, 220);
	assert.ok(pendulum.position.y + 34 < 160);
	assert.equal(pendulum.engine.world.constraints.length, 1);
	pendulum.dispose();
});

test('size changes scale the body and attachment without accumulating walls or constraints', () => {
	const pendulum = new Pendulum(280, 400, 126);
	for (const size of [140, 60, 100]) {
		pendulum.grab(pendulum.position);
		pendulum.resize(280, 400, 126, size);
		const radius = pendulum.body.circleRadius;
		assert.ok(typeof radius === 'number');
		assert.ok(Math.abs(radius - 34 * size / 100) < 0.001);
		assert.equal(pendulum.tether.length, 126 + 32 * size / 100);
		assert.equal(pendulum.engine.world.constraints.length, 1);
		assert.equal(pendulum.engine.world.bodies.length, 4);
		assert.equal(pendulum.moving, false);
	}
	pendulum.dispose();
});

test('reduced-motion dragging follows input without advancing the physics clock', () => {
	const pendulum = new Pendulum(280, 400, 126);
	const start = pendulum.position;
	pendulum.grab(start);
	pendulum.drag({ x: start.x - 40, y: start.y + 20 }, true);
	assert.equal(pendulum.position.x, start.x - 40);
	assert.equal(pendulum.position.y, start.y + 20);
	assert.equal(pendulum.engine.timing.timestamp, 0);
	pendulum.release();
	pendulum.settle();
	assert.equal(pendulum.moving, false);
	pendulum.dispose();
});