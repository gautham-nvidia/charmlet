import { BUBBLES, type FidgetKind, type SpinnerDesign } from './interactive-motion';
import { DEFAULT_PUZZLES, type PuzzleState } from './puzzle-core';
import { drawPuzzle } from './puzzle-renderer';

export interface FidgetPose {
	kind: FidgetKind;
	angle: number;
	rock: number;
	pressed: boolean;
	bubbles: readonly boolean[];
	design?: SpinnerDesign;
	puzzles?: PuzzleState;
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string | CanvasGradient) {
	context.fillStyle = fill;
	context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
}

function drawSpinner(context: CanvasRenderingContext2D, angle: number, design: SpinnerDesign = 'classic') {
	context.strokeStyle = '#9aadb6'; context.lineWidth = 2.2;
	context.beginPath(); context.moveTo(36, 15); context.lineTo(36, 46); context.stroke();
	context.save(); context.translate(36, 46); context.rotate(angle);
	const metal = context.createLinearGradient(-26, -25, 25, 25);
	metal.addColorStop(0, '#b0f5ee'); metal.addColorStop(.4, '#51bfc4'); metal.addColorStop(1, '#216d7e');
	if (design === 'classic') { drawClassicRotor(context, metal); }
	if (design === 'orbit') { drawOrbitRotor(context); }
	if (design === 'pinwheel') { drawPinwheelRotor(context); }
	if (design === 'bar') { drawBarRotor(context); }
	context.restore();
	const hub = context.createRadialGradient(33, 42, 1, 36, 46, 9);
	hub.addColorStop(0, '#f8ffff'); hub.addColorStop(.6, '#b5c9d1'); hub.addColorStop(1, '#617e8b');
	circle(context, 36, 46, 9, '#306a75'); circle(context, 36, 46, 7.2, hub);
	circle(context, 36, 46, 1.8, '#6e909b');
}

function drawClassicRotor(context: CanvasRenderingContext2D, metal: CanvasGradient) {
	for (let index = 0; index < 3; index++) {
		context.save(); context.rotate(index * Math.PI * 2 / 3);
		context.lineWidth = 13; context.strokeStyle = '#347f8c';
		context.beginPath(); context.moveTo(0, 0); context.lineTo(0, -18); context.stroke();
		context.lineWidth = 10; context.strokeStyle = metal; context.stroke();
		circle(context, 0, -19, 11, metal);
		circle(context, 0, -19, 7.2, '#d5e2e6');
		circle(context, 0, -19, 5.7, '#365763');
		circle(context, 0, -19, 3.6, '#7d9aa4');
		context.strokeStyle = '#efffff'; context.lineWidth = .7;
		context.beginPath(); context.arc(0, -19, 9.3, Math.PI, Math.PI * 1.65); context.stroke();
		context.restore();
	}
}

function drawOrbitRotor(context: CanvasRenderingContext2D) {
	const metal = context.createLinearGradient(-26, -26, 26, 26);
	metal.addColorStop(0, '#ede7ff'); metal.addColorStop(.5, '#8b84d5'); metal.addColorStop(1, '#41366f');
	context.strokeStyle = metal; context.lineWidth = 6;
	context.beginPath(); context.arc(0, 0, 25, 0, Math.PI * 2); context.stroke();
	for (let index = 0; index < 3; index++) {
		context.save(); context.rotate(index * Math.PI * 2 / 3);
		context.lineWidth = 3; context.beginPath(); context.moveTo(0, 0); context.lineTo(0, -25); context.stroke();
		circle(context, 0, -25, 5, ['#f8ca74', '#9ee9e0', '#d4bafa'][index]);
		circle(context, -1, -27, 1.3, '#fff9');
		context.restore();
	}
}

function drawPinwheelRotor(context: CanvasRenderingContext2D) {
	for (const color of ['#ffb66e', '#ed829c', '#b7a3f4', '#7bcbdf', '#b5d989']) {
		const foil = context.createLinearGradient(-3, -24, 22, 2);
		foil.addColorStop(0, '#fff3dc'); foil.addColorStop(.35, color); foil.addColorStop(1, '#465b65');
		context.fillStyle = foil; context.strokeStyle = '#ffffff77'; context.lineWidth = .7;
		context.beginPath(); context.moveTo(0, -4); context.quadraticCurveTo(12, -28, 24, -12);
		context.quadraticCurveTo(5, -14, 4, 0); context.closePath(); context.fill(); context.stroke();
		context.rotate(Math.PI * 2 / 5);
	}
}

