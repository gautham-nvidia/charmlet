# Charmlet website artwork

## 2026-10-08 - Sixty-design free website catalogue

Fifty-four additional original website charm SVGs were authored for Phase 4C across Compute & Silicon, Test Bench, AI & Code, and Places & Nature. Together with the preserved Probe Card, Logic Gate, FinFET, Photon Link, Lotus and Sunrise files, the website offers sixty free downloadable designs.

`generate-phase-4c-art.mjs` is a checked-in one-time trusted source generator for only the 54 new 72×84 SVGs. Each design follows its reviewed individual motif—generic compute/test/code or original landscape geometry—with the existing project hook, readable outline and soft shading. No company/product logo, actual floorplan, proprietary waveform, photograph, copied competitor artwork or remote asset is included.

The six earlier SVG and pack hashes were compared with their frozen Phase 4C manifest after export and remained unchanged. `export-packs.mjs` requires explicit unique known IDs; the initial invocation selected only the 54 new files. Installed Edge rendered their bounded static PNG payloads, and the existing parser validated every generated pack. Ordinary gallery builds reuse all sixty frozen packs and do not render artwork.

The website swing preview uses the existing Terminal and catalogue artwork with the extension's shared Pendulum/getLayout implementation. It adds no separate branded or external art.

The project's source/art distribution license remains an owner decision. This provenance record does not grant a separate reuse license or imply NVIDIA sponsorship or endorsement.

## 2026-10-08 - Photographic and playful art-direction previews

The user rejected the basic repeated badge treatment and selected a mixture of playful detail and photographic realism. Four original prompt-generated previews now appear in the design workshop: Red Panda, Ringed Planet, Yosemite-inspired Landscape and Basketball. They were generated using Gemini 3 Pro Image. No input photograph, athlete likeness, team or league logo, official park badge or customer photo was supplied.

The previews are explicitly AI-generated concepts, not genuine wildlife or park photographs and not currently downloadable charm packs. The first Yosemite draft looked like a carved souvenir and was not selected; the second photographic-style draft is used instead. The raw outputs and prompts remain under `output/imagegen/`, with selected 512×512 WebP presentation copies under `website/assets/previews/`.

Existing sixty SVG sources and PNG packs were not regenerated. `collections.json` adds a twelve-world browsing taxonomy without changing their import metadata, and clearly separates available classics from planned categories. Athlete/league names are a collection wishlist only; no new rights, endorsement or sale is implied.

Image generation is an authoring step. The website, extension and desktop runtime do not receive an image-generation API key or call a model to display these previews.

## 2026-10-09 - Complete illustrated redraw review

The owner approved continuing the full Gemini redraw as **review candidates**, not a final release or paid catalogue. `art-review-jobs.mjs` contains 95 distinct briefs: ten starter designs, sixty classic website designs, twelve earned flowers and thirteen additions spanning animals, trees, space, local culture, cities and unbranded sports. The style is photographic-style material depth combined with visibly illustrated personality; it is not literal photo-cutout artwork. No input customer photo, athlete likeness, league logo, competitor asset, official park insignia or proprietary chip floorplan was used.

Gemini 3 Pro Image produced the raw 1024×1024 PNGs. Ignored raw files, prompt hashes, image SHA-256 values, timestamps and model receipts are retained under `output/imagegen/phase-4-redraw/raw/`. Targeted revisions preserve rejected predecessors rather than overwriting them. The first batch included clipped chains and incorrectly coloured backgrounds; failed candidates were revised, not exported by weakening the importer. Background keying measures genuinely green corner colours, removes the background and softens edge spill; white/brown backgrounds, empty silhouettes and canvas-edge clipping still fail.

Every prepared candidate has a 216×252 static RGBA PNG below the existing 256 KiB cap and a 432px WebP presentation copy. `art-review.json` records source/prompt/output hashes, revisions and review status. All95 images passed local validation; 83 non-flower designs are available as individual review imports and fourteen bounded collection packs. Review namespaces differ from bundled/original IDs. Original SVGs and sixty classic packs remain unchanged, and twelve flower studies have no downloadable unlock.

The review page supports original/new comparison, collection/family search, dark-background inspection and enlargement. The gallery and importer checks verify bytes and behavior, not artistic approval, trademark clearance or distribution rights. The owner must still choose final bundled/free/premium artwork and the source/art licence before public release. No NVIDIA or other corporate endorsement is implied.
