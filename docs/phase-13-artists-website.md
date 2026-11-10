# Phase13: Music Icons and the refreshed website

The candidate contains **234 charms** in extension **0.12.0** and desktop **0.9.0**. The website now has a distinct homepage and searchable collection browser, with a prepared path to hosted digital sales and later merchandise.

## What changed

- All 34 owner-approved artist studies are included under **Music Icons**: the original ten, twelve legends and twelve current performers, including twelve women.
- Approved PNG bytes are preserved. The first reprocessing pass changed hashes and duplicated existing imports; profile4 reads the original approved packs and verifies their SHA256 values. Existing IDs, pins, cords and edited imports retain their meaning.
- The homepage leads with live Cali, a short app tour, six collection cards, garden, installation tabs and FAQs. The gallery has sixteen filters, accent-insensitive search, shareable query state and an on-demand preview.
- Live previews use the shared app renderer. Reduced Motion, dragging, puzzle boards, keyboard focus and offscreen idling remain covered.
- Old downloads and the disabled Studio route remain available at their original URLs. The homepage no longer promotes an unavailable Photo Studio.
- Public desktop/store/shop URLs appear only when configured. No checkout backend, paid product or physical merchandise launch was activated.

Brand direction: [website brand kit](charmlet-brand-kit.md). Operational guides: [Vercel](vercel-hosting.md) and [payments / merchandise](monetization-and-payments.md).

## Local evidence

| Check | Result |
|---|---|
| Extension type-check, lint and package build | Passed; 0.12.0 VSIX produced |
| Shared models and source editor scenarios | 96 models and 13 source scenarios passed |
| Installed VSIX | Seven scenarios passed, including decoded artist PNGs, prior settings/imports, live controls, puzzles and Restricted Mode |
| Desktop | Thirteen models and expanded dev-app smoke passed |
| Windows distribution | 0.9.0 ZIP extracted and launched successfully in an isolated profile |
| Website | 234 charms, sixteen groups, 34 artists, all live previews/puzzles, exact VSIX bytes, legacy pack URLs and desktop/mobile layouts verified |
| Artwork review | 253 PNGs, 210 featured designs, 51 app comparisons, 82 original comparisons and 23 bundles verified |
| Artwork/Studio boundaries | 23 cutout, data-pack, disabled-service and mocked licence/order checks passed |

The enhanced navigation scenario captures Travis Scott, Whitney Houston, Beyoncé and Prince inside the installed extension at 100% size. Original capture pixels are retained under `website/assets/app-review/trial-artist-*-0120.png`. Earlier captures keep their version labels.

## Hosted acceptance

[Draft PR #30 checks](https://github.com/gautham-nvidia/charmlet/pull/30/checks) are the authoritative current hosted status. The required matrix is:

- Windows, Linux and macOS, each on VS Code 1.90.0 and 1.140.0.
- Windows and macOS desktop archives.
- The isolated Windows runner additionally checks real movement, saved position, click-through and long-pull bounce without taking focus.

Use the run for this implementation's commit, rather than the earlier 200-charm result. Exact run IDs/results and package hashes are retained in the local session readiness note after the matrix completes.

## Candidate files

| Artifact | SHA256 |
|---|---|
| `extension/charmlet-0.12.0.vsix` | `8e8ee51e4d725486f206df297876e135b7b1bdbbc480ca2b659a7f49b4a96a9c` |
| `desktop/distribution/Charmlet-desktop-0.9.0-win32-x64.zip` | `d0fcf6d8f4de433119c5f9bb2e5a20206c25be66695ed03e6d4498000d939506` |

The Windows ZIP is 175,906,869 bytes and remains unsigned. Only install from the complete extracted archive. The website's VSIX is compared byte-for-byte with the local candidate.

## Remaining release decisions

The user has approved the designs for the trial. Public/commercial artwork rights, source/artwork licences, publisher identity, signing/notarization, native macOS interaction and mixed-display checks remain distinct release matters. PR #30 stays draft until review.

Vercel was still logged out on the Windows PC on 2026-11-10. The account guide uses `greensilver-personal`; no anonymous or production deployment was substituted. A merchant account, business country/currency, first cleared premium packs, prices, tax/refund/support settings and a tested purchase-delivery flow are needed before charging. Physical merchandise is a later store category.
