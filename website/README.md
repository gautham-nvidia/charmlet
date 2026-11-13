# Charmlet website

The homepage shows where Charmlet hangs on Desktop and in VS Code, then demonstrates focus, encouragement, cheers and breaks. **`charms.html`** is the searchable **234-charm gallery**, with sixteen collections including 34 Music Icons. The free starter has 31 fixed picks; the shop shows additional free claims, small extras and the planned $7.49 launch / $17.49 regular Pro purchase. Email delivery and sales are off in the checked-in configuration.

The site is static and uses the extension's locked build dependencies. It does not call an image-generation service. The [brand kit](../docs/charmlet-brand-kit.md) records the visual direction. The [current hosting and payment guide](../service/README.md) covers Cloudflare, Brevo, Lemon Squeezy and protected file delivery. Earlier Vercel and merchant comparisons remain background; merchandise is deferred.

## Source and output

| Files | Responsibility |
|---|---|
| `index.html`, `next.js`, `next.css` | Approved Terminal identity, workspace placement, interactive moments, local locket prototype and email dialog |
| `design-theme.js`, `gallery-theme.css` | Saved Auto / Light / Dark themes |
| `about.html`, `about-us.html`, `press.html`, `information.*` | Product, California origin and press information |
| `shop.*`, `download.*`, `access-client.js`, `store.css` | Basket, verified email, private downloads and signed app access |
| `commerce.json`, generated `commerce-public.json` | Public service settings and server-derived prices; no private credentials |
| `charms.html`, `app.js` | Search, collection filters, URL state, preview dialog and optional legacy downloads |
| `site.css`, `site.js` | Shared styling, public product metadata and Reduced Motion-aware reveals |
| `assets/fonts/` | Self-hosted Manrope and Bricolage Grotesque, with their font licences |
| `demo.ts` | Shared app physics, live renderer and puzzle preview; bounded page-specific size/camera |
| `trial-collections.mjs` | Sixteen current themed collections, ordered with the shared app helper |
| `launch.json`, `launch.mjs` | Validated public desktop/shop links; null means hidden |
| `distribution.json`, `distribution.mjs` | Validated Marketplace/Open VSX links; null means unpublished |
| `review.html`, `review.js`, `review.css` | Owner artwork review and version-labelled actual-app captures |
| `art-review.json`, `art-curation.*` | 253 current/archived records and 210 featured designs |
| `artist-artwork.json` | Bounded artist inventory, prompts and approved original pack/PNG hashes |
| `art-review-jobs.mjs`, `art-review-revisions.json`, `art-refresh-jobs.json`, `art-collection-refresh.json` | Source briefs, revisions and additional collections |
| `assets/review/`, `packs/review/` | Prepared PNG/WebP images and versioned data-only packs |
| `live-art-assets.json` | Hashes/provenance for 36 live textures and thumbnails |
| `extras.json`, `collections.json`, `assets/previews/` | Preserved historical metadata, art studies and legacy downloads |
| `styles.css`, `concepts.*`, `studio/` | Legacy review/concept styling and the disabled Studio route |
| `build.mjs`, `security-headers.mjs` | Validates inputs and emits public previews, security headers and `dist/`; excludes raw installers/packs |

Generated `dist/` is ignored by Git. Root `vercel.json` builds it from a clean checkout. `.vercelignore` excludes raw authoring output, credentials, local profiles, session notes, desktop archives and dependency directories.

## Build and preview

The first install/build can take several minutes; the commands print progress. Run from the repository root.

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
npm ci --prefix extension --include=dev
npm --prefix extension run compile-tests
node website/build.mjs
node website/server.mjs
```

Leave the server running and visit `http://127.0.0.1:4173/`. If a preview is already running, use it instead of starting a second copy on the same port. The local server restricts paths to `dist/`, disables caching, serves explicit content types and marks VSIX/pack responses as downloads.

## Verification

With the server running, open a separate terminal. The browser checks use installed Edge and write screenshots/results under the extension's versioned `test-results/` directories.

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
node website/sync-trial-catalogue.mjs --check
node website/check.mjs
node --test website/art-cutout.test.mjs website/studio/test/core.test.mjs website/studio/test/service.test.mjs
```

For a different running port, set `CHARMLET_GALLERY_URL` to that server's URL before the browser check.

`check.mjs` covers all collections, accent-insensitive search and URL restoration, gallery focus/scroll position, placement, visible confetti, garden, locket controls, drag/reset/close lifecycle, fifteen live companions, three puzzle boards, Reduced Motion and 320/390/768-pixel layouts. It verifies that public builds exclude raw installers and packs. Isolated provider fixtures exercise email, activation, free claims, authenticated download, session restoration and checkout confirmation without sending mail or making a payment.

For local owner artwork review only, build with `node website/build.mjs --review-downloads` and run `node website/check-review.mjs`. That mode includes the review downloads and is **not a production deployment**. Rebuild without the flag before public-site checks or hosting. Version-labelled installed-app captures remain historical evidence; they are not silently relabelled as newer builds.

## Updating artwork

Current approved artist PNGs must keep their exact bytes: imported selections depend on those hashes. Profile4 obtains them from the original three approved review packs. Re-rasterizing an identical-looking source can change its hash and create duplicate bundled/imported tiles.

For an intentional, approved artwork change, use the existing preparation/curation workflow, then bundle and verify:

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
node website/bundle-art-review.mjs
node website/sync-trial-catalogue.mjs
node website/build.mjs
```

Changed payloads get new immutable pack identities; retain previously shared downloads. Keep the three original Music Icons packs intact. Raw generation sources and receipts stay in ignored authoring storage. Generation is an explicit authoring action, never a build/test side effect.

## Launch destinations

`launch.json` accepts only public desktop/archive URLs and an optional shop provider/URL. Desktop links must be this repository's GitHub Release archives; Windows is ZIP and macOS is tar.gz. Paid deliverables and keys do not belong in public metadata or assets.

Shop and desktop links start hidden. The local Windows archive does not establish a public download URL. Marketplace/Open VSX links are independently validated by `distribution.json`. Future paid digital collections use hosted checkout/private delivery; merchandise can join that store later.

The old `/studio/` URL remains unavailable. The public static `/api/studio/config` exposes disabled status only, and the refreshed navigation does not promote Studio. Local photo charms inside the apps remain free. Legacy Studio tests use fake licence/order responses and isolated local sessions.

## Optional Phase 14 design review

**On the Windows PC (PowerShell), from the repository root:**

```powershell
node website/build.mjs --design-preview
node website/server.mjs --design-preview
```

The optional build adds `next.html`, the refined logo studies, email signup preview, privacy draft and post-email installation page. The server flag maps `/` to `next.html`; `/index.html` still serves the existing homepage. Set `PORT` if the default 4173 is occupied. A normal build excludes the unapproved design pages.

`audience.json` contains only a provider, a public Brevo form URL and public contact email. Both destinations start null. Until configured, the signup dialog explicitly shows a disabled design preview and sends nothing. No API keys or subscriber records belong in this repository. The form service handles confirmation and email delivery; the free beta URL is public, not protected by this UI.

See [the Phase 14 website and audience guide](../docs/phase-14-website-and-audience.md) for sender setup, optional offers, email templates and checks before enabling collection.
