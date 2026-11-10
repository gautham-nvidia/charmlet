import type { SmileyRenderer } from './smiley-renderer';
import { artPoint, artToStage, partOpacity, type ArtPose } from './live-art-core';
import { paintArtFace, type ArtLayer, type ArtLibrary, type PreparedArt } from './live-art-assets';

function positions(layer: ArtLayer, prepared: PreparedArt, pose: ArtPose): void {
	for (const [index, point] of layer.points.entries()) {
		const stage = artToStage(prepared.definition, artPoint(layer.part, point, pose));
		layer.positions[index * 2] = stage[0]; layer.positions[index * 2 + 1] = stage[1];
	}
}
const vertexSource = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 texturePoint;
void main(){texturePoint=uv;gl_Position=vec4(position/vec2(36.0,-42.0)+vec2(-1.0,1.0),0.0,1.0);}`;
const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D artwork;
uniform float opacity;
in vec2 texturePoint;
out vec4 outputColor;
void main(){outputColor=texture(artwork,texturePoint)*opacity;}`;

export function createWebGLArt(canvas: HTMLCanvasElement, library: ArtLibrary): SmileyRenderer | undefined {
	const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
	if (!gl) { return undefined; }
	const program = gl.createProgram(), positionBuffer = gl.createBuffer(), uvBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer();
	const shaders: WebGLShader[] = [], textures = new Map<HTMLCanvasElement, WebGLTexture>();
	let preparedKey = '', ready = false;
	const disposeTextures = () => { for (const texture of textures.values()) { gl.deleteTexture(texture); } textures.clear(); };
	const dispose = () => {
		disposeTextures(); shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program);
		gl.deleteBuffer(positionBuffer); gl.deleteBuffer(uvBuffer); gl.deleteBuffer(indexBuffer);
	};
	try {
		if (!program || !positionBuffer || !uvBuffer || !indexBuffer) { throw new Error('Missing graphics resources.'); }
		for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
			const shader = gl.createShader(type);
			if (!shader) { throw new Error('Shader unavailable.'); }
			shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { throw new Error('Artwork shader unavailable.'); }
			gl.attachShader(program, shader);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { throw new Error('Artwork program unavailable.'); }
		const position = gl.getAttribLocation(program, 'position'), uv = gl.getAttribLocation(program, 'uv');
		const opacity = gl.getUniformLocation(program, 'opacity');
		gl.useProgram(program); gl.uniform1i(gl.getUniformLocation(program, 'artwork'), 0);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		function texture(image: HTMLCanvasElement, changing = false) {
			let stored = textures.get(image);
			if (!stored) {
				stored = gl!.createTexture()!;
				textures.set(image, stored); gl!.bindTexture(gl!.TEXTURE_2D, stored);
				gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
				gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
				gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
				gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
				gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
			} else {
				gl!.bindTexture(gl!.TEXTURE_2D, stored);
				if (changing) { gl!.texSubImage2D(gl!.TEXTURE_2D, 0, 0, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, image); }
			}
		}
		function drawMesh(points: Float32Array, coordinates: Float32Array, indices: Uint16Array, alpha: number) {
			gl!.bindBuffer(gl!.ARRAY_BUFFER, positionBuffer); gl!.bufferData(gl!.ARRAY_BUFFER, points, gl!.DYNAMIC_DRAW);
			gl!.enableVertexAttribArray(position); gl!.vertexAttribPointer(position, 2, gl!.FLOAT, false, 0, 0);
			gl!.bindBuffer(gl!.ARRAY_BUFFER, uvBuffer); gl!.bufferData(gl!.ARRAY_BUFFER, coordinates, gl!.STATIC_DRAW);
			gl!.enableVertexAttribArray(uv); gl!.vertexAttribPointer(uv, 2, gl!.FLOAT, false, 0, 0);
			gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, indexBuffer); gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, indices, gl!.STATIC_DRAW);
			gl!.uniform1f(opacity, alpha); gl!.drawElements(gl!.TRIANGLES, indices.length, gl!.UNSIGNED_SHORT, 0);
		}
		const hookPoints = new Float32Array([0,0,72,0,0,84,72,84]), hookUV = new Float32Array([0,0,1,0,0,1,1,1]);
		const hookIndices = new Uint16Array([0,2,1,2,3,1]);
		return {
			kind: 'webgl', get ready() { return ready; }, dispose,
			draw(pose) {
				const prepared = library.get(pose as ArtPose); ready = Boolean(prepared);
				if (!prepared) { return; }
				if (preparedKey !== prepared.key) { disposeTextures(); preparedKey = prepared.key; }
				gl.useProgram(program); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
				texture(prepared.hook); drawMesh(hookPoints, hookUV, hookIndices, 1);
				for (const layer of prepared.layers) {
					const alpha = partOpacity(layer.part, pose as ArtPose);
					if (alpha <= .001) { continue; }
					paintArtFace(layer, pose as ArtPose); positions(layer, prepared, pose as ArtPose);
					texture(layer.image, Boolean(layer.part.eyes?.length || layer.part.effect || layer.part.display));
					drawMesh(layer.positions, layer.uv, layer.indices, alpha);
				}
				canvas.dataset.outfit = prepared.definition.outfit ?? '';
				canvas.dataset.artReady = prepared.key;
			},
		};
	} catch {
		dispose(); return undefined;
	}
}

