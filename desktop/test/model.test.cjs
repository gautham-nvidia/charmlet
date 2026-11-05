const { strict: assert } = require('node:assert');
const { test } = require('node:test');
const { fitDesktopBounds, fitDesktopAnchor, matchesDesktopAnchor, legacyDesktopAnchor, desktopGeometry } = require('../dist/window-placement.cjs');
const { pauseForAway } = require('../dist/power-behavior.cjs');
const { restoreDesktopView, matchesDesktopView } = require('../dist/desktop-view.cjs');
const { getLayout, placeDesktopAnchor } = require('../dist/desktop-layout.cjs');
const primary = { x: 0, y: 0, width: 1920, height: 1040 };
const left = { x: -1280, y: 0, width: 1280, height: 1024 };
test('a new window fits near the primary top-right and leaves a small margin', () => {
  assert.deepEqual(fitDesktopBounds(undefined, [primary, left]), { x: 1564, y: 16, width: 340, height: 300 });
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
test('desktop starts without extra UI and accepts only explicit boolean preferences', () => {
  const minimal = { background: false, toolbarPinned: false, messagesPinned: false };
  for (const value of [undefined, null, [], 'old', { background: 'true', toolbarPinned: 1 }]) {
    assert.deepEqual(restoreDesktopView(value), minimal);
  }
  const pinned = { background: true, toolbarPinned: false, messagesPinned: true };
  assert.deepEqual(restoreDesktopView(pinned), pinned);
  assert.equal(matchesDesktopView(pinned, JSON.parse(JSON.stringify(pinned))), true);
  assert.equal(matchesDesktopView(minimal, undefined), false, 'A missing file is not a confirmed save.');
  assert.equal(matchesDesktopView(minimal, {}), false);
  assert.equal(matchesDesktopView(pinned, { ...pinned, background: false }), false);
});
test('opening a panel near a display edge need not overwrite the resting position', () => {
  const resting = { x: -900, y: 724, width: 340, height: 300 };
  const expanded = fitDesktopBounds({ ...resting, height: 620 }, [primary, left]);
  assert.equal(expanded.y, 404);
  assert.deepEqual(fitDesktopBounds(resting, [primary, left]), resting);
});
test('the desktop peg starts at the screen edge and legacy positions migrate independently of the controls', () => {
  assert.deepEqual(fitDesktopAnchor(undefined, [primary, left]), { x: 1800, y: 3 });
  assert.deepEqual(legacyDesktopAnchor({ x: 40, y: 40, width: 340, height: 620 }), { x: 210, y: 80 });
  assert.equal(legacyDesktopAnchor({ x: NaN, y: 40, width: 340, height: 620 }), undefined);
  assert.equal(matchesDesktopAnchor({ x: 210, y: 80 }, { x: 210, y: 80 }), true);
  assert.equal(matchesDesktopAnchor({ x: 210, y: 80 }, undefined), false);
});
test('desktop controls stay on screen while the entire monitor remains the play area', () => {
  const anchor = fitDesktopAnchor({ x: 1830, y: 820 }, [primary]);
  const compact = desktopGeometry(anchor, [primary], 300);
  const open = desktopGeometry(anchor, [primary], 620);
  assert.deepEqual(compact.bounds, primary);
  assert.deepEqual(open.bounds, primary);
  assert.deepEqual(compact.anchor, open.anchor);
  assert.equal(open.frame.y, 420);
  assert.equal(compact.frame.x + compact.frame.width, primary.width);
});
test('monitor changes keep desktop anchors visible, including negative coordinates', () => {
  const anchor = fitDesktopAnchor({ x: -900, y: 400 }, [primary, left]);
  const geometry = desktopGeometry(anchor, [primary, left], 620);
  assert.deepEqual(geometry.bounds, left);
  assert.deepEqual(geometry.anchor, { x: 380, y: 400 });
  const relocated = fitDesktopAnchor(anchor, [primary]);
  assert.ok(relocated.x >= primary.x && relocated.x < primary.width);
  assert.ok(relocated.y >= primary.y && relocated.y < primary.height);
  assert.throws(() => fitDesktopAnchor(undefined, []), /work area/);
});
test('desktop physics can stretch far beyond the small controls without moving the peg', () => {
  const layout = placeDesktopAnchor(getLayout(primary.width, primary.height, 126, 100, 'hanging'), { x: 1800, y: 3 });
  assert.equal(layout.anchorX, 1800);
  assert.equal(layout.anchorY, 3);
  assert.equal(layout.cordLength, 126);
  assert.ok(layout.maximumDragCord > 900);
  assert.equal(layout.width, primary.width);
  assert.equal(layout.height, primary.height);
});
