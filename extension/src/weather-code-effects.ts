import { artReaction, type ArtBounds, type ArtPose } from './live-art-core';

function weather(pose: ArtPose): 'sunrise' | 'rain' | 'lightning' | undefined {
	if (pose.pressed) { return 'rain'; }
	if (pose.gesture === 'sunrise' || pose.gesture === 'rain' || pose.gesture === 'lightning') { return pose.gesture; }
	return pose.happy || pose.greeting ? 'sunrise' : undefined;
}

export function paintWeather(context: CanvasRenderingContext2D, pose: ArtPose, plane: 'weather-back' | 'weather-front'): void {
	const kind = weather(pose);
	if (!kind) { return; }
	const amount = pose.pressed ? 1 : artReaction(pose);
	const phase = pose.reducedMotion ? .5 : Math.max(0, Math.min(1, pose.reactionProgress ?? .5));
	context.globalAlpha = amount;
	if (plane === 'weather-back') {
		if (kind !== 'sunrise') { return; }
		const x = 285, y = 420 - (pose.reducedMotion ? 1 : Math.min(1, phase * 3)) * 110;
		const halo = context.createRadialGradient(x, y, 65, x, y, 145);
		halo.addColorStop(0, '#ffc663aa'); halo.addColorStop(1, '#ffc66300');
		context.fillStyle = halo; context.beginPath(); context.arc(x, y, 145, 0, Math.PI * 2); context.fill();
		const sun = context.createRadialGradient(x - 30, y - 35, 10, x, y, 96);
		sun.addColorStop(0, '#fff6bf'); sun.addColorStop(.6, '#ffd06d'); sun.addColorStop(1, '#ee9a4c');
		context.fillStyle = sun; context.beginPath(); context.arc(x, y, 96, 0, Math.PI * 2); context.fill();
		return;
	}
	if (kind === 'rain' || kind === 'lightning') {
		const time = pose.reducedMotion ? 0 : (pose.now ?? 0) / 720;
		const count = kind === 'rain' ? 7 : 4;
		for (let index = 0; index < count; index++) {
			const fall = (time + index * .19) % 1;
			const x = 250 + index * (kind === 'rain' ? 80 : 145) - fall * 14;
			const y = 832 + fall * 122;
			context.globalAlpha = amount * (.55 + Math.sin(fall * Math.PI) * .45);
			context.fillStyle = '#6bc5f2'; context.strokeStyle = '#c9edff'; context.lineWidth = 3;
			context.beginPath(); context.moveTo(x + 9, y);
			context.bezierCurveTo(x + 2, y + 13, x - 11, y + 23, x - 9, y + 31);
			context.bezierCurveTo(x - 6, y + 44, x + 12, y + 41, x + 13, y + 29);
			context.closePath(); context.fill(); context.stroke();
		}
	}
	if (kind === 'lightning') {
		// One local bolt and a gentle glow; no repeated or full-canvas flashes.
		context.globalAlpha = amount;
		context.shadowColor = '#ffd979'; context.shadowBlur = pose.reducedMotion ? 0 : 12;
		context.fillStyle = '#ffe594'; context.strokeStyle = '#d49d39'; context.lineWidth = 3;
		context.beginPath(); context.moveTo(545,768); context.lineTo(482,888); context.lineTo(531,880);
		context.lineTo(485,999); context.lineTo(620,836); context.lineTo(565,846);
		context.lineTo(605,768); context.closePath(); context.fill(); context.stroke();
	}
}

export function paintBinaryDisplay(context: CanvasRenderingContext2D, pose: ArtPose, display: ArtBounds): void {
	const { x, y, width, height } = display;
	context.beginPath(); context.roundRect(x, y, width, height, 32); context.clip();
	const phase = pose.reducedMotion ? 1 : Math.max(0, Math.min(1, pose.reactionProgress ?? .5));
	const action = pose.pressed ? 'binary' : pose.gesture;
	const centre = x + width / 2 + (pose.reducedMotion ? 0 : pose.gazeX * 8);
	context.textAlign = 'center'; context.textBaseline = 'middle';
	context.fillStyle = '#9cecf0'; context.shadowColor = '#52d6ec'; context.shadowBlur = 8;
	if (action === 'binary') {
		const step = pose.reducedMotion ? 0 : Math.floor((pose.now ?? 0) / 155) % 4;
		const lines = ['0101', '1010', '1100', '0011'];
		context.font = 'bold 64px Consolas, monospace';
		context.fillText(lines[step], centre, y + height * .31);
		context.fillStyle = '#63c2df'; context.fillText(lines[(step + 1) % 4], centre, y + height * .75);
	} else if (action === 'compile' && phase > .58 || pose.happy) {
		context.shadowBlur = 6; context.strokeStyle = '#9ae7ba'; context.lineWidth = 15;
		context.lineCap = 'round'; context.lineJoin = 'round';
		context.beginPath(); context.moveTo(centre - 54, y + 77); context.lineTo(centre - 13, y + 115);
		context.lineTo(centre + 63, y + 36); context.stroke();
	} else {
		context.font = 'bold 108px Consolas, monospace';
		const text = action === 'compile' ? '{ }' : action === 'cursor' || pose.greeting ? '>_' : pose.blink > .35 ? '10' : '01';
		context.fillText(text, centre, y + height * .53);
		if (action === 'compile') {
			context.shadowBlur = 0; context.fillStyle = '#9ae7ba';
			context.fillRect(x + 45, y + height - 13, (width - 90) * Math.min(1, phase / .58), 7);
		}
	}
}