function drawTriangle(context: CanvasRenderingContext2D, layer: ArtLayer, a: number, b: number, c: number) {
	const p = [a,b,c].map(index => [layer.positions[index * 2], layer.positions[index * 2 + 1]]);
	const t = [a,b,c].map(index => [layer.uv[index * 2] * layer.image.width, layer.uv[index * 2 + 1] * layer.image.height]);
	const sx1 = t[1][0] - t[0][0], sy1 = t[1][1] - t[0][1], sx2 = t[2][0] - t[0][0], sy2 = t[2][1] - t[0][1];
	const determinant = sx1 * sy2 - sx2 * sy1;
	if (Math.abs(determinant) < .0001) { return; }
	const dx1 = p[1][0] - p[0][0], dy1 = p[1][1] - p[0][1], dx2 = p[2][0] - p[0][0], dy2 = p[2][1] - p[0][1];
	const aa = (dx1 * sy2 - dx2 * sy1) / determinant, bb = (dy1 * sy2 - dy2 * sy1) / determinant;
	const cc = (dx2 * sx1 - dx1 * sx2) / determinant, dd = (dy2 * sx1 - dy1 * sx2) / determinant;
	const ee = p[0][0] - aa * t[0][0] - cc * t[0][1], ff = p[0][1] - bb * t[0][0] - dd * t[0][1];
	context.save(); context.setTransform(3, 0, 0, 3, 0, 0);
	// Slightly overlap triangle edges to avoid hairline cracks from canvas clipping antialiasing.
	const center = [(p[0][0]+p[1][0]+p[2][0])/3, (p[0][1]+p[1][1]+p[2][1])/3];
	context.beginPath();
	p.forEach(([x,y], index) => {
		const length = Math.max(.001, Math.hypot(x-center[0], y-center[1]));
		const xx = x + (x-center[0]) / length * .4, yy = y + (y-center[1]) / length * .4;
		if (index) { context.lineTo(xx, yy); } else { context.moveTo(xx, yy); }
	});
	context.closePath(); context.clip();
	context.setTransform(aa*3, bb*3, cc*3, dd*3, ee*3, ff*3); context.drawImage(layer.image, 0, 0);
	context.restore();
}

/** A flat or rigid pose can be drawn once, avoiding triangle seams in pale artwork. */
function drawAffineLayer(context: CanvasRenderingContext2D, layer: ArtLayer): boolean {
	const right = layer.uv.findIndex((u, index) => index % 2 === 0 && u === 1 && layer.uv[index + 1] === 0);
	const bottom = layer.uv.findIndex((u, index) => index % 2 === 0 && u === 0 && layer.uv[index + 1] === 1);
	if (right < 0 || bottom < 0) { return false; }
	const points = layer.positions, x = points[0], y = points[1];
	const ux = points[right] - x, uy = points[right + 1] - y;
	const vx = points[bottom] - x, vy = points[bottom + 1] - y;
	for (let index = 0; index < points.length; index += 2) {
		const u = layer.uv[index], v = layer.uv[index + 1];
		if (Math.abs(points[index] - (x + u * ux + v * vx)) > .002
			|| Math.abs(points[index + 1] - (y + u * uy + v * vy)) > .002) { return false; }
	}
	context.save();
	context.setTransform(ux * 3 / layer.image.width, uy * 3 / layer.image.width,
		vx * 3 / layer.image.height, vy * 3 / layer.image.height, x * 3, y * 3);
	context.drawImage(layer.image, 0, 0);
	context.restore();
	return true;
}

export function createCanvasArt(canvas: HTMLCanvasElement, library: ArtLibrary): SmileyRenderer | undefined {
	const context = canvas.getContext('2d');
	if (!context) { return undefined; }
	let ready = false;
	return {
		kind: 'canvas', get ready() { return ready; },
		dispose() { context.setTransform(1,0,0,1,0,0); context.clearRect(0,0,canvas.width,canvas.height); },
		draw(pose) {
			const prepared = library.get(pose as ArtPose); ready = Boolean(prepared);
			if (!prepared) { return; }
			context.setTransform(1,0,0,1,0,0); context.globalAlpha = 1; context.clearRect(0,0,216,252);
			context.drawImage(prepared.hook, 0, 0);
			for (const layer of prepared.layers) {
				const alpha = partOpacity(layer.part, pose as ArtPose);
				if (alpha <= .001) { continue; }
				paintArtFace(layer, pose as ArtPose); positions(layer, prepared, pose as ArtPose);
				context.globalAlpha = alpha;
				if (drawAffineLayer(context, layer)) { continue; }
				for (let index = 0; index < layer.indices.length; index += 3) {
					drawTriangle(context, layer, layer.indices[index], layer.indices[index+1], layer.indices[index+2]);
				}
			}
			context.globalAlpha = 1; canvas.dataset.outfit = prepared.definition.outfit ?? '';
			canvas.dataset.artReady = prepared.key;
		},
	};
}
