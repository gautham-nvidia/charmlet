# Charmlet website

The homepage introduces Cali and the app; **`charms.html`** is the searchable **234-charm gallery**, with sixteen collections including all 34 Music Icons. Visitors can try live companions, fidgets and puzzle boards without leaving their gallery position. The app, installation and current included collection lead the site; no paid checkout or merchandise is advertised as available.

The site is static and uses the extension's locked build dependencies. It does not call an image-generation service. The [brand kit](../docs/charmlet-brand-kit.md) records the owner's video reference and visual direction. See [Vercel hosting](../docs/vercel-hosting.md) and [digital packs / future merchandise](../docs/monetization-and-payments.md) for account setup.

## Source and output

| Files | Responsibility |
|---|---|
| `index.html`, `home.js` | Homepage, companion switching, collection cards, garden and installation tabs |
| `charms.html`, `app.js` | Search, collection filters, URL state, preview dialog and optional legacy downloads |
| `site.css`, `site.js` | Shared styling, public product metadata and Reduced Motion-aware reveals |
| `assets/fonts/` | Self-hosted Manrope and its SIL Open Font License |
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
| `build.mjs` | Validates inputs, copies assets/VSIX and emits `dist/` |

Generated `dist/` is ignored by Git. Root `vercel.json` builds it from a clean checkout. `.vercelignore` excludes raw authoring output, credentials, local profiles, session notes, desktop archives and dependency directories.

## Build and preview

The first install/build can take several minutes; the commands print progress. Run from the repository root.

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
npm ci --prefix extension --include=dev
npm --prefix extension run compile-tests
npm --prefix extension run package:vsix
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
node website/check-review.mjs
node --test website/art-cutout.test.mjs website/studio/test/core.test.mjs website/studio/test/service.test.mjs
```

For a different running port, set `CHARMLET_GALLERY_URL` to that server's URL before the two browser checks.

`check.mjs` covers all collections, accent-insensitive search and URL restoration, gallery focus/scroll position, actual VSIX bytes, retained pack URLs, installation tabs, garden, drag/reset/close lifecycle, fifteen live companions, three puzzle boards, Reduced Motion and 320/390/768-pixel layouts. Store/download fixtures verify visibility without navigating to checkout or claiming those destinations are live.

`check-review.mjs` validates curation, all 253 PNG hashes/dimensions/transparency, 100% artwork sizing, families including Music Icons, original comparisons, browser downloads and mobile layout. Current 0.12.0 artist captures are distinct from historical 0.11.0 and earlier evidence.

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
