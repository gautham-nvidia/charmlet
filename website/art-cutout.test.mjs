import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractGreenScreen } from './art-cutout.mjs';

function fixture() {
  const width = 20, height = 24;
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < data.length; index += 4) data.set([0, 255, 0, 255], index);
  for (let y = 4; y < 20; y++) for (let x = 4; x < 16; x++) data.set([180, 80, 40, 255], (y * width + x) * 4);
  return { width, height, data };
}

test('key background and interior gaps become transparent without changing the raw image', () => {
  const image = fixture();
  image.data.set([0, 255, 0, 255], (10 * image.width + 10) * 4);
  const before = new Uint8Array(image.data);
  const result = extractGreenScreen(image);
  assert.deepEqual(result.bounds, { x: 4, y: 4, width: 12, height: 16 });
  assert.deepEqual([...result.data.slice(0, 4)], [0, 0, 0, 0]);
  assert.equal(result.data[(10 * image.width + 10) * 4 + 3], 0);
  assert.deepEqual(image.data, before);
});

test('neutral foreground and dark green foliage remain opaque', () => {
  const image = fixture();
  const leaf = (12 * image.width + 10) * 4;
  const highlight = (13 * image.width + 10) * 4;
  image.data.set([35, 105, 65, 255], leaf);
  image.data.set([245, 245, 245, 255], highlight);
  const result = extractGreenScreen(image);
  assert.deepEqual([...result.data.slice(leaf, leaf + 4)], [35, 105, 65, 255]);
  assert.deepEqual([...result.data.slice(highlight, highlight + 4)], [245, 245, 245, 255]);
});

test('a uniformly darker green key is measured rather than mistaken for opaque artwork', () => {
  const image = fixture();
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (image.data[offset + 1] === 255) image.data.set([5, 146, 46, 255], offset);
  }
  const result = extractGreenScreen(image);
  assert.deepEqual(result.bounds, { x: 4, y: 4, width: 12, height: 16 });
  assert.equal(result.data[3], 0);
  assert.deepEqual([...result.data.slice((12 * image.width + 10) * 4, (12 * image.width + 10) * 4 + 4)], [180, 80, 40, 255]);
});

test('green spill is softened only at a key boundary', () => {
  const image = fixture();
  const edge = (8 * image.width + 5) * 4;
  image.data.set([100, 220, 100, 255], edge);
  const result = extractGreenScreen(image);
  assert.ok(result.data[edge + 3] > 0 && result.data[edge + 3] < 255);
  assert.ok(result.data[edge + 1] <= result.data[edge] + 1);
});

test('missing key, empty art, unsafe dimensions and clipped silhouettes fail rather than inventing a cutout', () => {
  const noKey = fixture(); noKey.data.set([255, 255, 255, 255], 0);
  assert.throws(() => extractGreenScreen(noKey), /background/);
  const clipped = fixture(); clipped.data.set([180, 80, 40, 255], 10 * 4);
  assert.throws(() => extractGreenScreen(clipped), /canvas edge/);
  assert.throws(() => extractGreenScreen({ width: 99999, height: 99999, data: [] }), /bounded/);
  const empty = fixture();
  for (let index = 0; index < empty.data.length; index += 4) empty.data.set([0, 255, 0, 255], index);
  assert.throws(() => extractGreenScreen(empty), /useful/);
});
