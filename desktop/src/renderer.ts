import { resize } from '../../extension/src/webview';

let anchor = '';
window.addEventListener('message', event => {
	if (event.source !== window || event.data?.type !== 'desktop-placement') { return; }
	const next = `${document.body.dataset.desktopAnchorX},${document.body.dataset.desktopAnchorY}`;
	if (anchor === next) { return; }
	anchor = next;
	resize();
});
