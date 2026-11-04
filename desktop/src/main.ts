import {
	app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, powerMonitor, protocol, screen, shell, Tray,
	type IpcMainEvent, type WebContents,
} from 'electron';
import { randomBytes } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHARMS, buildCatalogue, type CharmDefinition } from '../../extension/src/charm-catalog';
import { installPack, loadPacks, MAX_PACK_BYTES, packCharms, removePack, type CharmPack } from '../../extension/src/charm-packs';
import { matchesSavedState, restoreState, type CharmState } from '../../extension/src/charm-state';
import { CompanionController } from '../../extension/src/companion-controller';
import { formatFocusTime, type CompanionSnapshot, type CompanionState } from '../../extension/src/companion-core';
import { gardenCharms } from '../../extension/src/garden-catalog';
import { isFlowerId } from '../../extension/src/garden-core';
import { learningCard } from '../../extension/src/learning-cards';
import { StateStore } from '../../extension/src/state-store';
import { StateWriter } from '../../extension/src/state-writer';
import { pauseForAway } from './power-behavior';
import {
	DEFAULT_DESKTOP_SIZE, desktopGeometry, fitDesktopAnchor, legacyDesktopAnchor, matchesDesktopAnchor,
	type DesktopAnchor, type DesktopBounds,
} from './window-placement';
import { DESKTOP_HEADER, matchesDesktopView, MESSAGES_HEIGHT, restoreDesktopView, TOOLS_HEIGHT, type DesktopView } from './desktop-view';

protocol.registerSchemesAsPrivileged([{
	scheme: 'charmlet', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false },
}]);
app.setName('Charmlet');
const ownedProfile = process.env.CHARMLET_DESKTOP_PROFILE;
if (ownedProfile) { app.setPath('userData', resolve(ownedProfile)); }
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) { app.quit(); }

const root = __dirname;
const profile = app.getPath('userData');
let mainWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let companion: CompanionController | undefined;
let preferenceWriter: StateWriter<CharmState> | undefined;
let placementWriter: StateWriter<DesktopAnchor> | undefined;
let desktopViewWriter: StateWriter<DesktopView> | undefined;
let desktopView = restoreDesktopView(undefined);
let desktopAnchor: DesktopAnchor;
let toolsExpanded = false;
let windowDrag: { cursor: { x: number; y: number }; anchor: DesktopAnchor } | undefined;
let pendingTools = false;
let placementTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribeCompanion: (() => void) | undefined;
let quitting = false;
let rendererReady = false;
let rendererGeneration = 0;
let mouseIgnored = true;
let backgroundNotice: string | undefined;
let pendingTab: 'focus' | 'learn' | 'garden' | undefined;
let latestCompanion: CompanionSnapshot | undefined;
let state: CharmState;
let catalogue: readonly CharmDefinition[] = CHARMS;
let packs: CharmPack[] = [];
let gardenKey = '';
let failedGardenKey: string | undefined;
let gardenRefresh: Promise<void> | undefined;
const securityPreferences = Object.freeze({
	nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false,
});

