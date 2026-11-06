export type PhotoFrame = 'mint' | 'copper' | 'paper';
export const PHOTO_WIDTH: number;
export const PHOTO_HEIGHT: number;
export const MAX_PHOTO_BYTES: number;
export const MAX_PHOTO_PIXELS: number;
export const FRAMES: Readonly<Record<PhotoFrame, {
	name: string; accent: string; x: number; y: number; width: number; height: number; shape: 'rect' | 'circle';
}>>;
export function inspectPhotoHeader(bytes: Uint8Array, type: string): { width: number; height: number };
export function cropRectangle(imageWidth: number, imageHeight: number, targetWidth: number, targetHeight: number,
	zoom?: number, x?: number, y?: number): { x: number; y: number; width: number; height: number };
export function drawPhotoCharm(canvas: HTMLCanvasElement, bitmap: ImageBitmap | undefined, frame: PhotoFrame,
	zoom?: number, x?: number, y?: number): void;
export function makePhotoPack(value: { id: string; name: string; frame: PhotoFrame; png: string }): {
	format: 'charmlet-pack'; version: 1; id: string; name: string; author: string;
	charms: Array<{ id: string; name: string; group: string; description: string; accent: string; png: string }>;
};
