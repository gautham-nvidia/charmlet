# Charmlet artwork

The 0.6.0 trial bundles ten original SVG charms and 134 rendered PNG designs for offline use. Original-source records appear below; the final dated entry documents the generated trial collection. Inclusion in the trial does not approve the public-release lineup or grant a reuse licence.

| Charm | Asset | Origin / authoring record |
|---|---|---|
| Terminal | `media/keycap.svg` | Existing source-authored project SVG from Phase 0 (`c02e440`, 2026-09-17). The original authoring tool/model was not recorded. |
| Chip | `media/chip.svg` | Original SVG markup created for this project on 2026-10-05 with Devin coding-assistant assistance; no external artwork input or image-generation service. |
| Wafer | `media/wafer.svg` | Original SVG markup created for this project on 2026-10-05 with Devin coding-assistant assistance; no external artwork input or image-generation service. |
| Circuit | `media/circuit.svg` | Original SVG markup created for this project on 2026-10-05 with Devin coding-assistant assistance; no external artwork input or image-generation service. |

These are generic illustrations, not engineering diagrams, product depictions or company-branded assets. No competitor artwork, logos or confidential reference material is included.

## Rendering contract

The original SVGs use a 72x84 canvas with their legacy attachment geometry. Rendered trial images are transparent 216x252 PNGs displayed in the same logical 72x84 space. Their cord contact is derived from the decoded alpha silhouette and checked by `website/sync-trial-catalogue.mjs --check`. Size, squeeze and release motion share that geometry.

The four images were loaded in real Windows VS Code 1.90.0 and 1.138.0 views and reviewed at the default editor size. Captured previews and the collection UI are recorded in the repository's `docs/phase-2/` directory.

## License status

The project's source/art license is still pending. This provenance record does not grant a separate reuse license or imply company endorsement. Third-party code and icon notices remain in `THIRD_PARTY_NOTICES.md`; no new third-party artwork or dependency was introduced for this collection.

## 2026-10-06 - Expanded bundled collection and gallery extras

Six bundled SVGs were added under `media/`: Transistor, Memory Stack, Evil Eye, Drishti Doll, Hamsa, and Lemon & Chilies. Six extra SVGs were added under `website/assets/`: Probe Card, Logic Gate, FinFET, Photon Link, Lotus, and Sunrise. All twelve are original source markup created for this project with coding-assistant assistance; no external artwork, logo, photograph, confidential reference material, or image-generation service was copied into the files.

The gallery pack exporter uses existing Microsoft Edge canvas rendering to create one 288×336 PNG from each trusted extra SVG. Those PNGs are data-only pack payloads validated by the same parser used by the extension; they are not executable SVG or script content.

The grouped good-luck motifs are stylized cultural illustrations. They are not claimed to have supernatural function and are not engineering diagrams. Drishti Doll's broad features—wide eyes, curled moustache, and fangs—were informed by public descriptions, including [Documenting TN's own way of dealing with drishti](https://www.newindianexpress.com/cities/chennai/2026/Jan/31/documenting-tns-own-way-of-dealing-with-drishti); no photograph or published artwork was copied.

The 80 coding messages are original and unattributed. The earlier Terminal authoring-tool history remains unknown as recorded above. The source/art license is still pending; provenance does not itself grant reuse rights.

## 2026-10-06 - Marketplace icon

`media/marketplace-icon.svg` is an original project composition: the existing Terminal charm source geometry is placed over a new rounded background, circle and cord treatment. No external icon or branded artwork was used. `website/export-icon.mjs` renders that trusted SVG through installed Microsoft Edge canvas and verifies the generated `media/marketplace-icon.png` as 256×256 with the existing PNG decoder. The PNG is prepared for listing review; its presence does not imply a published or approved store listing.

## 2026-10-08 - Grown by you garden artwork

Four generic unrevealed growth-stage SVGs—Seed, Sprout, Leaves and Bud—and twelve original flower reward SVGs were authored for the free local garden with coding-assistant help. The flowers are Sunflower, Marigold, Hibiscus, Bluebell, Iris, Poppy, Orchid, Daisy, Lavender, Cosmos, Sakura and Wild Rose.

All sixteen files use original project SVG markup on a 72×84 canvas. Reward flowers reuse the established unbranded metal hook/connector geometry and add distinct petals, centres, stems and mint leaves. The growth stages deliberately avoid revealing the selected flower before bloom. No photograph, remote image, competitor asset, company logo, official badge, confidential test material or image-generation service was used.

Garden reward files are trusted bundled resources named `media/garden-<species>.svg`; they become picker entries only after the local eleven-watering state confirms the corresponding reward. The four growth-stage files are drawer illustrations and are not downloadable or selectable charms.

## 2026-11-03 - Complete collection trial

The owner authorized all curated artwork to be included for trial, deferring the final bundled, free-download and paid-download split. `src/trial-charms.json` lists 134 namespaced designs; `media/trial-*.png` contains their static images. The original Terminal and nine other original SVGs remain available. The twelve trial flower illustrations are separate from earned garden records.

These are original prompt-generated review candidates made with **Gemini 3 Pro Image** (`gcp/google/gemini-3-pro-image`), including earlier review images and 71 newly requested additions. Authoring subjects and corrections are in `website/art-review-jobs.mjs`, `website/art-refresh-jobs.json`, `website/art-expansion-jobs.json` and `website/art-review-revisions.json`. `website/art-review.json` records model, revision, prompt hash, source hash and exported PNG hash. Local raw masters and generation receipts remain under `output/imagegen/phase-4-redraw/`; credentials are not part of the artwork record.

The latest Drishti revision is a complete painted-clay doll. The expanded collection includes generic lab equipment, astronomical illustrations, gemstones, zodiac, seasonal designs and respectful devotional figures/symbols. These images are artistic interpretations, not technical diagrams, astronomical photographs or claims of supernatural effects. No proprietary device reference or named athlete/league artwork was used for this expansion.

All 176 authored candidates remain in the review archive; 135 are selected for review, comprising the original Terminal and 134 PNG designs. Retired technical concepts and earlier image revisions are preserved as history. Optional packs keep their immutable URLs. Public release still requires the owner's artwork choices and a source/art licensing decision.