function isSender(event: IpcMainEvent) {
	return mainWindow !== undefined && event.sender === mainWindow.webContents
		&& event.senderFrame === mainWindow.webContents.mainFrame;
}
function send(message: unknown) {
	if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.webContents.send('charmlet:message', message); }
}
function sendForGeneration(generation: number, message: unknown) {
	if (generation === rendererGeneration && rendererReady) { send(message); }
}
function updateTrayStatus() {
	if (!tray) { return; }
	const snapshot = latestCompanion;
	const reminder = snapshot?.reminder === 'water' ? 'Water break' : snapshot?.reminder === 'move' ? 'Stand and move' : undefined;
	const focus = snapshot?.state.focus;
	const focusText = focus && focus.status !== 'idle'
		? `${focus.phase === 'focus' ? 'Focus' : 'Break'} ${focus.status} · ${formatFocusTime(snapshot!.remainingMs)}` : undefined;
	tray.setToolTip(backgroundNotice ? `Charmlet · ${backgroundNotice}` : reminder ? `Charmlet · ${reminder}` : focusText ? `Charmlet · ${focusText}` : 'Charmlet desktop beta');
	if (process.platform === 'darwin') { tray.setTitle(reminder || backgroundNotice ? '•' : ''); }
}
function latchBackgroundNotice(message: string) {
	backgroundNotice ??= message;
	updateTrayStatus();
}
function notifyVisibility() {
	if (!rendererReady || !mainWindow || mainWindow.isDestroyed()) { return; }
	const visible = mainWindow.isVisible();
	send({ type: 'visibility', visible });
	if (visible && companion) { send({ type: 'companion', snapshot: companion.snapshot() }); }
}
function workAreas(): DesktopBounds[] {
	const primary = screen.getPrimaryDisplay();
	return [primary, ...screen.getAllDisplays().filter(display => display.id !== primary.id)]
		.map(display => ({ ...display.workArea }));
}
function sameBounds(expected: DesktopBounds, actual: unknown) {
	if (!actual || typeof actual !== 'object') { return false; }
	const value = actual as Partial<DesktopBounds>;
	return value.x === expected.x && value.y === expected.y && value.width === expected.width && value.height === expected.height;
}
function schedulePlacement() {
	if (!mainWindow || quitting) { return; }
	if (placementTimer) { clearTimeout(placementTimer); }
	placementTimer = setTimeout(() => {
		placementTimer = undefined;
		if (mainWindow && !mainWindow.isDestroyed()) {
			void placementWriter?.save({ ...desktopAnchor }).catch(() => latchBackgroundNotice('Window position could not be saved.'));
		}
	}, 300);
}
function resetWindowPosition() {
	if (!mainWindow) { return; }
	desktopAnchor = fitDesktopAnchor(undefined, workAreas());
	applyWindowSize();
	schedulePlacement();
}
function fitCurrentWindow() {
	if (!mainWindow) { return; }
	desktopAnchor = fitDesktopAnchor(desktopAnchor, workAreas());
	applyWindowSize();
	schedulePlacement();
}
function setWindowBounds(bounds: DesktopBounds) {
	if (!mainWindow) { return; }
	if (sameBounds(bounds, mainWindow.getBounds())) { return; }
	mainWindow.setBounds(bounds);
}
function currentGeometry() {
	return desktopGeometry(desktopAnchor, workAreas(),
		toolsExpanded ? TOOLS_HEIGHT : desktopView.messagesPinned ? MESSAGES_HEIGHT : DEFAULT_DESKTOP_SIZE.height);
}
function applyWindowSize() {
	const geometry = currentGeometry();
	setWindowBounds(geometry.bounds);
	if (rendererReady) { send({ type: 'desktop-placement', ...geometry }); }
}
function setToolsExpanded(expanded: boolean) {
	if (!mainWindow || expanded === toolsExpanded) { return; }
	toolsExpanded = expanded;
	applyWindowSize();
}
function recordWindowMove() {
	if (!mainWindow || quitting) { return; }
	const expected = currentGeometry().bounds;
	const actual = mainWindow.getBounds();
	// Allow native mixed-DPI rounding without starting a resize loop.
	if (Object.keys(expected).every(key => Math.abs(expected[key as keyof DesktopBounds] - actual[key as keyof DesktopBounds]) <= 1)) { return; }
	applyWindowSize();
}
function moveAnchor(x: number, y: number) {
	if (!mainWindow) { return; }
	desktopAnchor = fitDesktopAnchor({ x, y }, workAreas());
	applyWindowSize();
	schedulePlacement();
}
function setMouseIgnored(ignore: boolean) {
	if (windowDrag) { ignore = false; }
	if (!mainWindow || mouseIgnored === ignore) { return; }
	mouseIgnored = ignore;
	mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
	if (rendererReady) { send({ type: 'desktop-hit-state', ignore }); }
}
function showInactive() {
	if (!mainWindow) { return; }
	mainWindow.setFocusable(false);
	mainWindow.showInactive();
	notifyVisibility();
}
function hideWindow() {
	windowDrag = undefined;
	mainWindow?.hide();
	notifyVisibility();
}
function openControls(tab: 'focus' | 'learn' | 'garden') {
	if (!mainWindow) { return; }
	pendingTab = tab;
	setToolsExpanded(true);
	setMouseIgnored(false);
	mainWindow.setFocusable(true);
	mainWindow.show();
	mainWindow.focus();
	notifyVisibility();
	if (rendererReady) {
		send({ type: 'companion-open', tab });
		pendingTab = undefined;
	}
}
function openDesktopTools() {
	if (!mainWindow) { return; }
	setToolsExpanded(false);
	setMouseIgnored(false);
	mainWindow.setFocusable(true);
	mainWindow.show();
	mainWindow.focus();
	if (rendererReady) { send({ type: 'desktop-tools-open' }); }
	else { pendingTools = true; }
}

