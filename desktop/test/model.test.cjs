const { strict: assert } = require('node:assert');
const { test } = require('node:test');
const { fitDesktopBounds } = require('../dist/window-placement.cjs');
const { pauseForAway } = require('../dist/power-behavior.cjs');
const primary = { x: 0, y: 0, width: 1920, height: 1040 };
const left = { x: -1280, y: 0, width: 1280, height: 1024 };
test('a new window fits near the primary top-right and leaves a small margin', () => {
  assert.deepEqual(fitDesktopBounds(undefined, [primary, left]), { x: 1564, y: 16, width: 340, height: 620 });
});
test('valid negative monitor coordinates are retained', () => {
  assert.deepEqual(fitDesktopBounds({ x: -1000, y: 70, width: 340, height: 620 }, [primary, left]),
    { x: -1000, y: 70, width: 340, height: 620 });
});
test('a disconnected monitor cannot strand the window off-screen', () => {
  assert.deepEqual(fitDesktopBounds({ x: -1000, y: 70, width: 340, height: 620 }, [primary]),
    { x: 1564, y: 16, width: 340, height: 620 });
});
test('partial overlap is clamped inside the best matching work area', () => {
  assert.deepEqual(fitDesktopBounds({ x: 1850, y: 980, width: 340, height: 620 }, [primary]),
    { x: 1580, y: 420, width: 340, height: 620 });
});
test('small screens and malformed saved sizes stay inside the work area', () => {
  const small = { x: 100, y: 200, width: 240, height: 300 };
  assert.deepEqual(fitDesktopBounds({ x: NaN, y: 0, width: 9999999, height: -1 }, [small]),
    { x: 100, y: 200, width: 240, height: 300 });
  assert.throws(() => fitDesktopBounds(undefined, []), /work area/);
});
test('away handling pauses one running focus and never resumes a paused focus', async () => {
  const state = { status: 'running' };
  const actions = [];
  const companion = {
    snapshot: () => ({ state: { focus: state } }),
    dispatch: async action => { actions.push(action); state.status = 'paused'; },
  };
  await pauseForAway(companion);
  await pauseForAway(companion);
  assert.deepEqual(actions, [{ type: 'focus-pause' }]);
  assert.equal(state.status, 'paused');
});
