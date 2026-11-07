# Charmlet companion gallery

This directory contains the Charmlet collection playground using the locked extension build dependencies. The current trial has **178 included charms**, with Live Companions and Stress Busters first in its collection filters. Cali has seven daily outfits and jointed gestures, joined by eleven California companions. The Art review retains 160 selected static designs and historical comparisons, with new live-renderer and app views shown separately. The playground uses the same live renderer and bundled textures as both apps. Previously shared pack downloads remain intact.

Root `vercel.json` builds the current VSIX and gallery from a clean checkout, publishes only `website/dist`, and serves the disabled Photo Studio configuration without a backend. No secret is needed. See [Vercel hosting](../docs/vercel-hosting.md) for the owner's team and account steps, and [monetization](../docs/monetization-and-payments.md) for the proposed commerce setup.

## Inputs and generated output

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | Static website source |
| `extras.json`, `assets/` | Frozen classic metadata and source-authored SVGs |
| `collections.json` | Twenty categories, preserved legacy mapping, four early studies and the sports wishlist |
| `live-art-assets.json` | Hashes and provenance for the 32 bundled live-character textures and thumbnails |
| `assets/previews/` | Earlier photographic/playful style studies |
| `review.html`, `review.js`, `review.css`, `art-review.json` | Searchable full redraw review, original comparison, dark backdrop and review downloads |
| `assets/review/`, `packs/review/` | Transparent PNG/WebP candidates and separately namespaced review packs |
| `art-review-jobs.mjs`, `art-review-revisions.json`, `art-refresh-jobs.json` | Historical briefs, realistic replacements and bounded new concepts |
| `art-curation.json`, `art-curation.mjs` | Owner keep/redraw/retire decisions, displayed names and collection groups |
| `generate-art-review.mjs` | Explicit, resumable authoring requests only; never called by the app or normal build |
| `art-cutout.mjs`, `prepare-art-review.mjs`, `bundle-art-review.mjs` | Checked cutouts, bounded parser validation and review-only collections |
| `check-review.mjs` | Image integrity, curation, earned-flower boundaries, actual-size previews and download checks |
| `studio/` | Disabled-by-default Photo Studio foundation and fake-provider verification |
| `ARTWORK.md` | Website-specific artwork provenance and frozen/export boundaries |
| `packs/` | Validated generated `.charmlet.json` downloads |
| `export-packs.mjs` | One-time trusted SVG-to-PNG pack exporter |
| `export-icon.mjs` | Exports the trusted 256×256 Marketplace PNG |
| `distribution.json`, `distribution.mjs` | Null-or-identity-matching official store link configuration |
| `build.mjs` | Validates packs and store configuration, then creates `dist/` |
| `server.mjs` | Serves only generated `dist/` on localhost |
| `check.mjs` | Focused Edge gallery/download/accessibility check |
| `dist/` | Generated and ignored preview output |

Install the locked extension dependencies first using the setup in the root README. The current `extension/charmlet-<version>.vsix` must exist before running the website build. Ordinary builds reuse the frozen pack files and do not rerender artwork.

## Export frozen packs

Run this only when the trusted extra SVG sources or metadata intentionally change. It uses the existing Playwright dependency and installed Microsoft Edge, then validates every output through the extension parser.

**On the Windows PC (PowerShell), from the repository root:**

```powershell
npm.cmd --prefix extension run compile-tests
node website/export-packs.mjs gpu-tile cpu-tile hbm-tower cache-stack chiplet-bridge vector-lane tensor-array neural-tile silicon-lattice bump-grid interposer memory-bus alu-key register-file clock-tree probe-needle wafer-map sweep-curve signal-eye test-socket scope-pulse loopback-link boundary-scan self-test-loop calibration-dial golden-die debug-duck token-train attention-lens embedding-stars gradient-trail inference-engine vector-index language-tile merge-branch passing-build stack-frame regex-knot async-loop recursion-shell foggy-bay bridge-lights city-tram campus-path coffee-street mountain-sun granite-dome redwood-grove desert-arch canyon-river alpine-lake pine-ridge coastal-trail night-sky
```

