# Changelog

User-visible changes, newest first. Dates use YYYY-MM-DD. Development versions are not
Marketplace releases. See the repository PROJECT_LOG.md for commit and verification evidence.

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