# Charmlet companion gallery

This directory contains the dependency-free static gallery for Charmlet. It presents the ten bundled charms, six free downloadable extras, installation guidance, and a real development VSIX download. Public hosting is not configured.

## Inputs and generated output

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | Static website source |
| `extras.json`, `assets/` | Frozen extra metadata and source-authored SVGs |
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
node website/export-packs.mjs
```

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

The build validates all six packs, verifies ten included and six extra unique IDs, copies trusted artwork and the real VSIX, and writes relative catalogue URLs under `website/dist/`.

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
```

The check uses installed Edge to cover desktop/mobile overflow, images, filters, search/reset, keyboard focus, installation copy, real pack parsing, real VSIX bytes, and console/page errors. It validates null store configuration and injects matching synthetic URLs only to verify rendering without navigating or claiming publication. It writes ignored evidence under `extension/test-results/website-check-0.3.2/`.

This is a local development preview. No domain, public deployment, account, checkout, payment provider, Marketplace listing or Open VSX publication is configured here.

## Planned Phase 4 direction

The owner-authorized [Phase 4 companion plan](../docs/phase-4-plan.md) develops focus/learning/garden features, original free collections, Photo Studio preparation and a parallel desktop beta. The [original collection brief](../docs/phase-4-original-collections.md) is a planning target, not the current gallery inventory.

The current static preview remains the tested **0.3.2** gallery: ten included previews, six free extras, manual installation help and the existing importer flow. Focus timers, learning cards, garden rewards, Photo Studio, expanded collections and desktop beta must not be advertised here as live until their implementation and evidence land.