async function registerResources() {
	const mediaNames = new Set((await readdir(join(root, 'media'))).filter(name => /\.(svg|png)$/i.test(name)));
	protocol.handle('charmlet', async request => {
		try {
			const url = new URL(request.url);
			if (url.host !== 'app') { return new Response('Not found', { status: 404 }); }
			const path = decodeURIComponent(url.pathname);
			if (path === '/' || path === '/index.html') {
				const nonce = randomBytes(16).toString('hex');
				const template = await readFile(join(root, 'view.html'), 'utf8');
				const html = template
					.replaceAll('__NONCE__', nonce)
					.replaceAll('__CSP__', 'charmlet:')
					.replaceAll('__APP_VERSION__', app.getVersion().replace(/[^a-zA-Z0-9.+-]/g, ''))
					.replaceAll('__SCRIPT__', 'charmlet://app/renderer.js')
					.replaceAll('__STYLE__', 'charmlet://app/view.css')
					.replaceAll('__CHARM__', 'charmlet://app/media/keycap.svg')
					.replace('</head>', '<link rel="stylesheet" href="charmlet://app/desktop.css"></head>')
					.replace('<body>', `<body class="desktop" data-desktop-tools="false" data-desktop-reveal="false">${DESKTOP_HEADER}`)
					.replace(`<script nonce="${nonce}" src="charmlet://app/renderer.js"></script>`, `<script nonce="${nonce}" src="charmlet://app/overlay.js"></script><script nonce="${nonce}" src="charmlet://app/renderer.js"></script>`);
				return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
			}
			const fixed = new Map([
				['/renderer.js', join(root, 'renderer.js')], ['/overlay.js', join(root, 'overlay.js')],
				['/view.css', join(root, 'view.css')], ['/desktop.css', join(root, 'desktop.css')],
			]);
			let file = fixed.get(path);
			if (!file && path.startsWith('/media/')) {
				const name = basename(path);
				if (path === `/media/${name}` && mediaNames.has(name)) { file = join(root, 'media', name); }
			}
			return file ? await net.fetch(pathToFileURL(file).href) : new Response('Not found', { status: 404 });
		} catch {
			return new Response('Not found', { status: 404 });
		}
	});
}

function fullCatalogue() {
	return buildCatalogue([...packCharms(packs), ...gardenCharms(companion!.snapshot().state.garden)]);
}
async function saveCatalogue(selectedId?: string, generation = rendererGeneration) {
	catalogue = fullCatalogue();
	state = restoreState({ ...state, charmId: selectedId ?? state.charmId,
		charmPinned: selectedId !== undefined ? true : state.charmPinned }, catalogue);
	await preferenceWriter!.save({ ...state });
	sendForGeneration(generation, { type: 'catalogue', catalogue, state });
}
function refreshGardenCatalogue() {
	const nextKey = gardenCharms(latestCompanion!.state.garden).map(charm => charm.id).join('|');
	if (nextKey === gardenKey || nextKey === failedGardenKey || gardenRefresh) { return; }
	gardenRefresh = saveCatalogue()
		.then(() => { gardenKey = nextKey; failedGardenKey = undefined; })
		.catch(() => { failedGardenKey = nextKey; latchBackgroundNotice('Earned charm picker refresh failed.'); })
		.finally(() => { gardenRefresh = undefined; });
}
function runExplicitAction(title: string, action: () => Promise<void>) {
	void action().catch(error => dialog.showErrorBox(title, error instanceof Error ? error.message : 'Unknown error'));
}

