# Charmlet: Coding Charms

Ten original hanging charms with compact pull/return behavior, an optional fixed-peg Orbit layout, free Focus sessions and a sourced Learn feed.
The default Hanging layout saves headroom; Orbit layout reserves room for full loops.

**Phase 4A development candidate, version 0.4.0.** Charmlet lives in a dockable VS Code view, not over your code
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
6. Open **Companion tools** or run **Charmlet: Focus Session** for a focus/break timer with presets, custom minutes, pause/resume/stop and an optional intention.
7. Open the **Learn** page to choose Facts + trivia, Facts, Trivia or the existing Encouragement feed; reveal trivia answers and open reviewed public sources.
8. Run **Charmlet: Import Charm Pack** for a free downloaded `.charmlet.json`; remove imported packs with **Charmlet: Remove Charm Pack**.

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
| Companion tools | Open the Focus/Learn drawer without changing charm size, cord or visibility |
| Focus Session command/readout | Start, pause, resume or stop a persisted focus/break timer |
| Next coding message | Advance the saved learning/encouragement feed and restart the five-minute countdown |
| Charm settings | Choose a charm, size, resting cord, message visibility and automatic rotation; Escape closes settings and returns focus |
| Import / Remove Charm Pack | Add or remove validated static-PNG data packs |
| Reset arrow | Restore default size/cord and reveal the selected charm; keep its selection and the motion preference |
| Status bar Charmlet item | Toggle or reveal the charm view |

With the charm keyboard-focused: Enter/Space nudges, Left/Right swings, Up/Down adjusts the cord,
and Escape hides. System reduced-motion preferences override the animation switch.

Charm choice, layout, size, resting cord, visibility, motion and message preferences use an extension-owned local preferences file. Existing saved settings are used as a migration fallback when that file is first created or unreadable.
The displayed cord may shorten temporarily to fit the current panel while the Cord setting keeps the
requested resting preference. Cancelling a drag keeps that preference. A downward pull stretches and
eases back on release; a straight upward pull retracts and the full-size arrow restores it.

The learning card sits below the stage and above the controls. It contains 60 sourced facts, 30 sourced
trivia questions and the existing 80 optional encouragement messages. Automatic rotation runs every five
minutes only while the card is available, settings/tools are closed, no request is pending and no card or
drag is active. Feed mode, card identity, trivia reveal state and rotation preferences persist.

Focus sessions use a separate local companion file and a host-owned deadline rather than renderer frames.
A running timer updates the display once per second without writing every tick. Pause preserves the exact
remaining duration across reload; expiration recovers one finished session without auto-starting another.

## Free and local

All ten bundled charms and every functional control are permanently free. They work offline without
login, runtime AI, network APIs, telemetry, payments or audio. Free extra packs contain validated static
PNG data and work offline after import; they do not add executable code. [Artwork provenance](https://github.com/gautham-nvidia/charmlet/blob/main/extension/ARTWORK.md)
records asset origins, while the project source/art license remains pending and separate from price.

## Current limits

- Garden, reminders, expanded artwork, Photo Studio and a standalone desktop app are not part of this Phase 4A candidate.
- The 0.3.2 baseline passed complete VS Code extension checks on Windows Server 2025 and the local Windows PC, Ubuntu 24.04 x64 with Xvfb, and macOS 15 Apple Silicon, using VS Code **1.90.0 and 1.140.0**. Current 0.4.0 evidence is local Windows VS Code 1.140.0 only until hosted CI passes.
- Hosted 0.3.2 run 37697185841 passed the canonical-file restoration path on macOS 15 Apple Silicon with VS Code 1.90.0 and 1.140.0: the acknowledged Lemon & Chilies file readback restored as Lemon after reload on both hosts. Earlier intermittent failures remain historical evidence, and their exact internal VS Code cause is not asserted.
- The animation loop stops when settled or hidden. [Recorded measurements](https://github.com/gautham-nvidia/charmlet/blob/main/docs/phase-1-validation.md) include whole-editor overhead and do not promise zero CPU use.
- Intel Mac, Windows ARM, authenticated Cursor/Devin Desktop, browser hosts and Remote-SSH/WSL remain unverified.
- These checks cover the VS Code extension. A possible standalone Windows/macOS app is only a product proposal and has not been implemented or verified.
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
