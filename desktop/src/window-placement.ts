export interface DesktopBounds { x: number; y: number; width: number; height: number; }
export const DEFAULT_DESKTOP_SIZE = { width: 340, height: 620 } as const;
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
		x: value.x!, y: value.y!, width: clamp(value.width!, 280, 520), height: clamp(value.height!, 360, 800),
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