async function importPack() {
	if (!mainWindow) { return; }
	const selection = await dialog.showOpenDialog(mainWindow, {
		properties: ['openFile'], filters: [{ name: 'Charmlet Pack', extensions: ['json'] }], buttonLabel: 'Import Charm Pack',
	});
	if (!selection.filePaths[0]) { return; }
	const info = await lstat(selection.filePaths[0]);
	if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_PACK_BYTES) { throw new Error('Choose a bounded regular Charmlet pack file.'); }
	const installed = await installPack(join(profile, 'packs'), await readFile(selection.filePaths[0]));
	if (installed.added) {
		packs = [...packs, installed.pack];
		await saveCatalogue(`pack:${installed.pack.id}:${installed.pack.charms[0].id}`);
	}
}
async function removeInstalledPack(id: string) {
	const selected = packs.find(pack => pack.id === id);
	if (!selected) { return; }
	await removePack(join(profile, 'packs'), selected.id);
	packs = packs.filter(pack => pack.id !== selected.id);
	await saveCatalogue();
}
function showRemovePackMenu() {
	if (!mainWindow || !packs.length) { return; }
	const menu = Menu.buildFromTemplate([
		...packs.map(pack => ({ label: pack.name, click: () => runExplicitAction('Remove failed', () => removeInstalledPack(pack.id)) })),
		{ type: 'separator' as const }, { label: 'Cancel', click: () => undefined },
	]);
	menu.popup({ window: mainWindow });
}

