import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CHARMS, type CharmDefinition } from './charm-catalog';
import { installPack, loadPacks, MAX_PACK_BYTES, packCharms, removePack, type CharmPack } from './charm-packs';
import { matchesSavedState, resetState, restoreState, type CharmState } from './charm-state';
import { StateStore, type LoadedState } from './state-store';
import { StateWriter } from './state-writer';

let flushWrites: (() => Promise<void>) | undefined;

export async function deactivate() {
	await flushWrites?.();
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

	const status = vscode.window.createStatusBarItem('charmlet', vscode.StatusBarAlignment.Right, -100);
	status.name = 'Charmlet';
	status.command = 'charmlet.toggle';
	const provider = new CharmletView(context, state => {
		status.text = state.hidden ? '$(circle-outline) Charmlet' : '$(sparkle) Charmlet';
		status.tooltip = state.hidden ? 'Charmlet: Show charm' : 'Charmlet: Hide or restore charm';
	}, [...CHARMS, ...packCharms(packs)], stateStore, loadedState);
	flushWrites = () => provider.flush();

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
		vscode.commands.registerCommand('charmlet.reset', async () => {
			await provider.update(resetState(provider.state));
			await provider.show();
		}),
		vscode.commands.registerCommand('charmlet.importPack', importPack),
		vscode.commands.registerCommand('charmlet.removePack', removeInstalledPack),
	);
	status.show();
	return { getState: () => ({ ...provider.state }), isVisible: () => provider.visible };
}

class CharmletView implements vscode.WebviewViewProvider {
	state: CharmState;
	catalogue: readonly CharmDefinition[];
	private view?: vscode.WebviewView;
	private dropOnReady = false;
	private readonly stateWriter: StateWriter<CharmState>;
	private viewGeneration = 0;
	private traceOutput?: vscode.LogOutputChannel;

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
		await this.stateWriter.flush();
		this.trace('drained');
	}

	get visible() {
		return this.view?.visible ?? false;
	}

	resolveWebviewView(view: vscode.WebviewView) {
		const generation = ++this.viewGeneration;
		this.trace('view-resolved', { generation });
		this.view = view;
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
				await view.webview.postMessage({ type: 'state', state: this.state, catalogue: this.catalogue, drop: this.dropOnReady, visible: view.visible });
				this.dropOnReady = false;
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
			} else if (message.type === 'command' && 'command' in message
				&& (message.command === 'charmlet.importPack' || message.command === 'charmlet.removePack')) {
				await vscode.commands.executeCommand(message.command);
			}
		});
		const visibility = view.onDidChangeVisibility(() => {
			void view.webview.postMessage({ type: 'visibility', visible: view.visible });
		});
		view.onDidDispose(() => {
			this.trace('view-disposed', { generation });
			messages.dispose();
			visibility.dispose();
			if (this.view === view) {
				this.view = undefined;
			}
		});
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
