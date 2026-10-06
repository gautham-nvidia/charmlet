# Charmlet: Coding Charms

Four original hanging charms that swing when nudged and return to their resting cord length after a pull.
The peg has room above it so the charm and cord can loop all the way around it.

**Phase 3 development build, version 0.2.0.** Charmlet lives in a dockable VS Code view, not over your code
or desktop. It uses supported APIs and does not modify your VS Code installation.

## Try it

Install a development VSIX through **Extensions: Install from VSIX...**, or follow the
[source setup](https://github.com/gautham-nvidia/charmlet#readme).

Charmlet has its own Activity Bar container titled **Charmlet**. You can move it to the right sidebar using VS Code's view controls.

1. Open the Command Palette and run **Charmlet: Show Charm**.
2. For a right-side dock, run **View: Move View**, select **Charmlet**, then **New Secondary Side Bar Entry**.
3. Click the keycap to nudge it. Pull downward and release to return to the resting position; pull upward at least 60 pixels to hide it.
4. Open **Charm settings** to choose **Terminal**, **Chip**, **Wafer** or **Circuit**, then adjust size and resting cord length.
5. For a full loop, grab the charm, move closer to the peg, and drag around it in either direction. Release to return to rest.

| Charm | Style |
|---|---|
| Terminal | Mint terminal keycap |
| Chip | Violet chip with a bright core |
| Wafer | Warm patterned wafer |
| Circuit | Blue board with bright traces |

| Control | Action |
|---|---|
| Drag sideways and release | Swing with momentum |
| Drag around the peg | Complete an orbit; release returns to the selected resting length |
| Eye / restore arrow | Hide or restore the last parked length |
| Motion switch | Enable or disable animation |
| Charm settings | Choose a charm, size and resting cord; Escape closes settings and returns focus |
| Reset arrow | Restore default size/cord and reveal the selected charm; keep its selection and the motion preference |
| Status bar Charmlet item | Toggle or reveal the charm view |

With the charm keyboard-focused: Enter/Space nudges, Left/Right swings, Up/Down adjusts the cord,
and Escape hides. System reduced-motion preferences override the animation switch.

Charm choice, size, cord, visibility and motion choices are saved locally. Shrinking the panel temporarily shortens
the visible cord; expanding it restores your requested length. Cancelling a drag keeps the previous
parked length. The settings panel stays closed until you open it.

The displayed cord may shorten temporarily while orbiting; the Cord setting continues to show the resting preference.

Size and Cord in settings define the resting appearance. A downward pull stretches temporarily and eases back on release. If an earlier build saved an unwanted long cord, use Reset once or choose your preferred resting length in settings.

## Free and local

All four charms are bundled and permanently free. They work offline without login, runtime AI, network
APIs, telemetry, payments or audio. Changing the charm preserves size, resting cord, visibility and
motion preferences. [Artwork provenance](https://github.com/gautham-nvidia/charmlet/blob/main/extension/ARTWORK.md)
records the asset sources and license status.

## Current limits

- Tested locally on Windows with VS Code **1.90.0 and 1.140.0**, at 1400x900, 1000x650 and 1000x500 window sizes.
- The animation loop stops when settled or hidden. [Recorded measurements](https://github.com/gautham-nvidia/charmlet/blob/main/docs/phase-1-validation.md) include whole-editor overhead and do not promise zero CPU use.
- macOS, Linux, Cursor, Devin Desktop, browser hosts and Remote-SSH/WSL remain unverified.
- The dock occupies editor space. The peg reserves room above it, and small panels scale the play area to keep the loop visible.
- Charm choice, size, cord, visibility and motion preferences persist locally; cross-machine sync is not implemented.
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