The exporter refuses missing, duplicate or unknown IDs. The listed Phase 4C command names only the 54 new designs; the accepted original six SVGs and packs stay frozen. `generate-phase-4c-art.mjs` is the checked-in one-time trusted source generator for those 54 original SVGs and is not part of the ordinary build.

Do not weaken parser limits to accept an export. If the generated PNG profile changes, review that profile before changing validation.

## Export the Marketplace icon

The icon exporter reads the trusted source SVG, renders it through installed Edge, and verifies a 256×256 PNG using the existing `pngjs` decoder.

**On the Windows PC (PowerShell), from the repository root:**

```powershell
node website/export-icon.mjs
```

## Configure future store links

`distribution.json` keeps `marketplace` and `openVsx` null until publication. The validator accepts only HTTPS URLs whose publisher/name identity matches the extension manifest. Syntax validation is not proof that a listing exists: the owner must verify namespace ownership, publishing approval, version, and the live listing before changing either value.

## Build the gallery

First create the development VSIX, then generate the static site.

**On the Windows PC (PowerShell), from the repository root:**

```powershell
npm.cmd --prefix extension run compile-tests
npm.cmd --prefix extension run package:vsix
node website/build.mjs
```

The build validates the historical 60 packs and ten bundled originals, then exports the curated review items and their current category counts. It checks that each advertised download matches its image and curation decision, and retains archived download URLs. The demo uses the imported image's attachment point and supports soft squeezing. Ordinary builds never call an image-generation service.

After an intentional art or curation change, run the bundler before building. It gives changed payloads new pack identities and preserves earlier files.

**On the Windows PC (PowerShell), from the repository root:**

```powershell
node website/bundle-art-review.mjs
node website/build.mjs
```

## Preview locally

**On the Windows PC (PowerShell), from the repository root:**

```powershell
node website/server.mjs
```

Leave that terminal running and visit `http://127.0.0.1:4173/`. The server refuses paths outside `website/dist`, sets explicit content types, disables caching, and marks pack/VSIX responses as downloads.

## Run the focused website check

With the preview server running, open a separate PowerShell terminal.

**On the Windows PC (PowerShell), from the repository root:**

```powershell
node website/check.mjs
node website/check-review.mjs
node --test website/art-cutout.test.mjs website/studio/test/core.test.mjs website/studio/test/service.test.mjs
node website/studio/check.mjs
```

The check uses installed Edge to cover desktop/mobile overflow, image loading, category filters, the named-sports wishlist, dialogs, garden-stage navigation, retired-design search exclusion, archived/current downloads, real VSIX bytes and the swing/pull/reset lifecycle. Store-link fixtures verify rendering without navigating or claiming publication. Evidence is written under `extension/test-results/website-check-<extension-version>/`.

This is a local development preview. No domain, public deployment, account, checkout, payment provider, Marketplace listing or Open VSX publication is configured here.

## Planned Phase 4 direction

The owner-authorized [Phase 4 companion plan](../docs/phase-4-plan.md) develops focus/learning/garden features, original free collections, Photo Studio preparation and a parallel desktop beta. The [original collection brief](../docs/phase-4-original-collections.md) is the reviewed direction implemented by the current sixty-design gallery.

The current source builds the **0.5.2 review candidate**, adding a strictly motivational deck, soft squeezing and optional festive defaults. Curation keeps the original Terminal, removes unclear abstract concepts from the featured lineup and adds recognizable components, heritage, cricket, Stress Busters and seasonal review art. Flowers remain earned. Final bundled, website and paid-art placement requires owner approval.

Photo Studio stays unavailable unless explicitly configured with validated merchant identity and secrets. Its tests use fake licence/order responses and isolated local HTTP sessions, not purchases or real vendor access. Selected photo bytes stay in browser memory; dimensions are checked before decoding, late loads are discarded after locking, expired access preserves crop/name/frame only in memory, and a manual lock clears the photo. Live merchant validation, purchase/refund operations and deployment remain separate gates.

Art preparation from already-generated raw files is local: run `node website/prepare-art-review.mjs`, then `node website/bundle-art-review.mjs`, then rebuild. Raw authoring outputs/receipts live in the ignored `output/imagegen/phase-4-redraw/` directory. Explicit `generate` calls require the approved model/HTTPS endpoint and local key; they preserve previous revisions, have no automatic retries and must not be triggered merely to build or test the gallery.
