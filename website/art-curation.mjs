export function curateArtwork(item, rules) {
  const decision = rules.original.includes(item.id) ? 'original'
    : rules.retire.includes(item.id) ? 'retired'
      : Object.hasOwn(rules.redraw, item.id)
        ? item.revision >= rules.redraw[item.id] ? 'redrawn' : 'awaiting-redraw'
        : rules.retain.includes(item.id) ? 'retained' : 'new';
  return {
    ...item,
    name: rules.names[item.id] ?? item.name,
    group: rules.groups[item.id] ?? item.group,
    decision,
    featured: decision !== 'retired' && decision !== 'awaiting-redraw',
  };
}

export function validateCuration(rules, items) {
  const classified = [...rules.original, ...rules.retain, ...rules.retire, ...Object.keys(rules.redraw)];
  const ids = new Set(items.map(item => item.id));
  if (new Set(classified).size !== classified.length || classified.some(id => !ids.has(id))) {
    throw new Error('Artwork curation contains an unknown or conflicting decision.');
  }
  if (Object.values(rules.redraw).some(revision => !Number.isInteger(revision) || revision < 2)) {
    throw new Error('Replacement artwork must have a new revision.');
  }
}
