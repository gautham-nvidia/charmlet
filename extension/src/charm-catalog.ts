import builtinCharms from './builtin-charms.json';
import type { CharmAttachment } from './charm-attachment';
export interface CharmDefinition {
	id: string;
	name: string;
	file: string;
	description: string;
	accent: string;
	group: string;
	source?: string;
	attachment?: CharmAttachment;
}
export const CHARMS: readonly CharmDefinition[] = builtinCharms;
export type CharmId = string;
export function getCharm(id: unknown, charms: readonly CharmDefinition[] = CHARMS): CharmDefinition {
	return charms.find(charm => charm.id === id) ?? CHARMS[0];
}
