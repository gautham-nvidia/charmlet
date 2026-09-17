import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DEFAULT_STATE, restoreState, type CharmState } from './charm-state';

export function activate(context: vscode.ExtensionContext) {
	const status = vscode.window.createStatusBarItem('charmlet', vscode.StatusBarAlignment.Right, -100);
	status.name = 'Charmlet';
	status.command = 'charmlet.toggle';
	const provider = new CharmletView(context, state => {
		status.text = state.hidden ? '$(circle-outline) Charmlet' : '$(sparkle) Charmlet';
		status.tooltip = state.hidden ? 'Charmlet: Show charm' : 'Charmlet: Hide or restore charm';
	});
	context.subscriptions.push(
		status,
		vscode.window.registerWebviewViewProvider('charmlet.view', provider),
		vscode.commands.registerCommand('charmlet.show', () => provider.show()),
		vscode.commands.registerCommand('charmlet.hide', () => provider.update({ ...provider.state, hidden: true })),
		vscode.commands.registerCommand('charmlet.toggle', () => provider.toggle()),
		vscode.commands.registerCommand('charmlet.reset', async () => {
			await provider.update({ ...DEFAULT_STATE, reducedMotion: provider.state.reducedMotion });
			await provider.show();
		}),
	);
	status.show();
	return { getState: () => ({ ...provider.state }), isVisible: () => provider.visible };
}

class CharmletView implements vscode.WebviewViewProvider {
	state: CharmState;
	private view?: vscode.WebviewView;
	private dropOnReady = false;

	constructor(private readonly context: vscode.ExtensionContext, private readonly changed: (state: CharmState) => void) {
		this.state = restoreState(context.globalState.get('charmlet.state'));
		changed(this.state);
	}

	get visible() {
		return this.view?.visible ?? false;
	}

	resolveWebviewView(view: vscode.WebviewView) {
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
				await view.webview.postMessage({ type: 'state', state: this.state, drop: this.dropOnReady, visible: view.visible });
				this.dropOnReady = false;
			} else if (message.type === 'save' && 'state' in message) {
				this.state = restoreState(message.state);
				this.changed(this.state);
				await this.context.globalState.update('charmlet.state', this.state);
			}
		});
		const visibility = view.onDidChangeVisibility(() => {
			void view.webview.postMessage({ type: 'visibility', visible: view.visible });
		});
		view.onDidDispose(() => {
			messages.dispose();
			visibility.dispose();
			if (this.view === view) {
				this.view = undefined;
			}
		});
	}

	async update(state: CharmState, drop = false) {
		this.state = restoreState(state);
		this.changed(this.state);
		await this.view?.webview.postMessage({ type: 'state', state: this.state, drop });
		await this.context.globalState.update('charmlet.state', this.state);
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
