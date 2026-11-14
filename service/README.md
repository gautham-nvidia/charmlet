# Charmlet email, trial and purchase service

This service prepares **email confirmation → app download → optional 30-day Pro trial → one-time purchase → protected downloads**. It uses no customer passwords. **The checked-in configuration is inactive.** Real email, checkout and file delivery require your accounts, sender and release artifacts.

The frontend is a static site; the service runs on Cloudflare Workers with D1 for records and a private R2 bucket for downloads. Brevo sends email. Lemon Squeezy provides hosted, one-time checkout and transaction-tax handling as merchant of record. Shopify can wait until physical merchandise exists.

## Product rules

| Offer | Behaviour |
|---|---|
| Free app | 31 fixed starter charms; focus, garden, encouragement, basic photo tools and personal imports |
| More free picks | 15 additional claims online, without starting a trial |
| Trial | The entire in-app collection for 30 days from confirmation/start; once per normalized email |
| Pro | $7.49 launch / $17.49 regular, once, across the current apps |
| Individual extras | $0.49 / $0.99 / $1.99; 49¢ items must check out with another paid item |
| Trial expiry | Free and purchased content, local photos and progress remain |
| Early beta | Existing local beta profiles retain the frozen 234-design beta collection; not future additions |

Starter IDs and prices come from `extension/src/starter-selection.json` and `catalogue-access.ts`. Pro price comes from `website/commerce.json`. The server derives checkout amounts from its own generated catalogue. Artist studies are marked unavailable for individual sale; their rights and the bundled-artwork terms still need review before public commercialization.

The **shared renderer and current artwork remain bundled in the apps** so live companions work offline. The new edition limits which items a fresh profile can select. Downloaded image packs are data-only files; live companions and fidgets are unlocked with a signed access file. This is not a claim that previously public beta artwork is a secret or that an open-source app cannot be modified.

## What is already checked

Service tests exercise real SQLite with the D1 statement interface: immutable trial deadlines, Gmail alias normalization, single-use/expired links, consent, signed grants, forged data, prices, webhook signatures and matching payment details, duplicate/out-of-order events, ownership, refunds, rates, origins and bounded input. Sandbox records and credentials are separated from live records; release apps reject sandbox signatures.

The Worker bundles with Wrangler and the schema has been applied to the local D1 runtime. **These checks do not prove delivery through a real Brevo account or Lemon Squeezy store.** Complete the account-level acceptance run below before opening signup or taking payment.

## 1. Create the accounts and public addresses

Use your own browser for login, recovery details and merchant verification. Do not put passwords or API keys into chat.

1. Create a Cloudflare Pages project for the website, a Workers subdomain and a Turnstile widget for the exact website hostname. Start on the free tiers; R2 activation may require a billing method and usage beyond allowances can cost money.
2. Create a Brevo account using the official Charmlet inbox, **getcharmlet@gmail.com**, and verify an authenticated-domain sender for transactional delivery. Create a separate list for **confirmed, optional offers**. Free-plan sending limits apply to all email, not just campaigns.
3. Create a Lemon Squeezy store when ready for payment testing. Confirm your business country is supported and complete merchant approval. Use USD and create **two fixed-price, one-time variants**: Charmlet Pro and a digital-items basket. Do not enable a subscription, quantity changes or pay-what-you-want. Hosted coupon entry is enabled for Pro; individual-item checkout keeps it off.
4. Configure the payment webhook for `/v1/webhooks/lemon`, with `order_created` and `order_refunded`, and keep its signing secret private.

No physical products, shipping fields or merchandise preorders are needed. Keep future merchandise separate from digital access.

### Gmail, subscriptions and Pro offers

The owner created **getcharmlet@gmail.com** as Charmlet's official support and administration inbox. It is configured as the website's public contact address. A Google Workspace mailbox is optional; do not buy it just to manage a subscriber list. Before public email delivery, use an authenticated domain you own for Brevo sending and test how replies reach this support inbox. Domain authentication does not require a paid Google Workspace mailbox.

The Gmail address alone does not connect the signup forms. Brevo, the confirmed-offers list, sender authentication and the service still need setup. The configuration helper already offers this address as the support-email default. Complete Gmail security and recovery settings directly in the account; do not put its password or recovery codes in the project or chat.

The homepage offers popup asks only for an email and explicit subscription consent. It closes with Escape, the close button, the backdrop or “Maybe later”; dismissal lasts seven days on that browser, and the footer can reopen it. The separate download form keeps its offers checkbox unchecked. Only a confirmed email joins the Brevo offers list. Joining does not start a trial, charge a card or unlock Pro. No email is saved in browser storage.

