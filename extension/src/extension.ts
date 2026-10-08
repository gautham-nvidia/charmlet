import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CHARMS, type CharmDefinition } from './charm-catalog';
import { installPack, loadPacks, MAX_PACK_BYTES, packCharms, removePack, type CharmPack } from './charm-packs';
import { matchesSavedState, resetState, restoreState, type CharmState } from './charm-state';
import { CompanionController } from './companion-controller';
import { formatFocusTime, type CompanionSnapshot, type CompanionState } from './companion-core';
import { learningCard } from './learning-cards';
import { StateStore, type LoadedState } from './state-store';
import { StateWriter } from './state-writer';

let deactivateExtension: (() => Promise<void>) | undefined;

export async function deactivate() {
	await deactivateExtension?.();
}

export async function activate(context: vscode.ExtensionContext) {
	const packDirectory = vscode.Uri.joinPath(context.globalStorageUri, 'packs').fsPath;
	let packs: CharmPack[] = [];
	try {
		const loaded = await loadPacks(packDirectory);
		packs = loaded.packs;
		if (loaded.invalid.length) {
			console.warn(`Charmlet ignored ${loaded.invalid.length} invalid stored pack file(s).`);
		}
	} catch (error) {
		console.warn(`Charmlet could not load stored packs: ${error instanceof Error ? error.message : 'unknown error'}`);
	}

	const stateStore = new StateStore(context.globalStorageUri.fsPath);
	const loadedState = await stateStore.load(context.globalState.get('charmlet.state'));
	if (loadedState.error) {
		void vscode.window.showWarningMessage('Charmlet could not read its saved preferences. Review your charm settings.');
	}
	const catalogue = [...CHARMS, ...packCharms(packs)];
	const initialCharm = restoreState(loadedState.value, catalogue);
	const companionStore = new StateStore<CompanionState>(context.globalStorageUri.fsPath, 'companion.json');
	const loadedCompanion = await companionStore.load(undefined);
	if (loadedCompanion.error) {
		void vscode.window.showWarningMessage('Charmlet could not read companion settings. Review your focus and learning controls.');
	}
	const companion = new CompanionController(loadedCompanion.value, companionStore, initialCharm.messageIndex);
	await companion.initialize();

	const status = vscode.window.createStatusBarItem('charmlet', vscode.StatusBarAlignment.Right, -100);
	status.name = 'Charmlet';
	let latestCharm = initialCharm;
	let latestCompanion = companion.snapshot();
	const updateStatus = () => {
		const focus = latestCompanion.state.focus;
		if (focus.status !== 'idle') {
			const phase = focus.phase === 'focus' ? 'Focus' : 'Break';
			status.command = 'charmlet.focus';
			status.text = `$(clock) ${phase} ${formatFocusTime(latestCompanion.remainingMs)}`;
			status.tooltip = focus.status === 'running'
				? `${phase} session in progress · ${formatFocusTime(latestCompanion.remainingMs)} remaining`
				: focus.status === 'paused'
					? `${phase} session paused · ${formatFocusTime(latestCompanion.remainingMs)} remaining`
					: `${phase} complete · Open companion tools`;
		} else {
			status.command = 'charmlet.toggle';
			status.text = latestCharm.hidden ? '$(circle-outline) Charmlet' : '$(sparkle) Charmlet';
			status.tooltip = latestCharm.hidden ? 'Charmlet: Show charm' : 'Charmlet: Hide or restore charm';
		}
	};
	const provider = new CharmletView(context, state => {
		latestCharm = state;
		updateStatus();
	}, catalogue, stateStore, loadedState, companion);
	const unsubscribeCompanion = companion.subscribe(snapshot => {
		latestCompanion = snapshot;
		updateStatus();
		provider.postCompanion(snapshot);
	});
	let disposePromise: Promise<void> | undefined;
	const disposeCompanion = () => disposePromise ??= (async () => {
		unsubscribeCompanion();
		await companion.dispose();
		await provider.flush();
	})();
	deactivateExtension = disposeCompanion;

	const refreshCatalogue = async (selectedId?: string) => {
		await provider.setCatalogue([...CHARMS, ...packCharms(packs)], selectedId);
	};
	const importPack = async () => {
		try {
			const selected = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: { 'Charmlet Pack': ['json'] },
				openLabel: 'Import Charm Pack',
			});
			if (!selected?.[0]) { return; }
			const info = await vscode.workspace.fs.stat(selected[0]);
			if ((info.type & vscode.FileType.File) === 0 || info.size > MAX_PACK_BYTES) {
				throw new Error('Choose a bounded Charmlet pack JSON file (maximum 2 MiB).');
			}
			const input = await vscode.workspace.fs.readFile(selected[0]);
			const installed = await installPack(packDirectory, input);
			if (!installed.added) {
				void vscode.window.showInformationMessage(`${installed.pack.name} is already installed.`);
				return;
			}
			packs = [...packs, installed.pack];
			await refreshCatalogue(`pack:${installed.pack.id}:${installed.pack.charms[0].id}`);
			await provider.show();
			void vscode.window.showInformationMessage(`Imported ${installed.pack.name}.`);
		} catch (error) {
			void vscode.window.showErrorMessage(`Charmlet could not import the pack: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	};
	const removeInstalledPack = async () => {
		if (!packs.length) {
			void vscode.window.showInformationMessage('No imported Charmlet packs are installed.');
			return;
		}
		const selected = await vscode.window.showQuickPick(packs.map(pack => ({
			label: pack.name,
			description: `${pack.author} · ${pack.charms.length} ${pack.charms.length === 1 ? 'charm' : 'charms'}`,
			pack,
		})), { placeHolder: 'Choose an imported charm pack to remove' });
		if (!selected) { return; }
		try {
			await removePack(packDirectory, selected.pack.id);
			packs = packs.filter(pack => pack.id !== selected.pack.id);
			await refreshCatalogue();
			void vscode.window.showInformationMessage(`Removed ${selected.pack.name}.`);
		} catch (error) {
			void vscode.window.showErrorMessage(`Charmlet could not remove the pack: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	};

	context.subscriptions.push(
		status,
		vscode.window.registerWebviewViewProvider('charmlet.view', provider),
		vscode.commands.registerCommand('charmlet.show', () => provider.show()),
		vscode.commands.registerCommand('charmlet.hide', () => provider.update({ ...provider.state, hidden: true })),
		vscode.commands.registerCommand('charmlet.toggle', () => provider.toggle()),
		vscode.commands.registerCommand('charmlet.focus', () => provider.openCompanion('focus')),
		vscode.commands.registerCommand('charmlet.reset', async () => {
			await provider.update(resetState(provider.state));
			await provider.show();
		}),
		vscode.commands.registerCommand('charmlet.importPack', importPack),
		vscode.commands.registerCommand('charmlet.removePack', removeInstalledPack),
		{ dispose: () => { void disposeCompanion(); } },
	);
	updateStatus();
	status.show();
	return {
		getState: () => ({ ...provider.state }),
		getCompanion: () => companion.snapshot(),
		isVisible: () => provider.visible,
	};
}

