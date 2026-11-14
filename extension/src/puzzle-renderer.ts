import { CUBE_COLORS, CUBE_FACES, type CubeFace, type PuzzleKind, type PuzzleState } from './puzzle-core';

function shade(hex: string, brightness: number): string {
	const value = parseInt(hex.slice(1), 16);
	const channels = [value >> 16, value >> 8 & 255, value & 255].map(channel => Math.min(255, Math.round(channel * brightness)));
	return `rgb(${channels.join(',')})`;
}
function cubeFace(context: CanvasRenderingContext2D, cube: readonly number[], face: CubeFace,
	origin: readonly number[], horizontal: readonly number[], vertical: readonly number[], brightness: number) {
	const offset = CUBE_FACES.indexOf(face) * 9;
	for (let row = 0; row < 3; row++) {
		for (let column = 0; column < 3; column++) {
			context.beginPath();
			for (const [index, [u, v]] of [[.05, .05], [.95, .05], [.95, .95], [.05, .95]].entries()) {
				const x = origin[0] + horizontal[0] * (column + u) / 3 + vertical[0] * (row + v) / 3;
				const y = origin[1] + horizontal[1] * (column + u) / 3 + vertical[1] * (row + v) / 3;
				if (index === 0) { context.moveTo(x, y); } else { context.lineTo(x, y); }
			}
			context.closePath();
			context.fillStyle = shade(CUBE_COLORS[cube[offset + row * 3 + column]], brightness);
			context.fill(); context.lineWidth = .5; context.strokeStyle = '#ffffff48'; context.stroke();
		}
	}
}

export function drawPuzzle(context: CanvasRenderingContext2D, kind: PuzzleKind, state: PuzzleState) {
	context.strokeStyle = '#aab9c4'; context.lineWidth = 1.8;
	context.beginPath(); context.moveTo(36, 15); context.lineTo(36, 24); context.stroke();
	if (kind === 'cube') {
		context.fillStyle = '#24323c';
		context.beginPath(); context.moveTo(36, 18); context.lineTo(65, 34); context.lineTo(65, 64);
		context.lineTo(36, 81); context.lineTo(7, 64); context.lineTo(7, 34); context.closePath(); context.fill();
		cubeFace(context, state.cube, 'U', [36, 18], [29, 16], [-29, 16], 1.06);
		cubeFace(context, state.cube, 'F', [7, 34], [29, 16], [0, 30], .94);
		cubeFace(context, state.cube, 'R', [36, 50], [29, -16], [0, 30], .77);
		return;
	}
	const material = context.createLinearGradient(10, 20, 60, 80);
	material.addColorStop(0, kind === 'tiles' ? '#d7b889' : '#596c86');
	material.addColorStop(1, kind === 'tiles' ? '#765b42' : '#222b42');
	context.fillStyle = material; context.beginPath(); context.roundRect(8, 21, 56, 60, 8); context.fill();
	context.strokeStyle = '#ffffff66'; context.lineWidth = .7; context.stroke();
	for (let cell = 0; cell < 9; cell++) {
		const x = 13 + cell % 3 * 16, y = 27 + Math.floor(cell / 3) * 16;
		if (kind === 'tiles') {
			const number = state.tiles[cell];
			context.fillStyle = number ? '#f4e6ce' : '#4f4037';
			context.beginPath(); context.roundRect(x, y, 14, 14, 2); context.fill();
			if (number) {
				context.fillStyle = '#514638'; context.font = 'bold 10px system-ui, sans-serif';
				context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(number), x + 7, y + 7.3);
			}
		} else {
			const on = Boolean(state.lights & (1 << cell));
			const light = context.createRadialGradient(x + 5, y + 4, .5, x + 7, y + 7, 6);
			light.addColorStop(0, on ? '#fff4b8' : '#455773'); light.addColorStop(1, on ? '#e1a952' : '#1f2c46');
			context.fillStyle = light; context.beginPath(); context.arc(x + 7, y + 7, 5.7, 0, Math.PI * 2); context.fill();
			context.strokeStyle = on ? '#ffe19a' : '#73849b'; context.lineWidth = .6; context.stroke();
		}
	}
}
