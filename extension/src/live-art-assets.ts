import {
	artBounds, artToStage, caliArt, isArtCharacter, type ArtBounds, type ArtDefinition, type ArtPart, type ArtPoint, type ArtPose,
} from './live-art-core';
import { regionalArt } from './california-companions';

export interface ArtLayer {
	part: ArtPart;
	bounds: ArtBounds;
	image: HTMLCanvasElement;
	source: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	points: readonly ArtPoint[];
	uv: Float32Array;
	indices: Uint16Array;
	positions: Float32Array;
}
export interface PreparedArt {
	key: string;
	definition: ArtDefinition;
	layers: readonly ArtLayer[];
	hook: HTMLCanvasElement;
}
const PIXEL_SCALE = .5;

function cropPart(part: ArtPart, image: HTMLImageElement): ArtLayer {
	const bounds = artBounds(part.polygon), source = document.createElement('canvas');
	source.width = Math.ceil(bounds.width * PIXEL_SCALE); source.height = Math.ceil(bounds.height * PIXEL_SCALE);
	const context = source.getContext('2d')!;
	context.setTransform(PIXEL_SCALE, 0, 0, PIXEL_SCALE, -bounds.x * PIXEL_SCALE, -bounds.y * PIXEL_SCALE);
	context.beginPath();
	part.polygon.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
	context.closePath(); context.clip(); context.drawImage(image, 0, 0, 1024, 1024);
	if (['hand','thumb','wave'].includes(part.role)) {
		const pixels = context.getImageData(0, 0, source.width, source.height);
		for (let offset = 0; offset < pixels.data.length; offset += 4) {
			// Donor gestures wear a hoodie. Keep only their fur, not its grey cuff on Friday's bare arm.
			const lowerEdge = Math.floor(offset / 4 / source.width) > source.height * .8;
			if (part.role !== 'hand' && lowerEdge && pixels.data[offset] - pixels.data[offset + 2] < 28
				&& Math.abs(pixels.data[offset] - pixels.data[offset + 1]) < 12) {
				pixels.data[offset + 3] = 0;
			}
			const average = (pixels.data[offset] + pixels.data[offset + 2]) / 2;
			if (pixels.data[offset + 3] && pixels.data[offset + 1] > average + 10) {
				pixels.data[offset + 1] = Math.round(average);
			}
		}
		context.putImageData(pixels, 0, 0);
	}
	const dynamic = document.createElement('canvas'); dynamic.width = source.width; dynamic.height = source.height;
	const dynamicContext = dynamic.getContext('2d')!;
	dynamicContext.drawImage(source, 0, 0);
	const curved = part.role === 'head' || part.role === 'figure';
	const columns = curved ? 6 : part.role === 'arm' ? 4 : 1;
	const rows = curved ? 6 : part.role === 'arm' ? 12 : 1;
	const points: ArtPoint[] = [], uv: number[] = [], indices: number[] = [];
	for (let row = 0; row <= rows; row++) {
		for (let col = 0; col <= columns; col++) {
			points.push([bounds.x + col / columns * bounds.width, bounds.y + row / rows * bounds.height]);
			uv.push(col / columns, row / rows);
			if (row < rows && col < columns) {
				const a = row * (columns + 1) + col, b = a + columns + 1;
				indices.push(a, b, a + 1, b, b + 1, a + 1);
			}
		}
	}
	return { part, bounds, image: dynamic, source, context: dynamicContext, points,
		uv: new Float32Array(uv), indices: new Uint16Array(indices), positions: new Float32Array(points.length * 2) };
}

