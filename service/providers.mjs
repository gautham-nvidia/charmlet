import { boundedBody, HttpError } from './security.mjs';

async function providerJson(url, options, fetcher) {
  const response = await fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new HttpError(503, 'The delivery service is temporarily unavailable. Please try again.');
  const bytes = await boundedBody(response, 65536);
  return bytes.byteLength ? JSON.parse(new TextDecoder().decode(bytes)) : null;
}

export function createProviders(env, fetcher = fetch) {
  const brevoHeaders = { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' };
  return {
    async email(to, link, offers, purpose) {
      await providerJson('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: brevoHeaders,
        body: JSON.stringify({ sender: { name: 'Charmlet', email: env.MAIL_FROM }, to: [{ email: to }],
          subject: offers ? 'Confirm your Charmlet email and offers' : 'Your Charmlet download link',
          textContent: `Confirm your email to continue with Charmlet:\n\n${link}\n\n`
            + 'This link expires in 15 minutes and works once. No username or password is needed.\n'
            + (purpose === 'trial' ? 'Confirming starts your one-time 30-day Pro trial, unless this email has already used it. No card or automatic charge.\n' : '')
            + (offers ? 'You chose occasional Charmlet news and offer codes. Confirming this link confirms that choice. You can unsubscribe from every marketing email.\n'
              : 'This download request does not subscribe you to marketing.\n')
            + 'If you did not request this email, you can ignore it.' }),
      }, fetcher);
    },
    async subscribe(email) {
      if (!/^[1-9]\d*$/.test(String(env.BREVO_LIST_ID ?? ''))) return false;
      await providerJson('https://api.brevo.com/v3/contacts', {
        method: 'POST', headers: brevoHeaders,
        body: JSON.stringify({ email, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true, emailBlacklisted: false }),
      }, fetcher);
      return true;
    },
    async human(token) {
      if (typeof token !== 'string' || !token || token.length > 2048) return false;
      const result = await providerJson('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
      }, fetcher);
      return result.success === true && result.hostname === new URL(env.WEB_ORIGIN).hostname
        && result.action === 'charmlet-download';
    },
    async checkout(cart) {
      const headers = { Authorization: `Bearer ${env.LEMON_API_KEY}`, Accept: 'application/vnd.api+json' };
      const variant = await providerJson(`https://api.lemonsqueezy.com/v1/variants/${cart.variantId}`, { headers }, fetcher);
      const store = await providerJson(`https://api.lemonsqueezy.com/v1/stores/${env.LEMON_STORE_ID}`, { headers }, fetcher);
      if (variant?.data?.type !== 'variants' || String(variant.data.id) !== cart.variantId
        || variant.data.attributes?.is_subscription !== false || variant.data.attributes?.pay_what_you_want === true
        || store?.data?.type !== 'stores' || String(store.data.id) !== env.LEMON_STORE_ID
        || store.data.attributes?.currency !== 'USD') {
        throw new HttpError(503, 'Checkout must use a fixed-price, one-time USD product.');
      }
      const result = await providerJson('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST', headers: {
          Authorization: `Bearer ${env.LEMON_API_KEY}`, 'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
        body: JSON.stringify({ data: { type: 'checkouts', attributes: {
          custom_price: cart.amount,
          product_options: { enabled_variants: [Number(cart.variantId)],
            redirect_url: `${env.WEB_ORIGIN}/download.html?checkout=complete`,
            description: cart.kind === 'pro' ? 'Charmlet Pro: all current apps, one permanent purchase.'
              : `${cart.items.length} Charmlet digital item${cart.items.length === 1 ? '' : 's'}.` },
          checkout_data: { custom: { charmlet_cart: cart.id } },
          checkout_options: { discount: cart.kind === 'pro' },
          expires_at: new Date(cart.createdAt + 30 * 60000).toISOString(),
          test_mode: env.TEST_MODE === 'true',
        }, relationships: {
          store: { data: { type: 'stores', id: env.LEMON_STORE_ID } },
          variant: { data: { type: 'variants', id: cart.variantId } },
        } } }),
      }, fetcher);
      const url = new URL(result?.data?.attributes?.url);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.lemonsqueezy.com')
        || url.username || url.password || url.port) throw new HttpError(503, 'Checkout could not be opened.');
      return url.href;
    },
  };
}
