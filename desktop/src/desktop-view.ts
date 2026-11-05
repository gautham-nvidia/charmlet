export interface DesktopView {
	background: boolean;
	toolbarPinned: boolean;
	messagesPinned: boolean;
}

export const TOOLS_HEIGHT = 620;
export const MESSAGES_HEIGHT = 420;

export function restoreDesktopView(value: unknown): DesktopView {
	const source = value && typeof value === 'object' ? value as Partial<DesktopView> : {};
	return {
		background: source.background === true,
		toolbarPinned: source.toolbarPinned === true,
		messagesPinned: source.messagesPinned === true,
	};
}

export function matchesDesktopView(expected: DesktopView, actual: unknown): boolean {
	if (!actual || typeof actual !== 'object') { return false; }
	const value = actual as Partial<DesktopView>;
	return value.background === expected.background && value.toolbarPinned === expected.toolbarPinned
		&& value.messagesPinned === expected.messagesPinned;
}

export const DESKTOP_HEADER = `<header id="desktop-header" aria-label="Desktop controls">
	<button id="desktop-move" type="button" aria-label="Move Charmlet" title="Drag to move. Arrow keys move a little; Shift moves farther.">
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/></svg><span>Move</span>
	</button>
	<button id="desktop-tools" type="button" aria-label="Show controls" aria-controls="primary-nav" aria-expanded="false" title="Show controls">
		<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Tools</span>
	</button>
	<button id="desktop-hide" type="button" aria-label="Hide Charmlet to tray" title="Hide to tray">
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14"/></svg>
	</button>
</header>`;
