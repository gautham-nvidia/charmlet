/** Attachment coordinates within the artwork, independent of image resolution. */
export interface CharmAttachment {
	x: number;
	y: number;
}

export const DEFAULT_ATTACHMENT: Readonly<CharmAttachment> = Object.freeze({ x: 0.5, y: 10 / 84 });

export function attachmentFromPixels(width: number, height: number, rgba: Uint8Array): CharmAttachment {
	let bestScore = Number.POSITIVE_INFINITY;
	let sumX = 0;
	let sumY = 0;
	let count = 0;
	const center = (width - 1) / 2;
	const opaque = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height
		&& rgba[(y * width + x) * 4 + 3] >= 128;
	// Prefer the top of a central hook/head, rather than a raised ear or a side ring.
	// The upper half also keeps the attachment above the pendulum's center.
	for (let y = 0; y < height / 2 && y <= bestScore; y++) {
		for (let x = Math.floor(width * 0.35); x < Math.ceil(width * 0.65); x++) {
			if (!opaque(x, y)) { continue; }
			let neighbors = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (opaque(x + dx, y + dy)) { neighbors++; }
				}
			}
			if (neighbors < 3) { continue; }
			const score = y + Math.abs(x - center) * 2.5;
			if (score < bestScore) {
				bestScore = score;
				sumX = x; sumY = y; count = 1;
			} else if (score === bestScore && count === 1 && y === sumY && x === sumX + 1) {
				// Center adjacent pixels, but never average separate horns/hooks into a gap.
				sumX += x; sumY += y; count++;
			}
		}
	}
	if (!count) { return { ...DEFAULT_ATTACHMENT }; }
	const x = (sumX / count + 0.5) / width;
	let y = Math.min(0.5, (sumY / count + height / 84) / height);
	if (!opaque(Math.floor(x * width), Math.floor(y * height))) {
		// A slanted roof, cable or instrument neck can leave the column below
		// its top edge. Keep the inset on the silhouette rather than in a gap.
		let row = Math.floor(y * height);
		while (row > sumY / count && !opaque(Math.floor(x * width), row)) { row--; }
		y = (row + 0.5) / height;
	}
	return {
		x,
		// Let the line enter the silhouette by one logical pixel; the image covers it.
		y,
	};
}
