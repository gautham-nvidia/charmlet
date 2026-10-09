# Charmlet artwork

Ten original charms are bundled for offline use. The original Terminal/Chip/Wafer/Circuit records appear below; the dated expansion records six additional defaults and six optional gallery designs.

| Charm | Asset | Origin / authoring record |
|---|---|---|
| Terminal | `media/keycap.svg` | Existing source-authored project SVG from Phase 0 (`c02e440`, 2026-09-17). The original authoring tool/model was not recorded. |
| Chip | `media/chip.svg` | Original SVG markup created for this project on 2026-10-05 with Devin coding-assistant assistance; no external artwork input or image-generation service. |
| Wafer | `media/wafer.svg` | Original SVG markup created for this project on 2026-10-05 with Devin coding-assistant assistance; no external artwork input or image-generation service. |
| Circuit | `media/circuit.svg` | Original SVG markup created for this project on 2026-10-05 with Devin coding-assistant assistance; no external artwork input or image-generation service. |

These are generic illustrations, not engineering diagrams, product depictions or company-branded assets. No competitor artwork, logos or confidential reference material is included.

## Rendering contract

Every charm uses a 72x84 SVG canvas with the cord attachment at approximately (36, 10). The existing size and motion system therefore applies consistently across the collection. Keep artwork inside that canvas; review any future geometry change alongside the attachment offset and viewport bounds.

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
