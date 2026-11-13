# Phase 15 security and launch

Charmlet now separates a useful free starter from signed trial/purchase access, and puts website downloads behind email verification. Live mail and payments remain disabled until the owner's accounts, keys and release files are configured.

## What protects the launch

| Area | Implemented control | Verification |
|---|---|---|
| Trial reuse | Durable first-trial deadline per keyed email identity; Gmail aliases canonicalized; trial records survive cleanup and process restart | Concurrent, repeated, aliased and post-restart requests retain the original deadline |
| Email and consent | Managed human check, bounded input, rate limits, one-use 15-minute link, one-hour download session; offers are separate and unchecked | Expired/replayed links fail; no marketing subscription before confirmation |
| Price and payment | Server-controlled SKUs/prices; signed webhook; paid status, mode, store, variant, currency, subtotal and quantity checked; idempotent order/refund handling | Altered prices, wrong modes/stores/variants, duplicate events and refund-before-paid cases fail safely |
| Private delivery | Authenticated ownership checks and private R2 objects; raw installers and pack files excluded from public builds | Another buyer, an expired session or an unknown SKU cannot fetch a paid object |
| Native access | Ed25519 signed grants checked in the host; encrypted local access store; fixed free IDs; purchases, photos, imports and garden progress survive trial expiry | Forged grants, wrong keys/audiences and observed clock rollback are rejected; fresh and beta profiles have distinct UI coverage |
| Sandbox isolation | Separate trial/session/order namespaces and a distinct signed audience for test grants | Switching service mode does not turn sandbox orders or access files into live ownership |
| Desktop and web | Electron sandbox/context isolation, no renderer Node integration, restricted IPC; website CSP, frame denial, MIME protection and no-referrer policy | Packaged desktop security preferences and public website boundaries checked |
| Supply chain | Locked dependencies, patched Electron/tooling, dependency audits in CI, pinned Actions and weekly Dependabot checks | Audits cover extension, desktop and service; all three reported zero known findings in the November 13 local audit |

The API publishes only installer filenames/checksums and availability. The static host never needs private archives in its build checkout. Opening an email link in an already-open download tab is supported; its fragment is removed before verification. A checkout redirect triggers status polling, never ownership by itself.

## Scope of the evidence

Local checks include 100 app model tests, 14 real-editor scenarios, desktop model and extracted-archive checks, service security tests, release checks and browser coverage of the 234-design gallery. Connected portal tests use isolated provider responses and synthetic addresses; they do not demonstrate real email delivery or a real charge.

The homepage's automated accessibility scan reported zero violations and 46 passed rules. Its contrast rule also reported incomplete checks for overlapping layers; those require visual/contrast review rather than treating the scan as full accessibility certification. The release handoff records the final browser and hosted-platform results.

Native Windows pointer/click-through checks are restricted to the isolated Windows CI desktop. Local checks do not bypass that guard. Mixed-display and manual macOS behavior remain separate checks.

Permanent native purchases work offline from their last signed grant. Refund changes reach an app on online refresh; downloaded images cannot be remotely erased. The beta migration marker and distributed client code are not tamper-proof DRM. One trial per verified email does not prove one trial per person.

## References and how they were used

| Source | Applied lesson |
|---|---|
| [OWASP ASVS](https://github.com/OWASP/ASVS) and [Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Validate at the server, separate identity from authorization, bound input, protect capabilities and audit dependencies |
| [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security) | Keep Electron patched; isolate renderers, restrict navigation and IPC, and retain sandboxing |
| [Zipsell](https://github.com/yongfook/zipsell) | Private object storage and controlled download delivery; an architectural reference, not a dependency added to Charmlet |
| [Medusa digital downloads plugin](https://github.com/makepay-apps/medusa-plugin-digital-downloads) | Fulfill only confirmed payment, preserve durable ownership and handle duplicate events/refunds; not an endorsement or an imported commerce engine |

The supplied Medium page returned 403, Reddit showed a network-security block, and Google showed a verification challenge. Available indexed excerpts and directly accessible primary documentation were used; those three pages were not fully inspected.

## Owner setup

Use the [service setup guide](../service/README.md). It covers Cloudflare Pages/Workers/D1/R2 and Turnstile, Brevo sender/consent setup, Lemon Squeezy one-time products/webhooks, private key creation and the complete purchase rehearsal.

Before enabling sales, configure the real sender and approved merchant account, rebuild the apps with the public activation key, stage and upload the tested archives, then verify email → payment → delivery → import → refund. Review the release licensing, celebrity/athlete artwork rights, purchase terms and desktop signing decisions before public distribution. The twelve new sports designs are optional private review studies, not a commercially cleared pack.

The launch serves digital products. Physical merchandise and Shopify are deferred until stock, shipping and returns are ready. When moving from $7.49 launch to $17.49 regular Pro, update the fixed provider price, public price configuration and displayed copy together, then repeat checkout validation.
