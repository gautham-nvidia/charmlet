# Charmlet: Coding Charms

An original terminal-keycap charm that drops in, swings when nudged, and parks on its cord.

**Phase 0 development prototype.** Charmlet lives in a dockable VS Code view, not over your code
or desktop. It uses supported APIs and does not modify your VS Code installation.

## Try it

Install a development VSIX through **Extensions: Install from VSIX...**, or follow the
[source setup](https://github.com/gautham-nvidia/charmlet#readme).

1. Open the Command Palette and run **Charmlet: Show Charm**.
2. For a right-side dock, run **View: Move View**, select **Charmlet**, then **New Secondary Side Bar Entry**.
3. Click the keycap to nudge it. Pull downward to extend and park; pull upward at least 60 pixels to retract.

| Control | Action |
|---|---|
| Drag sideways and release | Swing with momentum |
| Eye / restore arrow | Hide or restore the last parked length |
| Motion switch | Enable or disable animation |
| Reset arrow | Reset the position and reveal the charm |
| Status bar Charmlet item | Toggle or reveal the charm view |

With the charm keyboard-focused: Enter/Space nudges, Left/Right swings, Up/Down adjusts the cord,
and Escape hides. System reduced-motion preferences override the animation switch.

## Free and local

One original placeholder charm is bundled. No login, runtime AI model, network API, telemetry,
payments or audio. Three finished free charms and a gallery are later milestones, not included yet.

## Current limits

- Tested locally on Windows with VS Code **1.138.0**, at 1400x900 and 1000x650 window sizes.
- The manifest declares VS Code 1.90+; the minimum version has not yet been runtime-tested.
- macOS, Linux, Cursor, Devin Desktop, browser hosts and Remote-SSH/WSL remain unverified.
- The dock occupies editor layout space. Explorer's initial slot can be too short; move or resize it.
- Position, visibility and motion preferences persist locally; cross-machine sync is not implemented.
- This is not yet published to VS Code Marketplace or Open VSX. The manifest publisher is not
	evidence of a registered or verified Marketplace publisher.

## Project and feedback

[Report an issue](https://github.com/gautham-nvidia/charmlet/issues) with your OS/editor version,
steps to reproduce and expected behavior. Avoid including private code or credentials in screenshots.

[Project log](https://github.com/gautham-nvidia/charmlet/blob/main/PROJECT_LOG.md) records dated
decisions and validation; [CHANGELOG.md](CHANGELOG.md) records behavior changes.

Independent personal project; no NVIDIA sponsorship or endorsement. Charmlet's own source/art
license is not yet selected; a public repository is not automatically a reuse license. Bundled
dependencies retain their licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
