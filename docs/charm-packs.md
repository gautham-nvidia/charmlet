# Charmlet pack format

Charmlet pack files are validated data files named `<pack-id>.charmlet.json`. They add static PNG artwork to the existing picker; they do not contain executable extension code.

## Format version 1

A pack is a JSON object with these fields:

| Field | Meaning |
|---|---|
| `format` | Exact value `charmlet-pack` |
| `version` | Exact value `1` |
| `id` | Portable lowercase pack identifier |
| `name` | Display name |
| `author` | Plain-text author record |
| `charms` | Array containing 1–12 charm records |

Each charm record contains:

| Field | Meaning |
|---|---|
| `id` | Pack-local lowercase identifier |
| `name` | Display name |
| `group` | Picker group |
| `description` | Short plain-text description |
| `accent` | Six-digit hexadecimal color |
| `png` | Canonical base64 for a validated static PNG |

## Working example

[Probe Card](../website/packs/probe-card.charmlet.json) is a complete, validated single-charm example, including its PNG payload. It supplies the fields above and can be imported directly. The [gallery exporter](../website/export-packs.mjs) creates the same format from the project's trusted source artwork.

## Validation and limits

- Maximum JSON size: **2 MiB**.
- Maximum image size: **256 KiB** decoded.
- Pack size: **1–12 charms**.
- PNG dimensions: 72×84 multiples, up to 576×672.
- PNG profile: static RGB or RGBA, eight-bit, noninterlaced, with validated chunks, checksums, decompressed length and scanline filters.
- Names, groups, authors and descriptions are bounded plain text; control and bidirectional-formatting characters are rejected.
- IDs begin with a lowercase ASCII letter and contain only lowercase letters, digits and hyphens. Windows device basenames and traversal-like identifiers are rejected.
- Base64 must be canonical and contain only the PNG payload. Data URLs are not accepted in input.

Packs cannot supply executable SVG, scripts, remote URLs, arbitrary paths or built-in replacements. Imported charm IDs are namespaced as `pack:<pack-id>:<charm-id>`, so a pack cannot override a bundled charm.

## Install and removal behavior

Run **Charmlet: Import Charm Pack** and select one `.json` file. Charmlet validates the complete file before storage. Reimporting identical content is a no-op. A different file with the same pack ID is rejected until the installed pack is removed explicitly with **Charmlet: Remove Charm Pack**.

Validated files are stored in the extension's global storage under its dedicated `packs` directory. They are separate from extension installation files, survive extension updates, and remain available offline. Removal deletes only the selected pack file; bundled charms cannot be removed.

This format is a data interchange contract, not a copyright or artwork license grant. The project source/art license remains a separate owner decision.