The popup is disabled until the service, Turnstile and Brevo offers list are configured. `website/audience.json` is legacy contact/form metadata; its form URL alone does not connect the popup. Use the configuration helper below and the Worker secrets/list ID. Keep customer records in the configured services.

Create the offer code and amount in Lemon Squeezy when ready. Restrict it to the Pro variant, choose an expiry and redemption limit, then test a discounted purchase and refund before mailing it to confirmed Brevo subscribers. The website does not invent codes or promise a particular discount. The signed webhook checks the original cart subtotal and a bounded provider discount; a browser-supplied lower price cannot grant access.

Sports Icons are included with Pro and cannot be purchased individually or claimed as free extras, even if their public-release flag later changes. Artwork and likeness review remains separate from this access rule.

## 2. Prepare Cloudflare and public app configuration

Run from the repository root. These commands use the project's locked CLI and print progress. The account login opens your browser.

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
$env:WRANGLER_SEND_METRICS = "false"
npm ci --prefix extension
npm ci --prefix service
& ".\service\node_modules\.bin\wrangler.cmd" login
& ".\service\node_modules\.bin\wrangler.cmd" d1 create charmlet-access
& ".\service\node_modules\.bin\wrangler.cmd" r2 bucket create charmlet-private-downloads
node service/configure.mjs
```

The configuration helper asks only for **public** website/API addresses, support and sender addresses, the Turnstile site key and the database ID returned by Cloudflare. It generates an Ed25519 signing key and a stable email-hash secret in your user profile's `.charmlet-publisher` directory, outside the repository. Existing key material is reused.

Back up that private directory securely. Losing the email-hash secret breaks the connection to existing trial/ownership records. Do not rotate it casually. Never commit the private signing key. Only its public half goes into the apps.

The helper updates the app API origin/public key, website settings, Worker bindings and the exact API origin in Vercel's security policy. It leaves checkout off and the service in test mode.

## 3. Build and stage the releases

**Rebuild the apps after setting the public key.** An old binary built with an empty keyring cannot activate a new access file. Use the normal app checks and platform builds, then stage only those validated archives:

**On the Windows PC (PowerShell):**

```powershell
npm --prefix extension run compile
npm --prefix extension run test:unit
npm --prefix extension run package:vsix
npm --prefix desktop run build
npm --prefix desktop run package
node desktop/archive.mjs
npm --prefix service run stage
node website/build.mjs
node service/configure.mjs --check
```

The Mac archive must come from the tested Mac build. A missing platform remains unavailable. `service/private-assets` contains private pack/app objects; `service/catalogue.json` records installer hashes and sizes. Public `website/dist` contains thumbnails and the portal, **no raw pack downloads or installer**.

Upload the staged objects to the private R2 bucket, preserving their `apps/` and `packs/` paths. Use the Cloudflare dashboard or the locked Wrangler R2 object commands. Never enable the bucket's public `r2.dev` URL. A staged file is not automatically uploaded.

## 4. Apply the database and deploy the closed service

**On the Windows PC (PowerShell):**

```powershell
& ".\service\node_modules\.bin\wrangler.cmd" d1 execute DB --config service/wrangler.jsonc --remote --file service/schema.sql
& ".\service\node_modules\.bin\wrangler.cmd" deploy --config service/wrangler.jsonc
node service/publish-signing-secrets.mjs
& ".\service\node_modules\.bin\wrangler.cmd" secret put BREVO_API_KEY --config service/wrangler.jsonc
& ".\service\node_modules\.bin\wrangler.cmd" secret put TURNSTILE_SECRET --config service/wrangler.jsonc
& ".\service\node_modules\.bin\wrangler.cmd" secret put LEMON_API_KEY --config service/wrangler.jsonc
& ".\service\node_modules\.bin\wrangler.cmd" secret put LEMON_WEBHOOK_SECRET --config service/wrangler.jsonc
```

Enter each provider secret in your own terminal when prompted. The signing helper uploads the two locally generated secrets through standard input without printing their values. It expects the worker to exist already.

In `wrangler.jsonc`, set the public numeric `BREVO_LIST_ID`, `LEMON_STORE_ID`, `LEMON_PRO_VARIANT_ID` and `LEMON_CART_VARIANT_ID`. Deploy again. Account secrets belong in Workers secrets, not JSON or frontend environment variables.

Keep the hourly cleanup schedule. Confirmation addresses are cleared after use; expired requests, sessions and rate windows are deleted. Stable keyed trial identifiers and purchase records remain so reinstalling does not restart access.

## 5. Host the website

Cloudflare Pages is the budget default. Use Node 24, repository root as the build root, and:

```text
npm ci --prefix extension && npm --prefix extension run compile-tests && node website/build.mjs
```

The output directory is `website/dist`; generated `_headers` contains the security policy. Start with a protected preview. **Do not deploy a build made with `--review-downloads`**: that flag is only for local owner artwork review. The portal asks the service which installers are published, so a clean Pages build does not need copies of the private archives.

Vercel remains an alternative using the included `vercel.json`. Check plan eligibility for commercial use; do not assume a personal free plan covers a paid store. Hosting, domain registration, signing certificates and provider usage are separate costs.

## 6. Run the complete purchase rehearsal

Use an address you own. Test mode still requires a valid Turnstile check and sends real transactional email through the configured sender.

1. Request Free with offers unchecked; confirm once, download the installer and compare its checksum. Reusing the link must fail. No marketing contact should be added.
2. Confirm a separate request with offers checked. Verify the contact is added only after confirmation; test unsubscribe through Brevo. Unsubscribing must not remove app access.
3. Start a trial in the portal. Re-requesting with the same address or Gmail alias must preserve the original deadline. Automated tests cover expiry; do not change the real service clock. Test access files are for the sandbox; verify release-app activation in step 6.
4. Enable `CHECKOUT_ENABLED` and the website's `salesEnabled` only for the controlled checkout test. Keep `TEST_MODE` true while using Lemon Squeezy's test payments. Test Pro, a 49¢ bundle, a 99¢ extra, a 1.99 extra, a declined payment, delayed/duplicate webhook and refund.
5. Confirm the receipt's email owns the purchase. If the buyer changes email at checkout, they must request a download link for that address. An unverified visitor or another email must not download the paid file.
6. **Sandbox access files do not unlock release apps.** After the sandbox flow passes, switch the Worker to live mode and rebuild public metadata. With the owner's email, activate a live trial in the current apps, then perform one small real purchase and refund. Verify the purchased access after an app restart and confirm the refund is reflected after online refresh.

Keep checkout off while correcting any mismatch. The service verifies paid status, store, mode, USD subtotal, variant and quantity before granting ownership. A redirect alone is never a payment receipt.

Permanent purchases work offline from their last signed activation. Refund changes reach the apps on an online refresh; previously downloaded image files cannot be remotely erased. Local beta migration is a convenience for existing profiles, not a tamper-resistant DRM boundary.

## API and operations

| Route | Purpose |
|---|---|
| `GET /v1/status` | Fail-closed readiness, test mode and published installer names/checksums |
| `POST /v1/email/start` | Managed human check, bounded request, rate limits, one-use email link |
| `POST /v1/email/verify` | Consume link; create one-hour download session; optional confirmed offers |
| `GET /v1/library` | Current ownership and signed app access |
| `POST /v1/trial/start` | Immutable first trial deadline |
| `POST /v1/claim` | Claim an available free item |
| `POST /v1/checkout` | Authoritative SKU prices and hosted one-time checkout |
| `POST /v1/webhooks/lemon` | Signature/payment verification and idempotent ownership/refunds |
| `GET /v1/download/:sku` | Authenticated stream from private storage |
| `POST /v1/access/refresh` | Verify signed identity and refresh current ownership |

Back up D1 and the private signing/hash material. The setup helper refuses to replace missing existing keys or the email hash secret: a new hash secret would disconnect trial and purchase identities. Restore the original vault when moving to another PC. Restrict account and bucket access, monitor delivery failures and provider limits, and test recovery before announcing launch. Avoid logging email bodies, authorization headers, access documents or webhook payloads.

Useful primary sources: [Cloudflare Workers](https://developers.cloudflare.com/workers/), [D1](https://developers.cloudflare.com/d1/), [R2](https://developers.cloudflare.com/r2/), [Turnstile](https://developers.cloudflare.com/turnstile/), [Brevo transactional email](https://developers.brevo.com/docs/send-a-transactional-email), [Lemon Squeezy checkout API](https://docs.lemonsqueezy.com/api/checkouts/create-checkout), [webhook signing](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks), [pricing](https://www.lemonsqueezy.com/pricing).
