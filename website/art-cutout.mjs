export function extractGreenScreen({ width, height, data }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 || width > 4096 || height > 4096
    || !data || data.length !== width * height * 4) throw new Error('Invalid bounded RGBA artwork.');
  const idealKey = offset => data[offset + 1] > 190 && data[offset + 1] - Math.max(data[offset], data[offset + 2]) > 150;
  const corners = [0, (width - 1) * 4, (height - 1) * width * 4, (width * height - 1) * 4];
  const greenCorner = offset => data[offset + 1] > 80 && data[offset + 1] - data[offset] > 60 && data[offset + 1] - data[offset + 2] > 50;
  if (!corners.every(greenCorner)) throw new Error('Expected the authored green key background at all four corners.');
  const ideal = corners.every(idealKey);
  const key = ideal ? [0, 255, 0] : [0, 1, 2].map(channel => Math.round(corners.reduce((sum, offset) => sum + data[offset + channel], 0) / 4));
  const distance = offset => Math.hypot(data[offset] - key[0], data[offset + 1] - key[1], data[offset + 2] - key[2]);
  const keyPixel = ideal ? idealKey : offset => greenCorner(offset) && distance(offset) < 50;
  const output = new Uint8Array(data);
  const background = new Uint8Array(width * height);
  let removed = 0;
  for (let pixel = 0; pixel < background.length; pixel++) {
    const offset = pixel * 4;
    if (keyPixel(offset) || data[offset + 3] === 0) {
      background[pixel] = 1;
      output.fill(0, offset, offset + 4);
      removed++;
    }
  }
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const pixel = y * width + x;
    if (background[pixel]) continue;
    const offset = pixel * 4;
    const dominance = data[offset + 1] - Math.max(data[offset], data[offset + 2]);
    if (dominance <= 20) continue;
    let boundary = false;
    for (let dy = -3; dy <= 3 && !boundary; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nearX = x + dx, nearY = y + dy;
      if (nearX >= 0 && nearX < width && nearY >= 0 && nearY < height && background[nearY * width + nearX]) { boundary = true; break; }
    }
    if (!boundary) continue;
    const alpha = Math.max(0, Math.min(1, ideal ? (255 - dominance) / 255 : distance(offset) / 95));
    output[offset + 3] = Math.round(data[offset + 3] * alpha);
    if (alpha > 0) for (let channel = 0; channel < 3; channel++) {
      output[offset + channel] = Math.max(0, Math.min(255, Math.round((data[offset + channel] - key[channel] * (1 - alpha)) / alpha)));
    }
  }
  let left = width, right = -1, top = height, bottom = -1, opaque = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (output[(y * width + x) * 4 + 3] <= 8) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y); opaque++;
  }
  if (right < left || opaque < width * height * .01 || removed < width * height * .1) throw new Error('Artwork did not produce a useful transparent silhouette.');
  if (left === 0 || top === 0 || right === width - 1 || bottom === height - 1) throw new Error('Foreground pixels reach the canvas edge; check for cropped artwork or leftover background before export.');
  return { width, height, data: output, bounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }, transparentPixels: removed };
}
