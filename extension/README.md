# Charmlet: Coding Charms

Ten original hanging charms with compact pull/return behavior, an optional fixed-peg Orbit layout and 80 coding messages.
The default Hanging layout saves headroom; Orbit layout reserves room for full loops.

**Phase 3 release-preparation build, version 0.3.2.** Charmlet lives in a dockable VS Code view, not over your code
or desktop. It uses supported APIs and does not modify your VS Code installation.

## Try it

Install a development VSIX through **Extensions: Install from VSIX...**, or follow the
[source setup](https://github.com/gautham-nvidia/charmlet#readme).

Charmlet has its own Activity Bar container titled **Charmlet**. You can move it to the right sidebar using VS Code's view controls.

1. Open the Command Palette and run **Charmlet: Show Charm**.
2. For a right-side dock, run **View: Move View**, select **Charmlet**, then **New Secondary Side Bar Entry**.
3. Click a charm to nudge it. Pull downward and release to return to rest; pull straight upward toward the peg to retract, then use the restore arrow to bring it back.
4. Open **Charm settings** to choose among the grouped ten defaults, then adjust size, resting cord and message preferences.
5. Switch to **Orbit layout** for a full loop around the fixed peg; Hanging layout keeps a compact top peg and pull room.
6. Run **Charmlet: Import Charm Pack** for a free downloaded `.charmlet.json`; remove imported packs with **Charmlet: Remove Charm Pack**.

| Group | Bundled charms |
|---|---|
| Silicon & Code | Terminal, Chip, Wafer, Circuit, Transistor, Memory Stack |
| Good Luck | Evil Eye, Drishti Doll, Hamsa, Lemon & Chilies |

| Control | Action |
|---|---|
| Drag sideways and release | Swing with momentum |
| Drag around the peg | In Orbit layout, complete a loop; release returns to the selected resting length |
| Orbit layout | Toggle between compact Hanging and full-loop geometry |
| Eye / restore arrow | Hide or restore the last parked length with a full-size target |
| Motion switch | Enable or disable animation |
| Next coding message | Advance immediately and restart the five-minute countdown |
| Charm settings | Choose a charm, size, resting cord, message visibility and automatic rotation; Escape closes settings and returns focus |
| Import / Remove Charm Pack | Add or remove validated static-PNG data packs |
| Reset arrow | Restore default size/cord and reveal the selected charm; keep its selection and the motion preference |
| Status bar Charmlet item | Toggle or reveal the charm view |

With the charm keyboard-focused: Enter/Space nudges, Left/Right swings, Up/Down adjusts the cord,
and Escape hides. System reduced-motion preferences override the animation switch.

Charm choice, layout, size, resting cord, visibility, motion and message preferences are saved locally.
The displayed cord may shorten temporarily to fit the current panel while the Cord setting keeps the
requested resting preference. Cancelling a drag keeps that preference. A downward pull stretches and
eases back on release; a straight upward pull retracts and the full-size arrow restores it.

Messages sit below the stage and above the controls. Automatic rotation runs every five minutes only
while the view/message are visible, settings are closed and no drag is active. Manual Next restarts the
countdown. Visibility and automatic rotation can be disabled independently and persist across reload.

## Free and local

All ten bundled charms and every functional control are permanently free. They work offline without
login, runtime AI, network APIs, telemetry, payments or audio. Free extra packs contain validated static
PNG data and work offline after import; they do not add executable code. [Artwork provenance](https://github.com/gautham-nvidia/charmlet/blob/main/extension/ARTWORK.md)
records asset origins, while the project source/art license remains pending and separate from price.

## Current limits

- Tested locally on Windows with VS Code **1.90.0 and 1.140.0**, at 1400x900, 1000x650 and 1000x500 window sizes.
- The animation loop stops when settled or hidden. [Recorded measurements](https://github.com/gautham-nvidia/charmlet/blob/main/docs/phase-1-validation.md) include whole-editor overhead and do not promise zero CPU use.
- macOS, Linux, Cursor, Devin Desktop, browser hosts and Remote-SSH/WSL remain unverified.
- The dock occupies editor space. Hanging saves headroom; Orbit reserves room for a full loop. Small panels scale the play area.
- Charm choice, layout, size, resting cord, visibility, motion and message preferences persist locally; cross-machine sync is not implemented.
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
