# Charmlet companion gallery

This directory contains the dependency-free static gallery for Charmlet. It presents the ten bundled charms, six free downloadable extras, installation guidance, and a real development VSIX download. Public hosting is not configured.

## Inputs and generated output

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | Static website source |
| `extras.json`, `assets/` | Frozen extra metadata and source-authored SVGs |
| `packs/` | Validated generated `.charmlet.json` downloads |
| `export-packs.mjs` | One-time trusted SVG-to-PNG pack exporter |
| `build.mjs` | Validates packs and creates `dist/` |
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

The check uses installed Edge to cover desktop/mobile overflow, images, filters, search/reset, keyboard focus, real pack parsing, real VSIX bytes, and console/page errors. It writes ignored evidence under `extension/test-results/website-check/`.

This is a local development preview. No domain, public deployment, account, checkout, payment provider, Marketplace listing or Open VSX publication is configured here.
