import { createElement, X } from 'lucide';
import type { CharmDefinition } from './charm-catalog';

const photoCore = import('../../website/studio/photo-core.mjs');
type PhotoCore = Awaited<typeof photoCore>;
type Frame = keyof PhotoCore['FRAMES'];
interface PhotoViewOptions {
	send(message: unknown): void;
	select(id: string): void;
	onOpen(): void;
	onChange(): void;
}
export interface PhotoView {
	open(): void;
	close(restoreFocus?: boolean): void;
	isOpen(): boolean;
	setReady(value: boolean): void;
	setCatalogue(charms: readonly CharmDefinition[]): void;
	result(requestId: number, error?: string): void;
}
const photoId = (charm: CharmDefinition) => charm.group === 'Personal Keepsakes'
	? /^pack:(photo-[a-z0-9-]{1,41}):portrait$/.exec(charm.id)?.[1] : undefined;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function createPhotoView(options: PhotoViewOptions): PhotoView {
	const panel = document.getElementById('photo-editor')!;
	panel.innerHTML = `<header class="popup-heading"><div><h2 id="photo-title">Photo charms</h2><p>A little keepsake, just for you.</p></div>
		<button id="photo-close" class="popup-close" type="button" aria-label="Close photo charms"></button></header>
		<div class="photo-body">
		<p class="companion-hint">Choose a photo from this device. Nothing is uploaded. Only the finished keepsake is saved.</p>
		<label class="photo-file-label" for="photo-file">Choose a photo</label>
		<input id="photo-file" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby="photo-limits">
		<p id="photo-limits" class="companion-hint">PNG, JPEG or WebP. Up to 8 MiB and 16 million pixels.</p>
		<div class="photo-preview" id="photo-preview"><canvas id="photo-canvas" width="216" height="252" role="img" aria-label="Keepsake preview. Drag the photo to position it, or use the crop sliders."></canvas></div>
		<div class="photo-preview-options"><label><input id="photo-dark" type="checkbox"> Dark preview</label><label><input id="photo-actual" type="checkbox"> Actual size</label></div>
		<div class="photo-fields">
		<label for="photo-frame">Frame</label><select id="photo-frame"></select>
		<label for="photo-zoom">Zoom</label><input id="photo-zoom" type="range" min="100" max="300" step="1" value="100">
		<label for="photo-x">Left / right</label><input id="photo-x" type="range" min="0" max="100" value="50">
		<label for="photo-y">Up / down</label><input id="photo-y" type="range" min="0" max="100" value="50">
		<label for="photo-name">Name</label><input id="photo-name" type="text" maxlength="48" value="My keepsake" autocomplete="off">
		</div>
		<div class="photo-actions"><button id="photo-reset" type="button">Reset crop</button><button id="photo-save" type="button">Save and hang</button></div>
		<p id="photo-feedback" role="status" aria-live="polite" hidden></p>
		<section class="photo-library" aria-labelledby="photo-library-title"><h3 id="photo-library-title">Your keepsakes</h3><div id="photo-list"></div></section>
		<div id="photo-remove-confirm" hidden><p id="photo-remove-copy"></p><div class="photo-actions">
		<button id="photo-remove-yes" type="button">Remove keepsake</button><button id="photo-remove-no" type="button">Keep it</button></div></div>
		</div>`;
	const get = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;
	const file = get<HTMLInputElement>('photo-file');
	const canvas = get<HTMLCanvasElement>('photo-canvas');
	const frame = get<HTMLSelectElement>('photo-frame');
	const zoom = get<HTMLInputElement>('photo-zoom');
	const horizontal = get<HTMLInputElement>('photo-x');
	const vertical = get<HTMLInputElement>('photo-y');
	const name = get<HTMLInputElement>('photo-name');
	const save = get<HTMLButtonElement>('photo-save');
	const reset = get<HTMLButtonElement>('photo-reset');
	const feedback = get<HTMLParagraphElement>('photo-feedback');
	const closeButton = get<HTMLButtonElement>('photo-close');
	const list = get<HTMLDivElement>('photo-list');
	const confirm = get<HTMLDivElement>('photo-remove-confirm');
	const removeYes = get<HTMLButtonElement>('photo-remove-yes');
	const removeNo = get<HTMLButtonElement>('photo-remove-no');
	closeButton.append(createElement(X, { width: 14, height: 14, 'aria-hidden': 'true' }));
	let core: PhotoCore | undefined;
	let bitmap: ImageBitmap | undefined;
	let loadSequence = 0;
	let loading = false;
	let ready = false;
	let sequence = 0;
	let pending: { id: number; kind: 'save' | 'remove'; load: number } | undefined;
	let draftPack: string | undefined;
	let photos: readonly CharmDefinition[] = [];
	let removeId: string | undefined;
	let opener: HTMLElement | undefined;
	let drag: { id: number; x: number; y: number; horizontal: number; vertical: number; factorX: number; factorY: number } | undefined;

	function status(text = '') { feedback.textContent = text; feedback.hidden = !text; }
	function controls() {
		const busy = !ready || !core || !!pending || loading;
		for (const input of [file, frame, zoom, horizontal, vertical, name, reset, removeYes]) { input.disabled = busy; }
		for (const button of list.querySelectorAll('button')) { button.disabled = busy; }
		save.disabled = busy || !bitmap;
		save.textContent = pending?.kind === 'save' ? 'Saving...' : 'Save and hang';
		panel.dataset.photoBusy = String(loading || !!pending);
		panel.dataset.photoReady = String(!!bitmap);
	}
	function draw() {
		if (!core) { return; }
		core.drawPhotoCharm(canvas, bitmap, frame.value as Frame, Number(zoom.value) / 100,
			Number(horizontal.value) / 100, Number(vertical.value) / 100);
		zoom.setAttribute('aria-valuetext', `${zoom.value}%`);
	}
	function releaseDraft() {
		loadSequence++;
		loading = false;
		bitmap?.close();
		bitmap = undefined;
		draftPack = undefined;
		file.value = '';
		drag = undefined;
		zoom.value = '100'; horizontal.value = '50'; vertical.value = '50';
		name.value = 'My keepsake';
		draw();
		controls();
	}
	function close(restoreFocus = true) {
		if (panel.hidden) { return; }
		panel.hidden = true;
		releaseDraft();
		removeId = undefined; confirm.hidden = true;
		if (restoreFocus) { opener?.focus({ preventScroll: true }); }
		options.onChange();
	}
	async function loadPhoto(selected: File) {
		const token = ++loadSequence;
		const restoreFileFocus = document.activeElement === file;
		bitmap?.close(); bitmap = undefined; draftPack = undefined;
		loading = true; status('Preparing your local preview...'); controls();
		try {
			const helpers = await photoCore;
			if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type)) { throw new Error('Choose a PNG, JPEG or WebP photo.'); }
			if (selected.size > helpers.MAX_PHOTO_BYTES) { throw new Error('Choose a photo no larger than 8 MiB.'); }
			helpers.inspectPhotoHeader(new Uint8Array(await selected.arrayBuffer()), selected.type);
			if (token !== loadSequence || panel.hidden) { return; }
			const next = await createImageBitmap(selected);
			try { helpers.cropRectangle(next.width, next.height, helpers.FRAMES.mint.width, helpers.FRAMES.mint.height); }
			catch (error) { next.close(); throw error; }
			if (token !== loadSequence || panel.hidden) { next.close(); return; }
			bitmap = next;
			zoom.value = '100'; horizontal.value = '50'; vertical.value = '50';
			draw(); status('Drag the photo or use the sliders. Your original is unchanged.');
		} catch (error) {
			if (token === loadSequence && !panel.hidden) {
				status(error instanceof Error ? error.message : 'This image could not be opened. Try another photo.');
				draw();
			}
		} finally {
			if (token === loadSequence) {
				loading = false; controls();
				if (restoreFileFocus && !panel.hidden && document.activeElement === document.body) {
					file.focus({ preventScroll: true });
				}
			}
		}
	}
	function renderPhotos() {
		list.replaceChildren();
		if (!photos.length) { const empty = document.createElement('p'); empty.className = 'companion-hint'; empty.textContent = 'Your saved photo charms will appear here.'; list.append(empty); }
		for (const photo of photos) {
			const row = document.createElement('div'); row.className = 'photo-saved';
			const use = document.createElement('button'); use.type = 'button'; use.setAttribute('aria-label', `Hang ${photo.name}`);
			const image = document.createElement('img'); image.src = photo.source!; image.alt = ''; image.width = 36; image.height = 42;
			const label = document.createElement('span'); label.textContent = photo.name;
			use.append(image, label);
			use.addEventListener('click', () => { if (!pending) { options.select(photo.id); close(false); } });
			const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
			remove.setAttribute('aria-label', `Remove ${photo.name}`);
			remove.addEventListener('click', () => {
				removeId = photoId(photo); confirm.hidden = false;
				get('photo-remove-copy').textContent = `Remove "${photo.name}" from this device? Your original photo is kept.`;
				removeNo.focus({ preventScroll: true });
				confirm.scrollIntoView({ block: 'nearest' });
			});
			row.append(use, remove); list.append(row);
		}
		controls();
	}
	function request(kind: 'save' | 'remove', value: string) {
		if (!ready || pending) { return; }
		pending = { id: ++sequence, kind, load: loadSequence };
		status(kind === 'save' ? 'Saving your keepsake on this device...' : 'Removing your keepsake...');
		controls();
		options.send({ type: `photo-${kind}`, requestId: pending.id, ...(kind === 'save' ? { pack: value } : { packId: value }) });
	}
	save.addEventListener('click', () => {
		if (!bitmap || !core || loading || pending) { return; }
		try {
			draw();
			draftPack ??= JSON.stringify(core.makePhotoPack({ id: `photo-${crypto.randomUUID()}`,
				name: name.value, frame: frame.value as Frame, png: canvas.toDataURL('image/png').split(',')[1] }));
			request('save', draftPack);
		} catch (error) { status(error instanceof Error ? error.message : 'The photo could not be saved.'); }
	});
	file.addEventListener('change', () => { if (file.files?.[0]) { void loadPhoto(file.files[0]); } });
	for (const input of [frame, zoom, horizontal, vertical, name]) {
		input.addEventListener('input', () => { draftPack = undefined; draw(); });
	}
	reset.addEventListener('click', () => { zoom.value = '100'; horizontal.value = '50'; vertical.value = '50'; draftPack = undefined; draw(); });
	get<HTMLInputElement>('photo-dark').addEventListener('change', event => {
		get('photo-preview').classList.toggle('dark', (event.target as HTMLInputElement).checked);
	});
	get<HTMLInputElement>('photo-actual').addEventListener('change', event => {
		canvas.classList.toggle('actual', (event.target as HTMLInputElement).checked);
	});
	closeButton.addEventListener('click', () => close());
	// File loading can move focus to the body; Escape still dismisses the open tool.
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !panel.hidden) {
			event.preventDefault(); event.stopPropagation(); close();
		}
	}, true);
	removeNo.addEventListener('click', () => { confirm.hidden = true; removeId = undefined; });
	removeYes.addEventListener('click', () => { if (removeId) { request('remove', removeId); } });
	canvas.addEventListener('pointerdown', event => {
		if (event.button !== 0 || !bitmap || !core || loading || pending) { return; }
		const bounds = canvas.getBoundingClientRect(), selected = core.FRAMES[frame.value as Frame];
		const crop = core.cropRectangle(bitmap.width, bitmap.height, selected.width, selected.height,
			Number(zoom.value) / 100, Number(horizontal.value) / 100, Number(vertical.value) / 100);
		drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
			horizontal: Number(horizontal.value) / 100, vertical: Number(vertical.value) / 100,
			factorX: bitmap.width > crop.width ? crop.width / (selected.width * bounds.width / 72 * (bitmap.width - crop.width)) : 0,
			factorY: bitmap.height > crop.height ? crop.height / (selected.height * bounds.height / 84 * (bitmap.height - crop.height)) : 0 };
		canvas.setPointerCapture(event.pointerId); event.preventDefault();
	});
	canvas.addEventListener('pointermove', event => {
		if (!drag || event.pointerId !== drag.id) { return; }
		horizontal.value = String(100 * clamp(drag.horizontal - (event.clientX - drag.x) * drag.factorX));
		vertical.value = String(100 * clamp(drag.vertical - (event.clientY - drag.y) * drag.factorY));
		draftPack = undefined; draw();
	});
	for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) { canvas.addEventListener(event, () => { drag = undefined; }); }
	void photoCore.then(helpers => {
		core = helpers;
		for (const [value, choice] of Object.entries(core.FRAMES)) { frame.add(new Option(choice.name, value)); }
		frame.value = 'copper'; draw(); controls();
	}).catch(() => status('The photo editor could not start. Reopen Charmlet and try again.'));
	window.addEventListener('pagehide', releaseDraft);
	controls();
	return {
		open() {
			if (!ready) { return; }
			opener = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
			if (opener?.id === 'picker-photo') { opener = document.getElementById('charms-toggle')!; }
			options.onOpen(); panel.hidden = false; status(); renderPhotos(); file.focus({ preventScroll: true }); options.onChange();
		},
		close, isOpen: () => !panel.hidden,
		setReady(value) { ready = value; controls(); },
		setCatalogue(charms) {
			photos = charms.filter(charm => photoId(charm) !== undefined);
			if (removeId && !photos.some(charm => photoId(charm) === removeId)) { confirm.hidden = true; removeId = undefined; }
			if (!panel.hidden) { renderPhotos(); }
		},
		result(requestId, error) {
			if (pending?.id !== requestId) { return; }
			const finished = pending; pending = undefined; controls();
			if (error) { status(error); return; }
			if (finished.kind === 'save' && finished.load === loadSequence) { close(false); }
			else { confirm.hidden = true; removeId = undefined; status(finished.kind === 'save' ? 'Your keepsake is saved.' : 'Your keepsake was removed.'); }
		},
	};
}
