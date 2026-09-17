import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DEFAULT_STATE, getLayout, restoreState } from '../charm-state';
import { Pendulum } from '../pendulum';

test('missing or invalid saved values restore a usable charm', () => {
	assert.deepEqual(restoreState(undefined), DEFAULT_STATE);
	assert.deepEqual(restoreState({ cordLength: Number.NaN, hidden: 'yes' }), DEFAULT_STATE);
	assert.equal(restoreState({ cordLength: 9999 }).cordLength, 320);
	assert.equal(restoreState({ cordLength: -10 }).cordLength, 48);
});

test('hide and motion preferences survive a reload without trusting unknown fields', () => {
	assert.deepEqual(restoreState({ cordLength: 180, hidden: true, reducedMotion: true, extra: 'ignored' }), {
		version: 1, cordLength: 180, hidden: true, reducedMotion: true,
	});
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