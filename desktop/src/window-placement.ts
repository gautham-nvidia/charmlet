export interface DesktopBounds { x: number; y: number; width: number; height: number; }
export interface DesktopAnchor { x: number; y: number; }
export const DEFAULT_DESKTOP_SIZE = { width: 340, height: 300 } as const;
function finiteInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= 1000000;
}
function validArea(value: DesktopBounds): boolean {
	return finiteInteger(value.x) && finiteInteger(value.y) && finiteInteger(value.width) && finiteInteger(value.height)
		&& value.width > 0 && value.height > 0;
}
function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)); }
function overlap(a: DesktopBounds, b: DesktopBounds): number {
	return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
		* Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

/** Work areas use Electron DIP coordinates. The caller puts the primary display first. */
export function fitDesktopBounds(saved: unknown, workAreas: readonly DesktopBounds[]): DesktopBounds {
	const areas = workAreas.filter(validArea);
	if (!areas.length) { throw new Error('No usable display work area.'); }
	const value = saved && typeof saved === 'object' ? saved as Partial<DesktopBounds> : {};
	const valid = finiteInteger(value.x) && finiteInteger(value.y) && finiteInteger(value.width) && finiteInteger(value.height)
		&& value.width > 0 && value.height > 0;
	const proposed: DesktopBounds | undefined = valid ? {
		x: value.x!, y: value.y!, width: clamp(value.width!, 280, 520), height: clamp(value.height!, 260, 800),
	} : undefined;
	let target = areas[0];
	let bestOverlap = 0;
	if (proposed) {
		for (const area of areas) {
			const areaOverlap = overlap(proposed, area);
			if (areaOverlap > bestOverlap) { target = area; bestOverlap = areaOverlap; }
		}
	}
	const width = Math.min(target.width, proposed?.width ?? DEFAULT_DESKTOP_SIZE.width);
	const height = Math.min(target.height, proposed?.height ?? DEFAULT_DESKTOP_SIZE.height);
	const canRestore = proposed !== undefined && bestOverlap > 0;
	return {
		x: clamp(canRestore ? proposed.x : target.x + target.width - width - 16, target.x, target.x + target.width - width),
		y: clamp(canRestore ? proposed.y : target.y + 16, target.y, target.y + target.height - height),
		width, height,
	};
}

function nearestArea(point: DesktopAnchor, areas: readonly DesktopBounds[]): DesktopBounds {
	return areas.reduce((nearest, area) => {
		const distance = (candidate: DesktopBounds) => Math.hypot(
			point.x - clamp(point.x, candidate.x, candidate.x + candidate.width),
			point.y - clamp(point.y, candidate.y, candidate.y + candidate.height),
		);
		return distance(area) < distance(nearest) ? area : nearest;
	});
}

/** The peg is independent of the compact controls, so menus cannot restrict charm play. */
export function fitDesktopAnchor(saved: unknown, workAreas: readonly DesktopBounds[]): DesktopAnchor {
	const areas = workAreas.filter(validArea);
	if (!areas.length) { throw new Error('No usable display work area.'); }
	const value = saved && typeof saved === 'object' ? saved as Partial<DesktopAnchor> : {};
	const valid = finiteInteger(value.x) && finiteInteger(value.y);
	const target = valid ? nearestArea(value as DesktopAnchor, areas) : areas[0];
	const side = Math.min(88, target.width / 2);
	return {
		x: Math.round(clamp(valid ? value.x! : target.x + target.width - 120, target.x + side, target.x + target.width - side)),
		y: Math.round(clamp(valid ? value.y! : target.y + 3, target.y + 3, target.y + target.height - Math.min(200, target.height - 3))),
	};
}

export function matchesDesktopAnchor(expected: DesktopAnchor, actual: unknown): boolean {
	if (!actual || typeof actual !== 'object') { return false; }
	const value = actual as Partial<DesktopAnchor>;
	return value.x === expected.x && value.y === expected.y;
}

export function legacyDesktopAnchor(saved: unknown): DesktopAnchor | undefined {
	if (!saved || typeof saved !== 'object') { return undefined; }
	const bounds = saved as DesktopBounds;
	return validArea(bounds) ? { x: Math.round(bounds.x + bounds.width / 2), y: bounds.y + 40 } : undefined;
}

export function desktopGeometry(anchor: DesktopAnchor, workAreas: readonly DesktopBounds[], panelHeight: number) {
	const bounds = nearestArea(anchor, workAreas.filter(validArea));
	const local = { x: anchor.x - bounds.x, y: anchor.y - bounds.y };
	const width = Math.min(DEFAULT_DESKTOP_SIZE.width, bounds.width);
	const height = Math.min(panelHeight, bounds.height);
	return {
		bounds: { ...bounds }, anchor: local,
		frame: {
			x: Math.round(clamp(local.x - width / 2, 0, bounds.width - width)),
			y: Math.round(clamp(local.y - 52, 0, bounds.height - height)), width, height,
		},
	};
}