class CharmletView implements vscode.WebviewViewProvider {
	state: CharmState;
	catalogue: readonly CharmDefinition[];
	private view?: vscode.WebviewView;
	private dropOnReady = false;
	private readonly stateWriter: StateWriter<CharmState>;
	private viewGeneration = 0;
	private traceOutput?: vscode.LogOutputChannel;
	private viewReady = false;
	private pendingCompanionTab: 'focus' | 'learn' | undefined;

	private trace(label: string, details: Record<string, unknown> = {}) {
		if (this.context.extensionMode !== vscode.ExtensionMode.Development || process.env.CHARMLET_TRACE_SAVES !== '1') { return; }
		try {
			if (!this.traceOutput) {
				this.traceOutput = vscode.window.createOutputChannel('Charmlet State Trace', { log: true });
				this.context.subscriptions.push(this.traceOutput);
			}
			const legacyStored = this.context.globalState.get<Partial<CharmState>>('charmlet.state');
			this.traceOutput.info(`[Charmlet state] ${JSON.stringify({
				time: Date.now(), label, current: this.state?.charmId, legacyStored: legacyStored?.charmId,
				view: this.viewGeneration, ...details,
			})}`);
		} catch {
			// Diagnostic logging must not change preference behavior.
		}
	}

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly changed: (state: CharmState) => void,
		catalogue: readonly CharmDefinition[],
		private readonly stateStore: StateStore,
		loadedState: LoadedState,
		private readonly companion: CompanionController,
	) {
		this.stateWriter = new StateWriter(
			async value => {
				this.trace('write-start', { requested: value.charmId });
				await this.stateStore.write(value);
				this.trace('write-returned', { requested: value.charmId });
			},
			async () => {
				const value = await this.stateStore.read();
				const saved = value && typeof value === 'object'
					? (value as Partial<CharmState>).charmId : undefined;
				this.trace('readback', { stored: saved, source: 'file' });
				return value;
			},
			matchesSavedState,
		);
		this.catalogue = catalogue;
		this.state = restoreState(loadedState.value, catalogue);
		changed(this.state);
		this.trace('restored', { source: loadedState.source });
	}

	private persist(snapshot: CharmState) {
		return this.stateWriter.save(snapshot);
	}

	async flush() {
		await Promise.all([this.stateWriter.flush(), this.companion.flush()]);
		this.trace('drained');
	}

	get visible() {
		return this.view?.visible ?? false;
	}

	resolveWebviewView(view: vscode.WebviewView) {
		const generation = ++this.viewGeneration;
		this.trace('view-resolved', { generation });
		this.view = view;
		this.viewReady = false;
		const resource = (path: string) => vscode.Uri.joinPath(this.context.extensionUri, path);
		view.webview.options = {
			enableScripts: true,
			localResourceRoots: [resource('dist'), resource('media')],
		};
		const template = readFileSync(resource('media/view.html').fsPath, 'utf8');
		view.webview.html = template
			.replaceAll('__NONCE__', randomBytes(16).toString('hex'))
			.replaceAll('__CSP__', view.webview.cspSource)
			.replaceAll('__SCRIPT__', view.webview.asWebviewUri(resource('dist/webview.js')).toString())
			.replaceAll('__STYLE__', view.webview.asWebviewUri(resource('media/view.css')).toString())
			.replaceAll('__CHARM__', view.webview.asWebviewUri(resource('media/keycap.svg')).toString());
		const messages = view.webview.onDidReceiveMessage(async (message: unknown) => {
			if (!message || typeof message !== 'object' || !('type' in message)) {
				return;
			}
			if (message.type === 'ready') {
				await this.flush();
				this.trace('ready-state', { generation });
				const includedTab = this.pendingCompanionTab;
				await view.webview.postMessage({
					type: 'state', state: this.state, catalogue: this.catalogue, drop: this.dropOnReady, visible: view.visible,
					companion: this.companion.snapshot(),
					...(includedTab ? { companionTab: includedTab } : {}),
				});
				if (this.view !== view) { return; }
				if (this.pendingCompanionTab === includedTab) { this.pendingCompanionTab = undefined; }
				this.viewReady = true;
				this.dropOnReady = false;
				const nextTab = this.pendingCompanionTab;
				if (nextTab) {
					await view.webview.postMessage({ type: 'companion-open', tab: nextTab });
					if (this.view === view && this.pendingCompanionTab === nextTab) { this.pendingCompanionTab = undefined; }
				}
			} else if (message.type === 'save' && 'state' in message) {
				const revision = 'revision' in message && Number.isSafeInteger(message.revision) && Number(message.revision) >= 0
					? Number(message.revision) : undefined;
				this.state = restoreState(message.state, this.catalogue);
				this.changed(this.state);
				this.trace('save-received', { generation, revision, requested: this.state.charmId });
				try {
					await this.persist({ ...this.state });
					this.trace('save-ack', { generation, revision });
					if (revision !== undefined) { await view.webview.postMessage({ type: 'saved', revision }); }
				} catch {
					this.trace('save-error', { generation, revision });
					if (revision !== undefined) { await view.webview.postMessage({ type: 'save-error', revision }); }
					void vscode.window.showErrorMessage('Charmlet could not save its settings.');
				}
			} else if (message.type === 'companion-action' && 'requestId' in message && 'action' in message
				&& Number.isSafeInteger(message.requestId) && Number(message.requestId) >= 0) {
				const requestId = Number(message.requestId);
				try {
					const result = await this.companion.dispatch(message.action);
					await view.webview.postMessage({ type: 'companion-result', requestId, message: result.message });
				} catch {
					await view.webview.postMessage({
						type: 'companion-result', requestId,
						error: this.companion.snapshot().error ?? 'The companion action could not be saved. Try again.',
					});
				}
			} else if (message.type === 'learning-source' && 'cardId' in message) {
				const card = typeof message.cardId === 'string' ? learningCard(message.cardId) : undefined;
				if (card?.source) { await vscode.env.openExternal(vscode.Uri.parse(card.source.url)); }
			} else if (message.type === 'command' && 'command' in message
				&& (message.command === 'charmlet.importPack' || message.command === 'charmlet.removePack')) {
				await vscode.commands.executeCommand(message.command);
			}
		});
		const visibility = view.onDidChangeVisibility(() => {
			void view.webview.postMessage({ type: 'visibility', visible: view.visible });
			if (view.visible) { this.postCompanion(this.companion.snapshot()); }
		});
		view.onDidDispose(() => {
			this.trace('view-disposed', { generation });
			messages.dispose();
			visibility.dispose();
			if (this.view === view) {
				this.viewReady = false;
				this.view = undefined;
			}
		});
	}

	postCompanion(snapshot: CompanionSnapshot) {
		if (this.view?.visible && this.viewReady) {
			void this.view.webview.postMessage({ type: 'companion', snapshot });
		}
	}

	async openCompanion(tab: 'focus' | 'learn') {
		this.pendingCompanionTab = tab;
		if (this.view) {
			this.view.show(true);
			if (this.viewReady) {
				await this.view.webview.postMessage({ type: 'companion-open', tab });
				this.pendingCompanionTab = undefined;
			}
		} else {
			await vscode.commands.executeCommand('charmlet.view.focus');
		}
	}

	async setCatalogue(catalogue: readonly CharmDefinition[], selectedId?: string) {
		this.catalogue = catalogue;
		this.state = restoreState({ ...this.state, charmId: selectedId ?? this.state.charmId }, catalogue);
		this.trace('catalogue-state');
		this.changed(this.state);
		await this.persist({ ...this.state });
		await this.view?.webview.postMessage({ type: 'catalogue', catalogue: this.catalogue, state: this.state });
	}

	async update(state: CharmState, drop = false) {
		this.state = restoreState(state, this.catalogue);
		this.trace('command-state', { drop });
		this.changed(this.state);
		await this.persist({ ...this.state });
		await this.view?.webview.postMessage({ type: 'state', state: this.state, drop });
	}

	async show() {
		const editor = vscode.window.activeTextEditor;
		this.dropOnReady = true;
		if (this.view) {
			this.view.show(true);
		} else {
			await vscode.commands.executeCommand('charmlet.view.focus');
		}
		await this.update({ ...this.state, hidden: false }, true);
		if (editor) {
			await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
		}
	}

	async toggle() {
		if (!this.visible || this.state.hidden) {
			await this.show();
		} else {
			await this.update({ ...this.state, hidden: true });
		}
	}
}