export function paintArtFace(layer: ArtLayer, pose: ArtPose): void {
	if (!layer.part.eyes?.length) { return; }
	const context = layer.context;
	context.clearRect(0, 0, layer.image.width, layer.image.height); context.drawImage(layer.source, 0, 0);
	for (const [index, eye] of layer.part.eyes.entries()) {
		const x = (eye.x - layer.bounds.x) * PIXEL_SCALE, y = (eye.y - layer.bounds.y) * PIXEL_SCALE;
		const rx = eye.rx * PIXEL_SCALE, ry = eye.ry * PIXEL_SCALE;
		const closing = Math.max(pose.blink, pose.wink && index === 0 ? .98 : 0, pose.happy ? .16 : 0);
		context.save(); context.beginPath(); context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); context.clip();
		context.drawImage(layer.source, pose.gazeX * 1.3, -pose.gazeY * .9);
		if (closing > .01) {
			context.drawImage(layer.source, x - rx, y - ry * 3, rx * 2, ry * 2,
				x - rx, y - ry, rx * 2, ry * 2 * closing);
			if (closing > .7) {
				context.strokeStyle = '#25221e'; context.lineWidth = 1.1;
				context.beginPath(); context.moveTo(x - rx * .7, y);
				context.quadraticCurveTo(x, y + ry * .3, x + rx * .7, y); context.stroke();
			}
		}
		context.restore();
	}
}

export function artHook(definition: ArtDefinition): HTMLCanvasElement {
	const canvas = document.createElement('canvas'); canvas.width = 216; canvas.height = 252;
	const context = canvas.getContext('2d')!; context.scale(3, 3);
	const [x,y] = artToStage(definition, definition.anchor);
	const hookX = definition.attachmentX ?? 36;
	context.lineWidth = 1.2; context.lineCap = 'round';
	const metal = context.createLinearGradient(hookX - 6, 0, hookX + 7, 0);
	metal.addColorStop(0, '#fbfcf4'); metal.addColorStop(.45, '#a8b4b9'); metal.addColorStop(1, '#647781');
	context.strokeStyle = metal; context.beginPath(); context.ellipse(hookX, 7, 3, 4, 0, 0, Math.PI * 2); context.stroke();
	context.beginPath(); context.moveTo(hookX, 11); context.quadraticCurveTo(hookX, 14, x, y + 1); context.stroke();
	return canvas;
}

/** Shared by GPU and software renderers so losing a context never loses the loaded outfit. */
export function createArtLibrary(resource: (file: string) => string, invalidate: () => void) {
	let requested = '', prepared: PreparedArt | undefined, disposed = false, generation = 0;
	let error: string | undefined;
	const images = new Map<string, HTMLImageElement>();
	async function load(file: string) {
		const cached = images.get(file); if (cached) { return cached; }
		const image = new Image(); image.src = resource(file);
		await image.decode();
		if (image.naturalWidth < 64 || image.naturalHeight < 64 || image.naturalWidth > 1024 || image.naturalHeight > 1024) {
			throw new Error(`Invalid live artwork: ${file}`);
		}
		return image;
	}
	return {
		get error() { return error; },
		get(pose: ArtPose): PreparedArt | undefined {
			if (!isArtCharacter(pose.character)) { return undefined; }
			const definition = pose.character === 'cali' ? caliArt(pose.now ?? Date.now()) : regionalArt(pose.character);
			if (!definition) { return undefined; }
			const key = `${definition.character}:${definition.outfit ?? ''}`;
			if (requested === key) { return prepared; }
			requested = key; prepared = undefined; error = undefined;
			const token = ++generation, files = [...new Set(definition.parts.map(part => part.file))];
			void Promise.all(files.map(async file => [file, await load(file)] as const)).then(loaded => {
				if (disposed || token !== generation) { return; }
				images.clear(); for (const [file, image] of loaded) { images.set(file, image); }
				prepared = { key, definition, layers: definition.parts.map(part => cropPart(part, images.get(part.file)!)),
					hook: artHook(definition) };
				invalidate();
			}).catch((cause: unknown) => {
				if (disposed || token !== generation) { return; }
				const reason = cause instanceof Error ? cause.message : 'Image preparation failed';
				error = `Could not load ${definition.character} artwork: ${reason.slice(0, 160)}`;
				invalidate();
			});
			return undefined;
		},
		dispose() { disposed = true; generation++; prepared = undefined; images.clear(); },
	};
}
export type ArtLibrary = ReturnType<typeof createArtLibrary>;
