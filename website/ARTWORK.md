# Charmlet website artwork

## 2026-10-08 - Sixty-design free website catalogue

Fifty-four additional original website charm SVGs were authored for Phase 4C across Compute & Silicon, Test Bench, AI & Code, and Places & Nature. Together with the preserved Probe Card, Logic Gate, FinFET, Photon Link, Lotus and Sunrise files, the website offers sixty free downloadable designs.

`generate-phase-4c-art.mjs` is a checked-in one-time trusted source generator for only the 54 new 72×84 SVGs. Each design follows its reviewed individual motif—generic compute/test/code or original landscape geometry—with the existing project hook, readable outline and soft shading. No company/product logo, actual floorplan, proprietary waveform, photograph, copied competitor artwork or remote asset is included.

The six earlier SVG and pack hashes were compared with their frozen Phase 4C manifest after export and remained unchanged. `export-packs.mjs` requires explicit unique known IDs; the initial invocation selected only the 54 new files. Installed Edge rendered their bounded static PNG payloads, and the existing parser validated every generated pack. Ordinary gallery builds reuse all sixty frozen packs and do not render artwork.

The website swing preview uses the existing Terminal and catalogue artwork with the extension's shared Pendulum/getLayout implementation. It adds no separate branded or external art.

The project's source/art distribution license remains an owner decision. This provenance record does not grant a separate reuse license or imply NVIDIA sponsorship or endorsement.
