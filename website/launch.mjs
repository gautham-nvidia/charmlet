function publicUrl(value) {
  if (typeof value !== 'string') throw new Error('A public destination must be an HTTPS URL.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
    throw new Error('Use a public HTTPS destination without credentials, a port or a fragment.');
  }
  return url;
}

/** Public links only. A configured shop owns checkout and purchase delivery. */
export function validateLaunch(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['desktop', 'shop'].includes(key))) {
    throw new Error('Launch settings accept only desktop and shop destinations.');
  }
  const desktop = input.desktop ?? {};
  if (typeof desktop !== 'object' || Array.isArray(desktop)
    || Object.keys(desktop).some(key => !['windows', 'macos'].includes(key))) {
    throw new Error('Desktop destinations must identify Windows or macOS.');
  }
  const result = { desktop: { windows: null, macos: null }, shop: null };
  for (const [platform, archivePlatform] of [['windows', 'win32'], ['macos', 'darwin']]) {
    if (desktop[platform] == null) continue;
    const url = publicUrl(desktop[platform]);
    const suffix = platform === 'windows' ? '\\.zip' : '\\.tar\\.gz';
    const path = new RegExp(`^/gautham-nvidia/charmlet/releases/download/[a-zA-Z0-9._-]+/Charmlet-desktop-\\d+\\.\\d+\\.\\d+-${archivePlatform}-(?:x64|arm64)${suffix}$`);
    if (url.hostname !== 'github.com' || url.search || !path.test(url.pathname)) {
      throw new Error(`Use a published Charmlet ${platform} release archive.`);
    }
    result.desktop[platform] = url.href;
  }
  if (input.shop != null) {
    const shop = input.shop;
    if (typeof shop !== 'object' || Array.isArray(shop)
      || Object.keys(shop).some(key => !['provider', 'url'].includes(key))
      || !['shopify', 'stripe', 'square'].includes(shop.provider)) {
      throw new Error('A shop needs its provider and public storefront or payment-link URL.');
    }
    result.shop = { provider: shop.provider, url: publicUrl(shop.url).href };
  }
  return result;
}
