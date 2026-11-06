export interface SmileyPose {
	gazeX: number;
	gazeY: number;
	blink: number;
	pressed: boolean;
	happy: boolean;
}
export interface SmileyRenderer {
	kind: 'webgl' | 'canvas';
	draw(pose: SmileyPose): void;
	dispose(): void;
}

const vertexSource = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

// The front surface is an analytic 3D sphere. Its normals light both the yellow
// material and the face, so the features belong to the curved surface.
const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 resolution;
uniform vec2 gaze;
uniform float blink;
uniform float pressed;
uniform float happy;
out vec4 outputColor;

float oval(vec2 p, vec2 center, vec2 radius) {
  float distance = length((p - center) / radius);
  return 1.0 - smoothstep(0.94, 1.02, distance);
}
float line(float distance, float width) {
  return 1.0 - smoothstep(width, width + 0.025, distance);
}
void main() {
  vec2 pixel = gl_FragCoord.xy / resolution * vec2(72.0, 84.0);
  vec2 p = (pixel - vec2(36.0, 38.0)) / 30.0;
  float radius = dot(p, p);
  float alpha = 1.0 - smoothstep(0.97, 1.015, radius);
  vec3 normal = normalize(vec3(p, sqrt(max(0.0, 1.0 - radius))));
  vec3 light = normalize(vec3(-0.55, 0.75, 1.0));
  float diffuse = max(0.0, dot(normal, light));
  float gloss = pow(max(0.0, dot(normal, normalize(light + vec3(0.0, 0.0, 1.0)))), 42.0);
  float lighting = 0.38 + 0.62 * diffuse;
  vec3 material = vec3(1.0, 0.70, 0.035);
  vec3 ink = vec3(0.036, 0.022, 0.015);
  float closing = max(blink, happy * 0.92);
  for (int index = 0; index < 2; index++) {
    float side = index == 0 ? -1.0 : 1.0;
    vec2 eye = vec2(side * 0.30, 0.20);
    vec2 eyeSize = vec2(0.195, max(0.025, 0.26 * (1.0 - closing)));
    float white = oval(p, eye, eyeSize) * (1.0 - smoothstep(0.70, 0.96, closing));
    material = mix(material, vec3(0.97, 0.96, 0.89), white);
    vec2 pupil = eye + gaze * vec2(0.07, 0.09);
    float pupilMask = oval(p, pupil, vec2(0.092)) * white;
    material = mix(material, ink, pupilMask);
    material = mix(material, vec3(1.0), oval(p, pupil + vec2(-0.025, 0.035), vec2(0.025)) * pupilMask);
    float eyeArc = eye.y + 0.02 - 1.3 * pow(p.x - eye.x, 2.0);
    float shut = line(abs(p.y - eyeArc), 0.022) * (1.0 - smoothstep(0.17, 0.21, abs(p.x - eye.x)));
    material = mix(material, ink, shut * smoothstep(0.72, 0.96, closing));
    float brow = line(abs(p.y - (0.53 + pressed * 0.06 - 0.8 * pow(p.x - eye.x, 2.0))), 0.018);
    brow *= 1.0 - smoothstep(0.14, 0.18, abs(p.x - eye.x));
    material = mix(material, ink, brow * pressed * 0.75);
  }
  float smileY = -0.40 + 0.64 * p.x * p.x;
  float smile = line(abs(p.y - smileY), 0.027);
  smile *= 1.0 - smoothstep(0.43, 0.46, abs(p.x));
  float surprised = oval(p, vec2(0.0, -0.34), vec2(0.12, 0.17));
  material = mix(material, ink, mix(smile, surprised, pressed));
  float cheeks = oval(p, vec2(-0.53, -0.15), vec2(0.13, 0.075))
    + oval(p, vec2(0.53, -0.15), vec2(0.13, 0.075));
  material = mix(material, vec3(0.95, 0.30, 0.12), cheeks * (0.10 + happy * 0.18));
  float shine = mix(0.02, 0.28, smoothstep(0.08, 0.35, dot(material, vec3(0.3, 0.6, 0.1))));
  vec3 color = pow(material * lighting + vec3(gloss * shine), vec3(1.0 / 2.2));
  // The silver eyelet and bail meet the top of the sphere at y=17.
  float ringDistance = abs(length((pixel - vec2(36.0, 75.0)) / vec2(5.0, 6.0)) - 1.0);
  float ring = 1.0 - smoothstep(0.12, 0.22, ringDistance);
  float bail = (1.0 - smoothstep(1.0, 1.6, abs(pixel.x - 36.0)))
    * step(66.0, pixel.y) * (1.0 - smoothstep(69.0, 70.0, pixel.y));
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
		const uniforms = Object.fromEntries(['resolution', 'gaze', 'blink', 'pressed', 'happy']
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
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			},
		};
	} catch {
		dispose();
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return undefined;
	}
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
			context.beginPath(); context.moveTo(36, 15); context.lineTo(36, 20); context.stroke();
			const gradient = context.createRadialGradient(25, 31, 3, 36, 46, 36);
			gradient.addColorStop(0, '#fff2a7'); gradient.addColorStop(.35, '#ffdc45'); gradient.addColorStop(1, '#bf7d19');
			context.fillStyle = gradient;
			context.beginPath(); context.arc(36, 46, 30, 0, Math.PI * 2); context.fill();
			const closing = Math.max(pose.blink, pose.happy ? .95 : 0);
			for (const x of [27, 45]) {
				context.strokeStyle = '#36271e'; context.lineWidth = 1.8;
				if (closing > .75) {
					context.beginPath(); context.moveTo(x - 5, 41); context.quadraticCurveTo(x, 37, x + 5, 41); context.stroke();
				} else {
					context.save(); context.beginPath(); context.ellipse(x, 40, 5.8, Math.max(.8, 7.8 * (1 - closing)), 0, 0, Math.PI * 2);
					context.fillStyle = '#fffdf1'; context.fill(); context.clip();
					const pupilX = x + pose.gazeX * 2.1, pupilY = 40 - pose.gazeY * 2.7;
					context.fillStyle = '#30251f'; context.beginPath(); context.arc(pupilX, pupilY, 2.8, 0, Math.PI * 2); context.fill();
					context.fillStyle = 'white'; context.beginPath(); context.arc(pupilX - .8, pupilY - 1, .8, 0, Math.PI * 2); context.fill(); context.restore();
				}
				if (pose.pressed) { context.beginPath(); context.moveTo(x - 4, 27); context.quadraticCurveTo(x, 25, x + 4, 27); context.stroke(); }
			}
			context.strokeStyle = '#36271e'; context.lineWidth = 2.1;
			context.beginPath();
			if (pose.pressed) { context.ellipse(36, 56, 3.6, 5.1, 0, 0, Math.PI * 2); context.fillStyle = '#36271e'; context.fill(); }
			else { context.moveTo(23, 54); context.quadraticCurveTo(36, 66, 49, 54); context.stroke(); }
			if (pose.happy) {
				context.fillStyle = '#dc743e55';
				for (const x of [20, 52]) { context.beginPath(); context.ellipse(x, 50, 4, 2.3, 0, 0, Math.PI * 2); context.fill(); }
			}
		},
	};
}
