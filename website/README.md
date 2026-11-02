# Charmlet companion gallery

This directory contains the Charmlet collection playground using the locked extension build dependencies. The original ten bundled charms and 60 classic downloads remain available. A separate **Art review** page presents 95 transparent illustrated Gemini candidates, 83 individually importable designs and 14 collection packs, including Animals, Local Culture, Space and Sports. The twelve-world playground, earlier style studies, Garden guide and real development VSIX remain separate from final artwork/pricing approval. Public hosting and live paid access are not configured.

## Inputs and generated output

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | Static website source |
| `extras.json`, `assets/` | Frozen classic metadata and source-authored SVGs |
| `collections.json` | Twelve-world taxonomy, four preview records and the sports wishlist |
| `assets/previews/` | Earlier photographic/playful style studies |
| `review.html`, `review.js`, `review.css`, `art-review.json` | Searchable full redraw review, original comparison, dark backdrop and review downloads |
| `assets/review/`, `packs/review/` | Transparent PNG/WebP candidates and separately namespaced review packs |
| `art-review-jobs.mjs`, `art-review-revisions.json` | Complete 95-design briefs and preserved targeted revisions |
| `generate-art-review.mjs` | Explicit, resumable authoring requests only; never called by the app or normal build |
| `art-cutout.mjs`, `prepare-art-review.mjs`, `bundle-art-review.mjs` | Checked cutouts, bounded parser validation and review-only collections |
| `check-review.mjs` | 95-image/83-design/14-bundle validation and browser/download checks |
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

The build validates all 60 packs, verifies ten included and 60 extra IDs, retains the original 18/12/14/16 source grouping checks, and validates exactly one browsing world per classic extra. It copies the four labelled concept previews, garden-stage illustrations and real VSIX, bundles the shared-physics demo, and writes relative catalogue URLs under `website/dist/`. Ordinary builds reuse frozen images/packs and never call an image-generation service.

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

The check uses installed Edge to cover desktop/mobile overflow, all sourced images through test-only eager decode, twelve collection filters, the labelled sports wishlist, preview-dialog keyboard behavior, garden-stage navigation, search/reset, old/new pack parsing, real VSIX bytes, the shared-physics swing/pull/reset lifecycle, and console/page errors. It validates null store configuration and injects matching synthetic URLs only to verify rendering without navigating or claiming publication. It writes ignored evidence under `extension/test-results/website-check-<extension-version>/`.

This is a local development preview. No domain, public deployment, account, checkout, payment provider, Marketplace listing or Open VSX publication is configured here.

## Planned Phase 4 direction

The owner-authorized [Phase 4 companion plan](../docs/phase-4-plan.md) develops focus/learning/garden features, original free collections, Photo Studio preparation and a parallel desktop beta. The [original collection brief](../docs/phase-4-original-collections.md) is the reviewed direction implemented by the current sixty-design gallery.

The current preview distributes the **0.4.3 development candidate** with Charms/Focus/Garden/Settings navigation, motivation by default and quiet recurring reminder notices. The artwork review has 95 candidates: 10 starter redraws, 60 website redraws, 12 flower studies and 13 new-world designs. It offers 83 individual review downloads and 14 grouped packs; the flowers remain earned, not downloadable unlocks. Importing a review pack preserves existing originals and saved progress. Final inclusion and paid-art choices require owner approval.

Photo Studio stays unavailable unless explicitly configured with validated merchant identity and secrets. Its tests use fake licence/order responses and isolated local HTTP sessions, not purchases or real vendor access. Selected photo bytes stay in browser memory; dimensions are checked before decoding, late loads are discarded after locking, expired access preserves crop/name/frame only in memory, and a manual lock clears the photo. Live merchant validation, purchase/refund operations and deployment remain separate gates.

Art preparation from already-generated raw files is local: run `node website/prepare-art-review.mjs`, then `node website/bundle-art-review.mjs`, then rebuild. Raw authoring outputs/receipts live in the ignored `output/imagegen/phase-4-redraw/` directory. Explicit `generate` calls require the approved model/HTTPS endpoint and local key; they preserve previous revisions, have no automatic retries and must not be triggered merely to build or test the gallery.
