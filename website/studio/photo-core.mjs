export const PHOTO_WIDTH = 216;
export const PHOTO_HEIGHT = 252;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTO_PIXELS = 16 * 1024 * 1024;
export const FRAMES = Object.freeze({
  mint: { name: 'Mint Frame', accent: '#8db7a6', x: 10, y: 20, width: 52, height: 52, shape: 'rect' },
  copper: { name: 'Copper Locket', accent: '#d3927b', x: 9, y: 22, width: 54, height: 54, shape: 'circle' },
  paper: { name: 'Paper Keepsake', accent: '#e8b577', x: 9, y: 18, width: 54, height: 56, shape: 'rect' },
});
const forbidden = /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/;

export function inspectPhotoHeader(bytes, type) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_PHOTO_BYTES || bytes.length < 12) throw new Error('Choose a bounded supported image.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = offset => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  let width, height;
  if (type === 'image/png' && bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) && text(12) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (type === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let cursor = 2;
    while (cursor + 4 <= bytes.length) {
      if (bytes[cursor++] !== 255) break;
      while (bytes[cursor] === 255) cursor++;
      const marker = bytes[cursor++];
      if (marker === 218 || marker === 217 || cursor + 2 > bytes.length) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      const length = view.getUint16(cursor);
      if (length < 2 || cursor + length > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) {
        height = view.getUint16(cursor + 3); width = view.getUint16(cursor + 5); break;
      }
      cursor += length;
    }
  } else if (type === 'image/webp' && bytes.length >= 30 && text(0) === 'RIFF' && text(8) === 'WEBP') {
    const chunk = text(12);
    if (chunk === 'VP8X') {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8L' && bytes[20] === 47) {
      width = 1 + bytes[21] + ((bytes[22] & 63) << 8);
      height = 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10);
    } else if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = view.getUint16(26, true) & 16383; height = view.getUint16(28, true) & 16383;
    }
  }
  if (!width || !height) throw new Error('The image header could not be read safely.');
  if (width > 8192 || height > 8192 || width * height > MAX_PHOTO_PIXELS) throw new Error('Choose a photo no larger than 8192 pixels or 16 million pixels.');
  return { width, height };
}

export function cropRectangle(imageWidth, imageHeight, targetWidth, targetHeight, zoom = 1, x = 0.5, y = 0.5) {
  if (![imageWidth, imageHeight, targetWidth, targetHeight].every(value => Number.isInteger(value) && value > 0)
    || imageWidth > 8192 || imageHeight > 8192 || imageWidth * imageHeight > MAX_PHOTO_PIXELS
    || !Number.isFinite(zoom) || zoom < 1 || zoom > 3 || !Number.isFinite(x) || x < 0 || x > 1
    || !Number.isFinite(y) || y < 0 || y > 1) throw new Error('Choose a smaller photo and valid crop settings.');
  const scale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight) * zoom;
  const width = targetWidth / scale;
  const height = targetHeight / scale;
  return { x: (imageWidth - width) * x, y: (imageHeight - height) * y, width, height };
}

export function makePhotoPack({ id, name, frame, png }) {
  const selected = typeof frame === 'string' && Object.hasOwn(FRAMES, frame) ? FRAMES[frame] : undefined;
  const padding = typeof png === 'string' ? png.endsWith('==') ? 2 : png.endsWith('=') ? 1 : 0 : 0;
  const decodedBytes = typeof png === 'string' ? png.length / 4 * 3 - padding : Infinity;
  if (typeof id !== 'string' || !/^photo-[a-z0-9-]{1,41}$/.test(id) || !selected
    || typeof name !== 'string' || !name.trim() || name.trim().length > 48 || forbidden.test(name)
    || typeof png !== 'string' || !/^[a-zA-Z0-9+/]+={0,2}$/.test(png)
    || png.length % 4 !== 0 || decodedBytes > 256 * 1024) {
    throw new Error('The keepsake could not be exported. Check its name and image.');
  }
  return {
    format: 'charmlet-pack', version: 1, id, name: name.trim(), author: 'Personal Photo Studio',
    charms: [{
      id: 'portrait', name: name.trim(), group: 'Personal Keepsakes',
      description: 'A personal keepsake made in Charmlet Photo Studio.',
      accent: selected.accent, png,
    }],
  };
}
