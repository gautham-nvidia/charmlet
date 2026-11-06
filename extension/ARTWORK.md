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

## 2026-11-03 - Smiley and guardian follow-up

The owner requested four emotional smiley stress balls and other emoji designs, and accepted the complete Drishti Doll while requesting one more variation. The 0.6.1 collection adds Happy, Determined, Calm and Winking Smiley Balls, Heart Emoji, Thumbs-Up Emoji, Rocket Emoji and Drishti Guardian. All seven soft objects use the app's existing squeeze interaction; the clay guardian uses ordinary charm motion.

The owner supplied [The Accha Studio's Drishti reference, slide 7](https://www.instagram.com/p/C9e_MaFSVlW/?img_index=7). It was inspected through the public page: the photograph shows traditional red guardian masks with wide eyes, tall white horns, curled black moustaches, white teeth and bold painted forehead/ear details. Those general features informed the text prompt for an original full-body clay variation. The photograph itself is not bundled or used as a cutout. The accepted earlier full-body doll is preserved.

For 0.6.1, these eight additional Gemini 3 Pro Image designs brought the inventory to 184 authored subjects, 143 selected review entries and 142 included PNG designs, plus ten original SVGs. Earlier exports and generation receipts remain archived. The four smiley faces use original foam-toy compositions rather than platform emoji assets.

## 2026-11-05 - Personalisation and garden refresh

The 0.7.0 candidate contains 149 rendered PNG designs, the refined original Terminal keycap and Sunny: 151 selectable trial charms. The owner requested retiring the other nine early designs; their stored IDs migrate to the newer versions. Terminal retains its existing shape and prompt glyph with revised SVG shading, bevels and eyelet detail.

The owner approved painted colour figures over bronze and a forward gaze for open-eyed smileys. The approved Ganesha, Murugan and seated Shiva examples are reused; corresponding revisions extend the colour direction to the other figures. Nataraja remains a distinct dancing form. The artwork manifest records 191 authored charm subjects and their current exports.

Sunny's sphere, eyes, eyelids and mouth are code-authored WebGL and canvas shapes. Its static SVG is used for thumbnails and as a final fallback. It is an original character.

Four botanical garden stages replace the earlier flat SVGs. They were generated through the same Gemini 3 Pro Image route using `website/garden-art-jobs.json`, with raw masters and receipts retained locally. `website/garden-art.json` records source and PNG hashes. A blue matte protects natural green foliage during cutout; the bud revision removes residual blue spill from the same raw master. The owner approved the four current stages on 2026-11-05. The images are generated illustrations, not documentary photographs.

The owner then requested rose colours, jasmine and lily to grow from seeds. Six new photographic-style botanical renders add red, pink, white and yellow roses, Arabian jasmine and an oriental lily. Their prompts are in `website/art-review-jobs.mjs`; targeted background corrections for red rose and jasmine are in `website/art-review-revisions.json`. All eighteen earned flowers reuse the trial flower PNGs and their attachments. Original flower IDs, collected counts/dates and the active plant are preserved; new seeds prefer uncollected varieties. The new flower images remain available for visual review.

This is provenance for the trial. The final artwork lineup, source/art licence and bundled/free/paid split remain owner decisions.

## 2026-11-05 - Live companions and fidget tools

The 0.8.0 trial adds Nimbus (a lit cloud), Byte (a bevelled metal robot), Fidget Spinner, Bubble Pop and Worry Stone. These five original designs are authored as SVG and canvas/WebGL geometry; no image-generation service, stock character or external 3D model was used. The live family shares bounded local rendering and uses static SVG thumbnails/fallbacks. Spinner friction, reusable bubble surfaces and the thumb stone are local interactive code. The total is 156 selectable trial charms. This addition does not grant a source or artwork licence or select a paid lineup.
