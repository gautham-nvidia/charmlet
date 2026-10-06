export const CHARMS = [
	{ id: 'terminal', name: 'Terminal', file: 'keycap.svg', description: 'A little command-line companion.', accent: '#85d8bc' },
	{ id: 'chip', name: 'Chip', file: 'chip.svg', description: 'A tiny chip with a bright core.', accent: '#b0a6f2' },
	{ id: 'wafer', name: 'Wafer', file: 'wafer.svg', description: 'A little wafer of possibilities.', accent: '#efbc87' },
	{ id: 'circuit', name: 'Circuit', file: 'circuit.svg', description: 'Small traces, bright connections.', accent: '#88cee0' },
] as const;

export type CharmId = typeof CHARMS[number]['id'];

export function getCharm(id: unknown) {
	return CHARMS.find(charm => charm.id === id) ?? CHARMS[0];
}
