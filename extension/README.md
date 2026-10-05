# Charmlet: Coding Charms

An original terminal-keycap charm that drops in, swings when nudged, and parks on its cord.
The hanging point is centered in the view to leave room for swings in either direction.

**Phase 1 development build, version 0.0.3.** Charmlet lives in a dockable VS Code view, not over your code
or desktop. It uses supported APIs and does not modify your VS Code installation.

## Try it

Install a development VSIX through **Extensions: Install from VSIX...**, or follow the
[source setup](https://github.com/gautham-nvidia/charmlet#readme).

1. Open the Command Palette and run **Charmlet: Show Charm**.
2. For a right-side dock, run **View: Move View**, select **Charmlet**, then **New Secondary Side Bar Entry**.
3. Click the keycap to nudge it. Pull downward to extend and park; pull upward at least 60 pixels to retract.
4. Open **Charm settings** to adjust **Size** (60-140%) and **Cord** (48-320 px, limited by the available space).

| Control | Action |
|---|---|
| Drag sideways and release | Swing with momentum |
| Eye / restore arrow | Hide or restore the last parked length |
| Motion switch | Enable or disable animation |
| Charm settings | Adjust size and cord; Escape closes settings and returns focus |
| Reset arrow | Restore default size/cord and reveal the charm; keep the motion preference |
| Status bar Charmlet item | Toggle or reveal the charm view |

With the charm keyboard-focused: Enter/Space nudges, Left/Right swings, Up/Down adjusts the cord,
and Escape hides. System reduced-motion preferences override the animation switch.

Size, cord, visibility and motion choices are saved locally. Shrinking the panel temporarily shortens
the visible cord; expanding it restores your requested length. Cancelling a drag keeps the previous
parked length. The settings panel stays closed until you open it.

## Free and local

One original placeholder charm is bundled. No login, runtime AI model, network API, telemetry,
payments or audio. Three finished free charms and a gallery are later milestones, not included yet.

## Current limits

- Tested locally on Windows with VS Code **1.90.0 and 1.138.0**, at 1400x900, 1000x650 and 1000x500 window sizes.
- The animation loop stops when settled or hidden. [Recorded measurements](https://github.com/gautham-nvidia/charmlet/blob/main/docs/phase-1-validation.md) include whole-editor overhead and do not promise zero CPU use.
- macOS, Linux, Cursor, Devin Desktop, browser hosts and Remote-SSH/WSL remain unverified.
- The dock occupies editor layout space. Explorer's initial slot can be too short; move or resize it.
- Size, cord, visibility and motion preferences persist locally; cross-machine sync is not implemented.
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
