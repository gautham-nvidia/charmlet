import type { LiveCharacter } from './interactive-motion';

export interface SmileyPose {
	character: LiveCharacter;
	gazeX: number;
	gazeY: number;
	blink: number;
	pressed: boolean;
	happy: boolean;
	wink: boolean;
	greeting: boolean;
}
export interface SmileyRenderer {
	kind: 'webgl' | 'canvas';
	draw(pose: SmileyPose): void;
	dispose(): void;
}

const vertexSource = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

// Analytic sphere, cloud lobes and a bevelled robot head share surface lighting.
// Only one small canvas is allocated, regardless of collection size.
const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform vec2 gaze;
uniform float blink;
uniform float pressed;
uniform float happy;
uniform float character;
uniform float wink;
uniform float greeting;
out vec4 outputColor;

float oval(vec2 p, vec2 center, vec2 radius) {
  float distance = length((p - center) / radius);
  return 1.0 - smoothstep(0.94, 1.02, distance);
}
float line(float distance, float width) {
  return 1.0 - smoothstep(width, width + 0.025, distance);
}
float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}
vec4 surface(vec2 p) {
  float radius = dot(p, p);
  vec3 normal = normalize(vec3(p, sqrt(max(0.0, 1.0 - radius))));
  float alpha = 1.0 - smoothstep(0.97, 1.015, radius);
  if (character > 2.5) {
    float cheer = max(happy, greeting);
    vec3 lobes[8] = vec3[8](vec3(0.0, 0.30, 0.57),
      vec3(-0.50, 0.82, 0.23), vec3(0.50, 0.82, 0.23), vec3(0.0, -0.49, 0.44),
      vec3(-0.65, -0.29 + cheer * 0.50, 0.22), vec3(0.65, -0.29 + cheer * 0.50, 0.22),
      vec3(-0.30, -0.91, 0.19), vec3(0.30, -0.91, 0.19));
    float depth = -1.0;
    alpha = 0.0;
    for (int i = 0; i < 8; i++) {
      vec2 local = p - lobes[i].xy;
      float z = sqrt(max(0.0, lobes[i].z * lobes[i].z - dot(local, local)));
      alpha = max(alpha, 1.0 - smoothstep(lobes[i].z - 0.012, lobes[i].z + 0.012, length(local)));
      if (z > depth) { normal = normalize(vec3(local, max(0.01, z))); depth = z; }
    }
  } else if (character > 0.5 && character < 1.5) {
    vec3 lobes[5] = vec3[5](vec3(-0.51, -0.06, 0.47), vec3(0.51, -0.06, 0.47),
      vec3(-0.25, 0.30, 0.55), vec3(0.20, 0.24, 0.62), vec3(0.0, -0.22, 0.70));
    float depth = -1.0;
    alpha = 0.0;
    for (int i = 0; i < 5; i++) {
      vec2 local = p - lobes[i].xy;
      float squared = dot(local, local);
      float z = sqrt(max(0.0, lobes[i].z * lobes[i].z - squared));
      alpha = max(alpha, 1.0 - smoothstep(lobes[i].z - 0.012, lobes[i].z + 0.012, length(local)));
      if (z > depth) { normal = normalize(vec3(local, max(0.01, z))); depth = z; }
    }
  } else if (character > 1.5) {
    float head = roundedBox(p, vec2(0.87, 0.76), 0.23);
    float ears = roundedBox(vec2(abs(p.x) - 0.91, p.y - 0.02), vec2(0.14, 0.25), 0.09);
    alpha = 1.0 - smoothstep(-0.012, 0.012, min(head, ears));
    vec2 bevel = sign(p) * max(abs(p) - vec2(0.64, 0.53), 0.0) / 0.23;
    normal = normalize(vec3(bevel, sqrt(max(0.08, 1.0 - dot(bevel, bevel)))));
  }
  return vec4(normal, alpha);
}
void main() {
  vec2 pixel = gl_FragCoord.xy / resolution * vec2(72.0, 84.0);
  vec2 p = (pixel - vec2(36.0, 38.0)) / 30.0;
  vec4 body = surface(p);
  float alpha = body.a;
  vec3 normal = body.xyz;
  vec3 light = normalize(vec3(-0.55, 0.75, 1.0));
  float diffuse = max(0.0, dot(normal, light));
  float gloss = pow(max(0.0, dot(normal, normalize(light + vec3(0.0, 0.0, 1.0)))), 42.0);
  float lighting = 0.38 + 0.62 * diffuse;
  vec3 material = vec3(1.0, 0.70, 0.035);
  vec3 ink = vec3(0.036, 0.022, 0.015);
  vec3 eyeWhite = vec3(0.97, 0.96, 0.89);
  if (character > 0.5) { material = vec3(0.64, 0.83, 0.94); ink = vec3(0.025, 0.06, 0.12); }
  if (character > 1.5 && character < 2.5) {
    material = vec3(0.30, 0.54, 0.53);
    float screen = 1.0 - smoothstep(-0.01, 0.01, roundedBox(p - vec2(0.0, -0.02), vec2(0.73, 0.57), 0.18));
    material = mix(material, vec3(0.014, 0.035, 0.055), screen);
    ink = vec3(0.25, 1.0, 0.74);
    eyeWhite = vec3(0.18, 0.65, 0.52);
  }
  if (character > 2.5) {
    material = vec3(0.59, 0.30, 0.11);
    ink = vec3(0.055, 0.026, 0.012);
    eyeWhite = vec3(0.99, 0.94, 0.82);
    float cream = max(oval(p, vec2(0.0, -0.51), vec2(0.31, 0.34)),
      oval(p, vec2(0.0, 0.04), vec2(0.30, 0.20)));
    cream = max(cream, oval(p, vec2(-0.50, 0.82), vec2(0.12)));
    cream = max(cream, oval(p, vec2(0.50, 0.82), vec2(0.12)));
    material = mix(material, vec3(0.94, 0.72, 0.44), cream);
    float scarf = (1.0 - smoothstep(0.05, 0.08, abs(p.y + 0.15)))
      * (1.0 - smoothstep(0.27, 0.37, abs(p.x)));
    material = mix(material, vec3(0.055, 0.42, 0.39), scarf);
    material = mix(material, ink, oval(p, vec2(0.0, 0.20), vec2(0.105, 0.065)));
    p = (p - vec2(0.0, 0.30)) / 0.60;
  }
  for (int index = 0; index < 2; index++) {
    float closing = max(max(blink, happy * 0.92), wink * (index == 0 ? 1.0 : 0.0));
    float side = index == 0 ? -1.0 : 1.0;
    vec2 eye = vec2(side * 0.30, 0.20);
    vec2 eyeSize = vec2(0.195, max(0.025, (0.26 + greeting * 0.035) * (1.0 - closing)));
    float white = oval(p, eye, eyeSize) * (1.0 - smoothstep(0.70, 0.96, closing));
    material = mix(material, eyeWhite, white);
    vec2 pupil = eye + gaze * vec2(0.07, 0.09);
    float pupilMask = oval(p, pupil, vec2(0.092)) * white;
    material = mix(material, ink, pupilMask);
    material = mix(material, vec3(1.0), oval(p, pupil + vec2(-0.025, 0.035), vec2(0.025)) * pupilMask);
    float eyeArc = eye.y + 0.02 - 1.3 * pow(p.x - eye.x, 2.0);
    float shut = line(abs(p.y - eyeArc), 0.022) * (1.0 - smoothstep(0.17, 0.21, abs(p.x - eye.x)));
    material = mix(material, ink, shut * smoothstep(0.72, 0.96, closing));
    float brow = line(abs(p.y - (0.53 + pressed * 0.06 - 0.8 * pow(p.x - eye.x, 2.0))), 0.018);
    brow *= 1.0 - smoothstep(0.14, 0.18, abs(p.x - eye.x));
    material = mix(material, ink, brow * max(pressed * 0.75, greeting * 0.5));
  }
  float smileY = -0.40 - greeting * 0.04 + (0.64 + greeting * 0.2) * p.x * p.x;
  float smile = line(abs(p.y - smileY), 0.027);
  smile *= 1.0 - smoothstep(0.43, 0.46, abs(p.x));
  float surprised = oval(p, vec2(0.0, -0.34), vec2(0.12, 0.17));
  material = mix(material, ink, mix(smile, surprised, pressed));
  float cheeks = oval(p, vec2(-0.53, -0.15), vec2(0.13, 0.075))
    + oval(p, vec2(0.53, -0.15), vec2(0.13, 0.075));
  material = mix(material, character > 0.5 ? vec3(0.95, 0.46, 0.50) : vec3(0.95, 0.30, 0.12),
    cheeks * (0.10 + happy * 0.18) * (character > 1.5 && character < 2.5 ? 0.0 : 1.0));
  float shine = mix(0.02, 0.28, smoothstep(0.08, 0.35, dot(material, vec3(0.3, 0.6, 0.1))));
  vec3 color = pow(material * lighting + vec3(gloss * shine), vec3(1.0 / 2.2));
  // The silver eyelet and bail meet the top of the sphere at y=17.
  float ringDistance = abs(length((pixel - vec2(36.0, 75.0)) / vec2(5.0, 6.0)) - 1.0);
  float ring = 1.0 - smoothstep(0.12, 0.22, ringDistance);
  float bail = (1.0 - smoothstep(1.0, 1.6, abs(pixel.x - 36.0)))
    * step(character > 2.5 ? 64.0 : character > 1.5 ? 60.0 : 66.0, pixel.y) * (1.0 - smoothstep(69.0, 70.0, pixel.y));
  float metalAlpha = max(ring, bail) * (1.0 - alpha);
  vec3 metal = mix(vec3(0.48, 0.55, 0.61), vec3(0.94, 0.97, 1.0), clamp((40.0 - pixel.x) / 10.0, 0.0, 1.0));
  color = mix(color, metal, metalAlpha);
  outputColor = vec4(color, max(alpha, metalAlpha));
}`;

export function createWebGLSmiley(canvas: HTMLCanvasElement): SmileyRenderer | undefined {
	const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
	if (!gl) { return undefined; }
	const shaders: WebGLShader[] = [];
	const program = gl.createProgram();
	const buffer = gl.createBuffer();
	const dispose = () => {
		for (const shader of shaders) { gl.deleteShader(shader); }
		gl.deleteProgram(program);
		gl.deleteBuffer(buffer);
	};
	try {
		if (!program || !buffer) { throw new Error('Graphics resources unavailable.'); }
		for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
			const shader = gl.createShader(type);
			if (!shader) { throw new Error('Shader unavailable.'); }
			shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { throw new Error('The graphics driver could not compile the smiley.'); }
			gl.attachShader(program, shader);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { throw new Error('The graphics driver could not link the smiley.'); }
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
		const position = gl.getAttribLocation(program, 'position');
		gl.enableVertexAttribArray(position);
		gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
		const uniforms = Object.fromEntries(['resolution', 'gaze', 'blink', 'pressed', 'happy', 'character', 'wink', 'greeting']
			.map(name => [name, gl.getUniformLocation(program, name)]));
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
		return {
			kind: 'webgl', dispose,
			draw(pose) {
				gl.uniform2f(uniforms.gaze, pose.gazeX, pose.gazeY);
				gl.uniform1f(uniforms.blink, pose.blink);
				gl.uniform1f(uniforms.pressed, Number(pose.pressed));
				gl.uniform1f(uniforms.happy, Number(pose.happy));
				gl.uniform1f(uniforms.character, pose.character === 'sunny' ? 0 : pose.character === 'cloud' ? 1 : pose.character === 'robot' ? 2 : 3);
				gl.uniform1f(uniforms.wink, Number(pose.wink));
				gl.uniform1f(uniforms.greeting, Number(pose.greeting));
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			},
		};
	} catch {
		dispose();
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return undefined;
	}
}

function drawCaliBody(context: CanvasRenderingContext2D, pose: SmileyPose) {
	const raised = pose.happy || pose.greeting ? 15 : 0;
	const lobes = [[21, 21, 7], [51, 21, 7], [36, 61, 14],
		[27, 75, 6], [45, 75, 6], [16.5, 55 - raised, 7], [55.5, 55 - raised, 7], [36, 37, 17.5]];
	for (const [x, y, radius] of lobes) {
		const gradient = context.createRadialGradient(x - radius * .35, y - radius * .45, 1, x, y, radius * 1.2);
		gradient.addColorStop(0, '#f4ca88'); gradient.addColorStop(.5, '#cb9250'); gradient.addColorStop(1, '#855026');
		context.fillStyle = gradient; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
	}
	context.fillStyle = '#edc796';
	for (const [x, y, rx, ry] of [[21, 21, 3.5, 3.5], [51, 21, 3.5, 3.5], [36, 61, 9, 10], [36, 44, 9, 6]]) {
		context.beginPath(); context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); context.fill();
	}
	context.fillStyle = '#409d94'; context.beginPath(); context.roundRect(26, 49, 20, 4, 2); context.fill();
	context.fillStyle = '#36271e'; context.beginPath(); context.ellipse(36, 40, 3.2, 2, 0, 0, Math.PI * 2); context.fill();
}

/** Keep the same interactions on hosts that cannot create a WebGL context. */
export function createCanvasSmiley(canvas: HTMLCanvasElement): SmileyRenderer | undefined {
	const context = canvas.getContext('2d');
	if (!context) { return undefined; }
	return {
		kind: 'canvas', dispose() { context.clearRect(0, 0, canvas.width, canvas.height); },
		draw(pose) {
			context.setTransform(3, 0, 0, 3, 0, 0);
			context.clearRect(0, 0, 72, 84);
			context.lineWidth = 1.8; context.strokeStyle = '#aab9c4'; context.lineCap = 'round';
			context.beginPath(); context.ellipse(36, 9, 5, 6, 0, 0, Math.PI * 2); context.stroke();
			context.beginPath(); context.moveTo(36, 15); context.lineTo(36, 26); context.stroke();
			if (pose.character === 'cali') { drawCaliBody(context, pose); }
			const gradient = context.createRadialGradient(25, 31, 3, 36, 46, 36);
			const colors = pose.character === 'sunny' ? ['#fff2a7', '#ffdc45', '#bf7d19']
				: pose.character === 'cloud' ? ['#ffffff', '#d5edf7', '#8cbbd1'] : ['#e0efeb', '#90b9b0', '#426c68'];
			gradient.addColorStop(0, colors[0]); gradient.addColorStop(.35, colors[1]); gradient.addColorStop(1, colors[2]);
			context.fillStyle = gradient;
			context.beginPath();
			if (pose.character === 'sunny') { context.arc(36, 46, 30, 0, Math.PI * 2); }
			else if (pose.character === 'cloud') {
				context.moveTo(17, 69);
				context.bezierCurveTo(-2, 69, 1, 42, 13, 39);
				context.bezierCurveTo(9, 18, 34, 14, 43, 24);
				context.bezierCurveTo(59, 17, 67, 31, 62, 41);
				context.bezierCurveTo(78, 49, 67, 74, 53, 69);
				context.bezierCurveTo(42, 77, 24, 76, 17, 69);
			} else if (pose.character === 'robot') {
				context.roundRect(5, 39, 62, 15, 4);
				context.roundRect(10, 23, 52, 46, 7);
			}
			if (pose.character !== 'cali') { context.fill(); }
			if (pose.character === 'robot') {
				context.fillStyle = '#132935'; context.beginPath(); context.roundRect(14, 29, 44, 34, 6); context.fill();
			}
			const ink = pose.character === 'robot' ? '#80ffd4' : '#36271e';
			context.save();
			if (pose.character === 'cali') { context.translate(36, 37); context.scale(.6, .6); context.translate(-36, -46); }
			for (const x of [27, 45]) {
				const closing = Math.max(pose.blink, pose.happy ? .95 : 0, pose.wink && x === 27 ? 1 : 0);
				context.strokeStyle = ink; context.lineWidth = 1.8;
				if (closing > .75) {
					context.beginPath(); context.moveTo(x - 5, 41); context.quadraticCurveTo(x, 37, x + 5, 41); context.stroke();
				} else {
					context.save(); context.beginPath(); context.ellipse(x, 40, 5.8, Math.max(.8, (pose.greeting ? 8.8 : 7.8) * (1 - closing)), 0, 0, Math.PI * 2);
					context.fillStyle = pose.character === 'robot' ? '#53bdab' : '#fffdf1'; context.fill(); context.clip();
					const pupilX = x + pose.gazeX * 2.1, pupilY = 40 - pose.gazeY * 2.7;
					context.fillStyle = ink; context.beginPath(); context.arc(pupilX, pupilY, 2.8, 0, Math.PI * 2); context.fill();
					context.fillStyle = 'white'; context.beginPath(); context.arc(pupilX - .8, pupilY - 1, .8, 0, Math.PI * 2); context.fill(); context.restore();
				}
				if (pose.pressed || pose.greeting) { context.beginPath(); context.moveTo(x - 4, 28); context.quadraticCurveTo(x, 26, x + 4, 28); context.stroke(); }
			}
			context.strokeStyle = ink; context.lineWidth = 2.1;
			context.beginPath();
			if (pose.pressed) { context.ellipse(36, 56, 3.6, 5.1, 0, 0, Math.PI * 2); context.fillStyle = ink; context.fill(); }
			else { context.moveTo(23, 54); context.quadraticCurveTo(36, 66, 49, 54); context.stroke(); }
			if (pose.happy && pose.character !== 'robot') {
				context.fillStyle = '#dc743e55';
				for (const x of [20, 52]) { context.beginPath(); context.ellipse(x, 50, 4, 2.3, 0, 0, Math.PI * 2); context.fill(); }
			}
			context.restore();
		},
	};
}
