export function validateDistribution(input, manifest) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Distribution settings must be an object.');
  const result = { marketplace: null, openVsx: null };
  for (const key of Object.keys(result)) {
    const value = input[key];
    if (value === null || value === undefined) continue;
    if (typeof value !== 'string') throw new Error(`${key} must be a verified HTTPS listing URL or null.`);
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('Use a verified HTTPS store listing.');
    if (key === 'marketplace') {
      if (url.hostname !== 'marketplace.visualstudio.com' || url.port || url.pathname !== '/items'
        || url.searchParams.get('itemName') !== `${manifest.publisher}.${manifest.name}`
        || [...url.searchParams.keys()].some(name => name !== 'itemName')
        || url.searchParams.getAll('itemName').length !== 1) throw new Error('Marketplace listing must match this extension identity.');
    } else if (url.hostname !== 'open-vsx.org' || url.port || url.pathname !== `/extension/${manifest.publisher}/${manifest.name}` || url.search) {
      throw new Error('Open VSX listing must match this extension identity.');
    }
    result[key] = url.toString();
  }
  return result;
}
