import { contextBridge, ipcRenderer } from 'electron';

let cachedViewState: unknown;
const api = {
	getState: () => cachedViewState,
	setState: (value: unknown) => { cachedViewState = value; },
	postMessage: (message: unknown) => ipcRenderer.send('charmlet:action', message),
};
contextBridge.exposeInMainWorld('acquireVsCodeApi', () => api);
ipcRenderer.on('charmlet:message', (_event, message) => window.postMessage(message, '*'));
