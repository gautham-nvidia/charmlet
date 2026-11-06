# Phase 8 - cords, small wins and personal keepsakes

Keep the desktop quiet by default while making each charm feel personal.

## Agreed direction

- Cord materials should suit the selected charm, with a saved manual override. Compare fine gold/silver chains, braided cord, a soft cord, ribbon and the original simple thread at actual app size.
- Small wins should record deliberate progress and completed focus sessions, with optional brief milestone celebrations. No automatic timer restarts, backlog of celebrations or extra default desktop panels.
- Add a local photo charm flow: choose a supported image, crop it, preview a frame, save, select and remove it. Original photos stay in memory; save only the small rendered keepsake. Preserve existing packs and garden progress.
- The owner approved colour over bronze. Reuse the exact Ganesha, Murugan and seated Shiva examples, extend the painted style to the remaining figures, and retain the markings appropriate to each tradition. Keep Nataraja as a separate dancing form.
- Centre the open-eyed smileys toward the viewer. Add an original live yellow smiley with gentle pointer glances, blinks, squeeze and win reactions. Respect Reduced Motion and provide a fallback when WebGL is unavailable.
- Explore a curved charm band and a small row of hanging charms as previews. Keep the current single charm in the shipping app until the owner chooses a direction.
- Retire the nine early designs, retaining and sharpening the original Terminal. Migrate existing selections, pins and cord choices to their newer equivalents.
- Replace the garden's flat seed/growth pictures with realistic botanical artwork and reuse the current flower renders for earned rewards, preserving progress.
- The owner approved the four current growth stages. Add red, pink, white and yellow roses, jasmine and lily as six more seed-grown flowers; preserve the original twelve, the current plant and collected counts/dates.

## Verification

Check material selection, persistence, silhouette attachment, squeeze, long pulls, bounce and Reduced Motion. Check win deduplication, restart, day changes, paused/stopped/break timers and quiet recovery. Check photo size/type/dimensions, stale loads, crop bounds, metadata removal, cancellation, persistence, removal and no photo network traffic.

Run the installed VSIX and extracted desktop archive checks, the existing Windows/Linux/macOS matrix, and native desktop input checks supported by the isolated runners. Review the app at normal size in dark/light themes and the website at narrow widths. Record observed issues and fixes rather than inventing a target bug count.

## Release decisions still required

| Decision | Concrete choice to resolve |
|---|---|
| Source and artwork licence | Choose the source licence and confirm redistribution rights for the generated artwork. MIT for code with an explicit separate artwork policy is an option; no licence has been selected or granted by these changes. |
| Public lineup and pricing | The trial includes all 151 charms. Choose the public bundle and any separate free/paid downloads from the review gallery. Named athletes and leagues remain outside this collection. Native photo creation is free. |
| Publisher | Verify ownership of the `gautham-nvidia` namespace and configure credentials for the selected registries. The candidate identity alone does not prove account ownership. |
| Desktop delivery | Windows and macOS packages remain unsigned development artifacts. A signed public release needs Windows signing and macOS signing/notarization credentials. |
| Native coverage | Complete native macOS interaction and mixed-display checks. A VS Code/Windows-first release with macOS retained as a beta is an option after the other gates are resolved. |

General implementation permission does not resolve these publication decisions. The release workflow is manual and keeps its licence and credential checks.

## Candidate record - 2026-11-05

- Versions: extension 0.7.0, desktop 0.4.0. Catalogue: 149 rendered designs, Terminal and Sunny (151 total); eighteen growable flower varieties.
- Type/lint/build and all 81 model tests pass. They cover retirement/pin/cord migration, local midnight, existing garden progress and every new flower reaching bloom. Photo/art boundary checks pass (23 tests); release-check fixtures pass (5 tests).
- The editor personalisation check passed for gaze, blinking, squeezing, win reactions, Reduced Motion, context loss/fallback and photo crop/save/reload/removal before the six-flower addition. The complete installed-package and platform matrix remains the next gate for the final source.
- Garden preparation uses seed/sprout r1, leaves r2 and bud r2. The owner approved these four stages. The six new flowers were visually checked at 72 by 84px on light/dark backgrounds; red rose and jasmine required targeted background corrections. Raw masters and receipts are preserved.
- Both website browser checks pass: 151 available charms, 191 validated current/archive PNGs, 19 review images, 82 original comparisons, 22 packs, no narrow-screen overflow or page errors. Historical flower comparisons retain their SVG assets while the active garden uses the new PNGs.
- Desktop type/build and twelve model checks pass. Complete the full smoke, extracted archive and native Windows input gate on the isolated runner; local desktop mouse activity can interrupt synthetic hover.
- Eight cord styles, the live face and private photos remain accessible on demand. The desktop starts with the charm alone. Bracelet and hanging-row pages are review concepts; one charm remains the implemented layout.
- The native packaging command now fails clearly if it skipped an existing output; `--overwrite` explicitly rebuilds that generated candidate. This prevents a stale package from being mistaken for a successful rebuild.

### Follow-up after the first hosted run

All six editor jobs passed the eight companion scenarios, then reached an obsolete expectation for the retired Originals collection. The collection check now verifies Terminal and follows the actual grouped option order for keyboard End selection. Its selection, saved preference, reload and reset checks remain.

Both desktop jobs exposed an Escape cancellation failure after loading a photo. Disabling the file input had moved focus outside the panel. The editor now restores file-input focus after decoding and handles Escape while the photo tool is open, including when focus is on its background. The desktop toolbar also closes the photo tool when hiding controls. The existing editor and desktop checks now verify cancellation without saving and a fresh empty preview on reopening.

The updated personalisation check passes locally (22.9 seconds), the complete editor scenario passes (3.4 minutes), and the desktop development smoke passes (22.7 seconds). Native OS input and extracted archives still require the updated hosted run.

Sixteen new captures from the installed 0.7.0 VSIX show all eight cord materials, the six new flowers and three light-background examples at 100% size. Normal motion stayed enabled, each picture uses one selected charm, and garden data remained unchanged. The current listing screenshots were refreshed from that installation.