async function handleAction(event: IpcMainEvent, message: unknown) {
	if (!isSender(event) || !message || typeof message !== 'object' || !('type' in message)) { return; }
	const generation = rendererGeneration;
	const value = message as Record<string, unknown>;
	if (value.type === 'ready') {
		await Promise.all([preferenceWriter!.flush(), companion!.flush(), placementWriter!.flush(), desktopViewWriter!.flush()]);
		if (generation !== rendererGeneration) { return; }
		rendererReady = true;
		const tab = pendingTab;
		applyWindowSize();
		send({ type: 'desktop-view', value: desktopView });
		send({ type: 'state', state, catalogue, companion: companion!.snapshot(), visible: mainWindow!.isVisible(), ...(tab ? { companionTab: tab } : {}) });
		if (pendingTools) { send({ type: 'desktop-tools-open' }); pendingTools = false; }
		if (pendingTab === tab) { pendingTab = undefined; }
	} else if (value.type === 'save' && 'state' in value) {
		const revision = Number.isSafeInteger(value.revision) && Number(value.revision) >= 0 ? Number(value.revision) : undefined;
		state = restoreState(value.state, catalogue);
		try {
			await preferenceWriter!.save({ ...state });
			if (revision !== undefined) { sendForGeneration(generation, { type: 'saved', revision }); }
		} catch {
			if (revision !== undefined) { sendForGeneration(generation, { type: 'save-error', revision }); }
		}
	} else if (value.type === 'companion-action' && Number.isSafeInteger(value.requestId) && Number(value.requestId) >= 0) {
		const requestId = Number(value.requestId);
		try {
			const result = await companion!.dispatch(value.action);
			sendForGeneration(generation, { type: 'companion-result', requestId, message: result.message });
		} catch {
			sendForGeneration(generation, { type: 'companion-result', requestId, error: companion!.snapshot().error ?? 'The companion action could not be saved. Try again.' });
		}
	} else if (value.type === 'garden-hang' && Number.isSafeInteger(value.requestId) && Number(value.requestId) >= 0 && isFlowerId(value.flowerId)) {
		const requestId = Number(value.requestId);
		try {
			const earned = gardenCharms(companion!.snapshot().state.garden);
			const selected = earned.find(charm => charm.id === `garden:${value.flowerId}`);
			if (!selected) { throw new Error('Flower not owned.'); }
			await saveCatalogue(selected.id, generation);
			sendForGeneration(generation, { type: 'companion-result', requestId });
		} catch { sendForGeneration(generation, { type: 'companion-result', requestId, error: 'Charmlet could not hang that flower.' }); }
	} else if (value.type === 'learning-source' && typeof value.cardId === 'string') {
		const card = learningCard(value.cardId);
		if (card?.source) { await shell.openExternal(card.source.url); }
	} else if (value.type === 'command' && value.command === 'charmlet.importPack') {
		runExplicitAction('Import failed', importPack);
	} else if (value.type === 'command' && value.command === 'charmlet.removePack') {
		showRemovePackMenu();
	} else if (value.type === 'desktop-hit-test' && typeof value.ignore === 'boolean') {
		setMouseIgnored(value.ignore);
	} else if (value.type === 'desktop-focus') {
		mainWindow!.setFocusable(true);
		mainWindow!.focus();
	} else if (value.type === 'desktop-hide') {
		hideWindow();
	} else if (value.type === 'desktop-tools' && typeof value.expanded === 'boolean') {
		setToolsExpanded(value.expanded);
	} else if (value.type === 'desktop-view-save' && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0) {
		desktopView = restoreDesktopView(value.value);
		applyWindowSize();
		try {
			await desktopViewWriter!.save({ ...desktopView });
			sendForGeneration(generation, { type: 'desktop-view-saved', revision: value.revision });
		} catch {
			sendForGeneration(generation, { type: 'desktop-view-saved', revision: value.revision, error: 'Display preferences could not be saved. Try again.' });
		}
	} else if (value.type === 'desktop-move-start') {
		windowDrag = { cursor: screen.getCursorScreenPoint(), anchor: { ...desktopAnchor } };
		setMouseIgnored(false);
	} else if (value.type === 'desktop-move-drag' && windowDrag) {
		const cursor = screen.getCursorScreenPoint();
		moveAnchor(windowDrag.anchor.x + cursor.x - windowDrag.cursor.x, windowDrag.anchor.y + cursor.y - windowDrag.cursor.y);
	} else if (value.type === 'desktop-move-end') {
		windowDrag = undefined;
	} else if (value.type === 'desktop-move-step' && Number.isSafeInteger(value.dx) && Number.isSafeInteger(value.dy)
		&& Math.abs(Number(value.dx)) <= 40 && Math.abs(Number(value.dy)) <= 40) {
		moveAnchor(desktopAnchor.x + Number(value.dx), desktopAnchor.y + Number(value.dy));
	} else if (value.type === 'desktop-reset-position') {
		resetWindowPosition();
	}
}

