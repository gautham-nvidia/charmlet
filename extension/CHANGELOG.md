# Changelog

User-visible changes, newest first. Dates use YYYY-MM-DD. Development versions are not
Marketplace releases. See the repository PROJECT_LOG.md for commit and verification evidence.

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