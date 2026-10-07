# Changelog

User-visible changes, newest first. Dates use YYYY-MM-DD. Development versions are not
Marketplace releases. See the repository PROJECT_LOG.md for commit and verification evidence.

## 0.3.2 - 2026-10-06 (Phase 3 release preparation)

Tracking: [P3 #11](https://github.com/gautham-nvidia/charmlet/issues/11).

### Added

- Original 256×256 Marketplace PNG icon and light gallery-banner metadata.
- Clear website instructions for current manual VSIX installation versus future verified Marketplace/Open VSX listings.
- Strict nullable store-link configuration tied to the extension publisher/name identity.
- Portable Windows/macOS keyboard shortcuts and Linux test-launch preparation.
- A non-live paid-artwork proposal covering original collections, hosted fulfillment, rights boundaries and owner decisions.

### Changed

- CI is prepared as six jobs across Windows, Ubuntu 24.04 and macOS 15 with VS Code 1.90.0 and 1.140.0; Linux uses Xvfb.
- Gallery checks cover installation copy, null store state and synthetic matching-link rendering without external navigation.
- Preference writes are serialized and canonical fields are confirmed from storage before the webview receives a saved acknowledgement.

### Verified

- Local 0.3.2 icon export, extension checks, current Windows UI, package, gallery build and website checks are recorded in the project log.
- Thirty unit tests and the complete local Windows VS Code 1.140.0 suite passed with serialized, confirmed state writes; the hosted minimum-macOS rerun remains pending.

### Limits

- Linux/macOS support remains unverified until hosted results are reviewed. Publisher, license, listing, public hosting and registry publication remain owner gates. No paid product, checkout or deployment.

## 0.3.1 - 2026-10-06 (Phase 3 collection, messages and gallery)

Tracking: [feedback/gallery #13](https://github.com/gautham-nvidia/charmlet/issues/13), [P3 #11](https://github.com/gautham-nvidia/charmlet/issues/11).

### Added

- Six new bundled originals for ten defaults across Silicon & Code and Good Luck.
- Eighty original coding messages below the stage, with manual Next, saved visibility and five-minute automatic rotation.
- Data-only `.charmlet.json` import/removal for validated static PNG charm packs.
- A static companion gallery with six free extra packs and a real development-VSIX download.

### Changed

- Hanging is the compact default layout; Orbit remains available for complete fixed-peg loops.
- Compact layouts reserve downward pull room and finish deliberate upward retraction before the pointer leaves the view.
- The restore arrow remains a full-size view-pixel target in scaled panes.
- Saved Cord remains the resting preference when the visible length is temporarily clamped to current space.
- Save acknowledgement and shutdown draining make reload persistence explicit.

### Verified

- Twenty-seven unit tests: state/physics/catalogue, pack validation/storage and message timers.
- Complete real-editor suites on Windows VS Code 1.90.0 and 1.140.0, including compact recovery, message persistence, full orbit and real Probe Card import/reload/removal.
- Installed-Edge gallery checks at desktop and 375×812 mobile sizes, with real pack/VSIX downloads, no horizontal overflow and no page/console errors.

### Limits

- Other Phase 3 compatibility, publisher, license, listing and registry-publication gates remain open. No checkout or public deployment.

## 0.2.0 - 2026-10-06 (Phase 3 full-circle orbit)

Tracking: [orbit #8](https://github.com/gautham-nvidia/charmlet/issues/8), [P3 #11](https://github.com/gautham-nvidia/charmlet/issues/11).

### Added

- Complete charm-and-cord orbits around the fixed peg in either direction.
- Above-peg clearance and bounds that account for the rotated artwork.
- Rendered-motion evidence checking full turns, all quadrants, a stationary peg and visible recovery.

### Changed

- Held cord length follows radial dragging while settings retain the chosen resting length.
- Upper or constrained releases return along a bounded arc; ordinary lower-half swing behavior remains.
- Orbit gestures ending above the peg avoid accidental hiding, and held positions no longer auto-settle when the physics body sleeps.
- Small panels scale the logical play area to fit the orbit.

### Verified

- Nineteen unit tests and complete real-editor suites on Windows VS Code 1.90.0 and 1.140.0.
- Existing selection, return-to-rest, cancellation and accessibility behavior remains covered.

### Limits

- Other Phase 3 compatibility and release gates remain open. No registry publication.

## 0.1.0 - 2026-10-05 (Phase 2 free collection)

Tracking: [P2 #9](https://github.com/gautham-nvidia/charmlet/issues/9).

### Added

- Three original Silicon Pack charms: Chip, Wafer and Circuit, alongside the existing Terminal charm.
- An accessible Charm picker in settings with names, descriptions and matching accent dots.
- Saved selection with a Terminal fallback for legacy or unknown IDs, retaining the other preferences.
- Artwork provenance and a prepared optional trial checklist.

### Changed

- Reset keeps the selected charm and motion preference while restoring default size/cord and visibility.
- Local images and labels change only with selection/state updates, not on each animation frame.

### Verified

- Seventeen state/physics tests and complete Windows real-editor checks on VS Code 1.90.0 and 1.138.0.
- All four images load; selection works by mouse and keyboard, survives reload and preserves hidden/motion/layout preferences.
- The accepted Phase 1 gesture and accessibility checks remain passing.

### Limits

- Development package only. Coworker trial feedback, broader compatibility and registry publication are not claimed.

## 0.0.5 - 2026-10-05 (Phase 1 return to rest)

Tracking: [P1 #2](https://github.com/gautham-nvidia/charmlet/issues/2).

### Changed

- Downward pulls stretch temporarily, then ease back to the selected resting cord length and position. Dragging no longer saves a new cord length.
- Cord settings and keyboard adjustments remain the explicit way to change the resting length.
- Grabbing, resizing, hiding and reduced-motion settings handle an in-progress return; reduced motion returns immediately.
- A dedicated Charmlet view container supplies the native panel title and icon.

### Verified

- Fourteen state/physics tests plus real-editor checks on Windows VS Code 1.90.0 and 1.138.0.
- Pull-and-release returns to both a custom 50 px setting and the 126 px default; reload keeps the original setting.
- Circular-input recovery remains covered. A true 360-degree spin/orbit is still being clarified with the user.

## 0.0.4 - 2026-10-05 (Phase 1 drag recovery)

Tracking: [P1 #2](https://github.com/gautham-nvidia/charmlet/issues/2).

### Fixed

- Let the cord extend to the available panel height instead of stopping at 320 px; retain the short default and saved requested length.
- Keep the simulated charm body inside the view during fast or off-center drags and after release.
- Use the final release position to park deliberate vertical pulls; preserve the prior length after sideways or circular gestures.

### Verified

- Twelve state/physics tests, including long-cord persistence and circular-drag bounds/recovery.
- Complete real-editor tests on Windows VS Code 1.90.0 and 1.138.0, including bottom parking, reload persistence and circles in both directions without refresh.

## 0.0.3 - 2026-10-05 (Phase 1 placement refinement)

Tracking: [P1 #2](https://github.com/gautham-nvidia/charmlet/issues/2).

### Fixed

- Center the hanging point within the dock so a nearby right wall no longer limits one direction disproportionately.
- Preserve saved size/cord preferences and the existing motion settings when upgrading.

### Verified

- A narrow-dock regression compares travel from opposite nudges at all three tested charm sizes.
- Real-editor checks cover balanced clearance at default size, maximum size and compact window height, plus movement in both directions.
- Ten unit tests and the complete Windows UI test passed on VS Code 1.90.0 and 1.138.0.

## 0.0.2 - 2026-10-05 (Phase 1 free core)

Tracking: [P1 #2](https://github.com/gautham-nvidia/charmlet/issues/2).

### Added

- Size and cord sliders with saved preferences and keyboard controls.
- Size-aware layout and physics; compact panels preserve the requested cord length for later expansion.
- Explicit coverage for cancelled drags, lost pointer capture, blur, resize and collapsed views.
- Keyboard hide/restore focus checks, reduced-motion media checks and high-contrast focus styling.
- Windows runtime checks on VS Code 1.90.0 and 1.138.0, with a matching CI matrix.
- Versioned resource captures and screenshots; animation-loop shutdown checked when settled and hidden.

### Fixed

- Reduced-motion dragging follows the pointer without advancing the physics simulation.
- Visibility changes settle the charm and cancel unfinished interactions/animations.
- Status announcements change only when the phase changes, rather than every animation frame.
- Real-editor automation handles both observed Command Palette roles and confines typing/saving to a temporary file.

### Limits

- One placeholder charm; the three-original collection and switching UI are Phase 2.
- Human feedback on the dock footprint remains open. Other OS/editors and remote/browser hosts are unverified.
- Development package only; no Marketplace or Open VSX publication.

## 0.0.1 - 2026-09-17 (Phase 0 development baseline)

Tracking: [P0 #3](https://github.com/gautham-nvidia/charmlet/issues/3).

### Added

- One original terminal-keycap charm in a supported, movable VS Code webview.
- Drop-in animation, click impulses, Matter.js drag/release physics and pull-down parking.
- Pull-up retraction, restore handle, motion switch, reset and status-bar commands.
- Keyboard alternatives, local saved state and reduced-motion handling.
- Idle/hidden animation shutdown, viewport clamping and restrictive local-resource CSP.
- Five state/physics tests and an isolated real-VS-Code gesture regression.

### Fixed

- Restoring after pull-up now recovers the saved parked length, not the temporary shortened cord.
- UI automation waits for editor startup and isolates hardware mouse input from scripted gestures.

### Limits

- Docked view only, not a floating overlay. One placeholder, no gallery or paid packs.
- Local runtime verification: Windows, VS Code 1.138.0. Other hosts and the declared 1.90 floor
	still need compatibility testing. No Marketplace or Open VSX release yet.