export function securityHeaders(apiOrigin = null) {
  let api = '';
  if (apiOrigin) {
    const url = new URL(apiOrigin);
    if (url.protocol !== 'https:' || url.origin !== apiOrigin || url.username || url.password) throw new Error('Invalid API origin for website policy.');
    api = ` ${url.origin}`;
  }
  return {
    'Content-Security-Policy': `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; `
      + `script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; `
      + `img-src 'self' data: blob:; font-src 'self'; connect-src 'self'${api} https://challenges.cloudflare.com; `
      + `frame-src https://challenges.cloudflare.com; form-action 'self'`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };
}