function createTray() {
	const icon = nativeImage.createFromPath(join(root, 'media', 'marketplace-icon.png')).resize({ width: 16, height: 16 });
	tray = new Tray(icon);
	tray.setContextMenu(Menu.buildFromTemplate([
		{ label: 'Show / Hide', click: () => mainWindow?.isVisible() ? hideWindow() : showInactive() },
		{ label: 'Open Controls', click: openDesktopTools },
		{ type: 'separator' },
		{ label: 'Focus', click: () => openControls('focus') },
		{ label: 'Learn', click: () => openControls('learn') },
		{ label: 'Garden', click: () => openControls('garden') },
		{ type: 'separator' },
		{ label: 'Import Pack…', click: () => runExplicitAction('Import failed', importPack) },
		{ label: 'Remove Pack…', click: showRemovePackMenu },
		{ label: 'Reset Window Position', click: resetWindowPosition },
		{ label: 'Always on top', type: 'checkbox', checked: true, click: item => mainWindow?.setAlwaysOnTop(item.checked) },
		{ type: 'separator' },
		{ label: 'Quit', click: () => { void shutdown().catch(() => { quitting = true; app.quit(); }); } },
	]));
	tray.on('click', () => mainWindow?.isVisible() ? hideWindow() : showInactive());
	updateTrayStatus();
	if (process.platform === 'darwin') {
		app.dock?.setIcon(nativeImage.createFromPath(join(root, 'media', 'marketplace-icon.png')));
		Menu.setApplicationMenu(Menu.buildFromTemplate([
			{ label: 'Charmlet', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
			{ label: 'Edit', submenu: [
				{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
			] },
		]));
	}
}

async function shutdown() {
	if (quitting) { return; }
	quitting = true;
	if (placementTimer) { clearTimeout(placementTimer); placementTimer = undefined; }
	unsubscribeCompanion?.();
	const tasks: Promise<unknown>[] = [];
	if (companion) { tasks.push(companion.dispose()); }
	if (mainWindow && !mainWindow.isDestroyed() && placementWriter) { tasks.push(placementWriter.save({ ...desktopAnchor })); }
	if (preferenceWriter) { tasks.push(preferenceWriter.flush()); }
	if (placementWriter) { tasks.push(placementWriter.flush()); }
	if (desktopViewWriter) { tasks.push(desktopViewWriter.flush()); }
	const results = await Promise.allSettled(tasks);
	if (results.some(result => result.status === 'rejected')) { latchBackgroundNotice('Some desktop state could not be flushed while quitting.'); }
	tray?.destroy();
	app.quit();
}

async function failInitialization(error: unknown) {
	quitting = true;
	if (placementTimer) { clearTimeout(placementTimer); placementTimer = undefined; }
	unsubscribeCompanion?.();
	await Promise.allSettled([companion?.dispose(), preferenceWriter?.flush(), placementWriter?.flush(), desktopViewWriter?.flush()].filter((value): value is Promise<void> => value !== undefined));
	tray?.destroy();
	if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.destroy(); }
	dialog.showErrorBox('Charmlet could not start', error instanceof Error ? error.message : 'Unknown startup error.');
	app.quit();
}

async function initialize() {
	await registerResources();
	const loadedPacks = await loadPacks(join(profile, 'packs'));
	packs = loadedPacks.packs;
	const preferenceStore = new StateStore<CharmState>(profile);
	const loadedPreference = await preferenceStore.load(undefined);
	const baseCatalogue = buildCatalogue(packCharms(packs));
	const legacyIndex = restoreState(loadedPreference.value, baseCatalogue).messageIndex;
	const companionStore = new StateStore<CompanionState>(profile, 'companion.json');
	const loadedCompanion = await companionStore.load(undefined);
	if (loadedPreference.error) { throw new Error('Saved desktop preferences are unreadable. The file was preserved; repair or move it before retrying.'); }
	if (loadedCompanion.error) { throw new Error('Saved desktop companion data is unreadable. The file was preserved; repair or move it before retrying.'); }
	companion = new CompanionController(loadedCompanion.value, companionStore, legacyIndex);
	await companion.initialize();
	catalogue = [...baseCatalogue, ...gardenCharms(companion.snapshot().state.garden)];
	state = restoreState(loadedPreference.value, catalogue);
	preferenceWriter = new StateWriter(value => preferenceStore.write(value), () => preferenceStore.read(), matchesSavedState);
	latestCompanion = companion.snapshot();
	gardenKey = gardenCharms(latestCompanion.state.garden).map(charm => charm.id).join('|');

	const legacyPlacementStore = new StateStore<DesktopBounds>(join(profile, 'window'));
	const legacyPlacement = await legacyPlacementStore.load(undefined);
	const placementStore = new StateStore<DesktopAnchor>(join(profile, 'anchor'));
	const loadedPlacement = await placementStore.load(undefined);
	if (loadedPlacement.error) { throw new Error('Desktop position is unreadable. The file was preserved; repair or move it before retrying.'); }
	desktopAnchor = fitDesktopAnchor(loadedPlacement.value ?? legacyDesktopAnchor(legacyPlacement.value), workAreas());
	placementWriter = new StateWriter(value => placementStore.write(value), () => placementStore.read(), matchesDesktopAnchor);
	const viewStore = new StateStore<DesktopView>(join(profile, 'desktop-view'));
	const loadedView = await viewStore.load(undefined);
	if (loadedView.error) { throw new Error('Desktop display preferences are unreadable. The file was preserved; repair or move it before retrying.'); }
	desktopView = restoreDesktopView(loadedView.value);
	desktopViewWriter = new StateWriter(value => viewStore.write(value), () => viewStore.read(), matchesDesktopView);
	const bounds = currentGeometry().bounds;
	mainWindow = new BrowserWindow({
		...bounds, title: 'Charmlet', frame: false, transparent: true, backgroundColor: '#00000000',
		resizable: false, thickFrame: false, alwaysOnTop: true, skipTaskbar: true, focusable: false, show: false,
		webPreferences: { preload: join(root, 'preload.cjs'), ...securityPreferences },
	});
	mainWindow.setIgnoreMouseEvents(true, { forward: true });
	mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
	mainWindow.webContents.on('will-navigate', event => event.preventDefault());
	mainWindow.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
		if (isMainFrame && !isInPlace) { rendererGeneration++; rendererReady = false; setToolsExpanded(false); }
	});
	mainWindow.on('blur', () => { windowDrag = undefined; mainWindow?.setFocusable(false); });
	mainWindow.on('move', recordWindowMove);
	mainWindow.on('resize', recordWindowMove);
	mainWindow.on('show', notifyVisibility);
	mainWindow.on('hide', notifyVisibility);
	mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); hideWindow(); } });
	mainWindow.webContents.on('did-finish-load', showInactive);
	applyWindowSize();
	await mainWindow.loadURL('charmlet://app/');
	createTray();
	unsubscribeCompanion = companion.subscribe(snapshot => {
		latestCompanion = snapshot;
		updateTrayStatus();
		if (rendererReady && mainWindow?.isVisible()) { send({ type: 'companion', snapshot }); }
		refreshGardenCatalogue();
	});
	const handleAway = () => { void pauseForAway(companion!).catch(() => latchBackgroundNotice('Focus could not be paused for away mode.')); };
	powerMonitor.on('suspend', handleAway);
	powerMonitor.on('lock-screen', handleAway);
	const handleDisplayChange = () => { try { fitCurrentWindow(); } catch { latchBackgroundNotice('Window placement could not be refreshed.'); } };
	screen.on('display-removed', handleDisplayChange);
	screen.on('display-metrics-changed', handleDisplayChange);

	if (process.env.CHARMLET_DESKTOP_TEST === '1') {
		(globalThis as typeof globalThis & { __charmletDesktopDiagnostic?: () => unknown }).__charmletDesktopDiagnostic = () => {
			const contents = mainWindow?.webContents as (WebContents & { getLastWebPreferences(): Record<string, unknown> }) | undefined;
			return {
				appName: app.getName(), profile, bounds: mainWindow?.getBounds(), ignored: mouseIgnored, focusable: mainWindow?.isFocusable(),
				visible: mainWindow?.isVisible(), rendererReady, rendererGeneration, backgroundNotice,
				desktopView: { ...desktopView }, anchor: { ...desktopAnchor }, geometry: currentGeometry(), toolsExpanded,
				measuredWindowState: { resizable: mainWindow?.isResizable(), alwaysOnTop: mainWindow?.isAlwaysOnTop(), focusable: mainWindow?.isFocusable() },
				configuredWindowFlags: { frame: false, transparent: true, skipTaskbar: true },
				webPreferences: contents?.getLastWebPreferences(), state: { ...state }, companion: companion?.snapshot(),
			};
		};
	}
}

ipcMain.on('charmlet:action', (event, message) => {
	void handleAction(event, message).catch(() => latchBackgroundNotice('A desktop action could not be completed.'));
});
app.on('second-instance', showInactive);
app.on('before-quit', event => {
	if (!quitting) {
		event.preventDefault();
		void shutdown().catch(() => { quitting = true; app.quit(); });
	}
});
app.on('window-all-closed', () => { /* Tray process remains available until explicit Quit. */ });
if (singleInstance) { void app.whenReady().then(initialize).catch(failInitialization); }