function drawBarRotor(context: CanvasRenderingContext2D) {
	const brass = context.createLinearGradient(-22, -10, 22, 10);
	brass.addColorStop(0, '#fff0c5'); brass.addColorStop(.4, '#d2b071'); brass.addColorStop(1, '#7c5b45');
	context.fillStyle = brass;
	context.beginPath(); context.roundRect(-29, -10, 58, 20, 10); context.fill();
	context.strokeStyle = '#fff7d9'; context.lineWidth = .8; context.stroke();
	for (const x of [-20, 20]) {
		circle(context, x, 0, 7.6, '#4b535e'); circle(context, x, 0, 5.8, '#bdd0d8');
		circle(context, x, 0, 3.8, '#657985'); circle(context, x - 1, -2, 1.1, '#f1f7ec');
	}
}

function drawBubbles(context: CanvasRenderingContext2D, bubbles: readonly boolean[]) {
	context.strokeStyle = '#aab9c4'; context.lineWidth = 1.8;
	context.beginPath(); context.moveTo(36, 15); context.lineTo(36, 23); context.stroke();
	const base = context.createLinearGradient(9, 22, 63, 79);
	base.addColorStop(0, '#f3d4d1'); base.addColorStop(.4, '#dca2ae'); base.addColorStop(1, '#ab718e');
	context.fillStyle = base; context.beginPath(); context.roundRect(9, 20, 54, 61, 12); context.fill();
	context.strokeStyle = '#fff5'; context.lineWidth = 1;
	context.beginPath(); context.roundRect(11, 22, 50, 57, 10); context.stroke();
	for (const [index, { x, y }] of BUBBLES.entries()) {
		const pressed = bubbles[index];
		const fill = context.createRadialGradient(x - 2, y - 3, 1, x, y, 9);
		fill.addColorStop(0, pressed ? '#98657f' : '#fff0e9');
		fill.addColorStop(.55, pressed ? '#ba8599' : '#eab9bd');
		fill.addColorStop(1, pressed ? '#efc3c6' : '#ad738c');
		circle(context, x, y, 9.4, '#b77e93'); circle(context, x, y, 8.3, fill);
		if (pressed) {
			context.strokeStyle = '#f7d6d7'; context.lineWidth = .9;
			context.beginPath(); context.arc(x, y, 6.7, .3, 2.6); context.stroke();
		}
	}
}

function drawStone(context: CanvasRenderingContext2D, pose: FidgetPose) {
	context.strokeStyle = '#aab9c4'; context.lineWidth = 1.8;
	context.beginPath(); context.moveTo(36, 15); context.lineTo(36, 24); context.stroke();
	context.save(); context.translate(36, 18); context.rotate(pose.rock); context.translate(-36, -18);
	const jade = context.createRadialGradient(24, 33, 2, 37, 50, 37);
	jade.addColorStop(0, '#e6eee0'); jade.addColorStop(.3, '#b9d8bc'); jade.addColorStop(.7, '#79aa96'); jade.addColorStop(1, '#386e66');
	context.fillStyle = jade; context.beginPath(); context.ellipse(36, 49, 24, 30, -.12, 0, Math.PI * 2); context.fill();
	context.save(); context.clip(); context.strokeStyle = '#f7fff62b'; context.lineWidth = 1.4;
	for (let index = 0; index < 4; index++) {
		context.beginPath(); context.moveTo(10, 31 + index * 12);
		context.bezierCurveTo(28, 45 + index * 6, 46, 14 + index * 17, 67, 32 + index * 13); context.stroke();
	}
	context.restore();
	const thumb = context.createRadialGradient(37, 47, 2, 35, 49, 16);
	thumb.addColorStop(0, pose.pressed ? '#477f72' : '#689d88');
	thumb.addColorStop(.7, '#8cbaa2'); thumb.addColorStop(1, '#d1e5cd');
	context.fillStyle = thumb; context.beginPath(); context.ellipse(36, 49, 11, 16, -.12, 0, Math.PI * 2); context.fill();
	context.strokeStyle = pose.pressed ? '#f1ffdecc' : '#f1ffde77'; context.lineWidth = 1.1;
	context.beginPath(); context.ellipse(36, 49, 11, 16, -.12, .4, 2.9); context.stroke();
	context.restore();
}

export function createFidgetRenderer(canvas: HTMLCanvasElement) {
	const context = canvas.getContext('2d');
	if (!context) { return undefined; }
	return (pose: FidgetPose) => {
		context.setTransform(3, 0, 0, 3, 0, 0); context.clearRect(0, 0, 72, 84);
		context.lineCap = 'round'; context.lineJoin = 'round';
		context.strokeStyle = '#aab9c4'; context.lineWidth = 1.8;
		context.beginPath(); context.ellipse(36, 9, 5, 6, 0, 0, Math.PI * 2); context.stroke();
		switch (pose.kind) {
			case 'spinner': drawSpinner(context, pose.angle, pose.design); break;
			case 'bubbles': drawBubbles(context, pose.bubbles); break;
			case 'stone': drawStone(context, pose); break;
			case 'cube': case 'tiles': case 'lights': drawPuzzle(context, pose.kind, pose.puzzles ?? DEFAULT_PUZZLES); break;
		}
	};
}
