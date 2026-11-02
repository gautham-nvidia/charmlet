# Charmlet: Coding Charms

Ten original hanging charms with compact pull/return behavior, an optional fixed-peg Orbit layout, free Focus/Learn tools, a gentle garden and optional reminders.
The default Hanging layout saves headroom; Orbit layout reserves room for full loops.

**Store preparation candidate, version 0.5.0.** Charmlet lives in a dockable VS Code view, not over your code
or desktop. It uses supported APIs and does not modify your VS Code installation.
It also works in Restricted Mode without asking you to trust workspace code.

<img src="https://raw.githubusercontent.com/gautham-nvidia/charmlet/main/docs/store-assets/navigation.png" width="240" alt="Charmlet main view, facts and direct navigation"> <img src="https://raw.githubusercontent.com/gautham-nvidia/charmlet/main/docs/store-assets/picker.png" width="240" alt="Search the ten original bundled charms">

## Try it

Install a development VSIX through **Extensions: Install from VSIX...**, or follow the
[source setup](https://github.com/gautham-nvidia/charmlet#readme).

Charmlet has its own Activity Bar container titled **Charmlet**. You can move it to the right sidebar using VS Code's view controls.

1. Open the Command Palette and run **Charmlet: Show Charm**.
2. For a right-side dock, run **View: Move View**, select **Charmlet**, then **New Secondary Side Bar Entry**.
3. Click a charm to nudge it. Pull downward and release to return to rest; pull straight upward toward the peg to retract, then use the restore arrow to bring it back.
4. Click **Charms** to open the visual picker, search by name and filter installed collections. Choose **Settings → Appearance** for size, resting cord, visibility, motion and layout.
5. Switch to **Orbit layout** for a full loop around the fixed peg; Hanging layout keeps a compact top peg and pull room.
6. Click **Focus** or run **Charmlet: Focus Session** for a focus/break timer with presets, custom minutes, pause/resume/stop and an optional intention.
7. Motivation is the fresh-state default, without a category heading. **Settings → Messages** offers Motivation, Facts + trivia, Facts or Trivia. Existing saved feed choices are preserved.
8. Click **Garden**, then **Plant a seed**, or run **Charmlet: Open Garden**. Water once per local day and earn an original flower after eleven valid waterings. Optional water/move schedules live under **Settings → Reminders**.
9. Run **Charmlet: Import Charm Pack** for a free downloaded `.charmlet.json`; remove imported packs with **Charmlet: Remove Charm Pack**.

| Group | Bundled charms |
|---|---|
| Silicon & Code | Terminal, Chip, Wafer, Circuit, Transistor, Memory Stack |
| Good Luck | Evil Eye, Drishti Doll, Hamsa, Lemon & Chilies |

| Control | Action |
|---|---|
| Drag sideways and release | Swing with momentum |
| Drag around the peg | In Orbit layout, complete a loop; release returns to the selected resting length |
| Orbit layout | Toggle between compact Hanging and full-loop geometry |
| Settings → Hide charm / restore arrow | Hide or restore the last parked length with a full-size target |
| Appearance → Motion | Enable or disable animation |
| Charms | Open the searchable visual picker with installed-collection filters |
| Focus button / Focus Session command | Start, pause, resume or stop a persisted focus/break timer |
| Garden button / Open Garden command | Water once per local day and earn a selectable flower after eleven waterings |
| Settings → Reminders | Schedule a recurring in-app notice with Done, Snooze and Skip; no automatic drawer opening or focus change |
| Next coding message | Advance the saved motivation/learning feed and restart the five-minute countdown |
| Settings → Appearance or Messages | Change appearance or feed preferences; Escape closes the panel and returns focus |
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
trivia questions and 80 motivational messages. Motivation is the fresh-state default; saved choices are not reset. Automatic rotation runs every five
minutes only while the card is available, settings/tools are closed, no request is pending and no card or
drag is active. Feed mode, card identity, trivia reveal state and rotation preferences persist.

Focus sessions use a separate local companion file and a host-owned deadline rather than renderer frames.
A running timer updates the display once per second without writing every tick. Pause preserves the exact
remaining duration across reload; expiration recovers one finished session without auto-starting another.

The free garden uses one garden-wide watering allowance per host-local day. Missed days pause progress,
a planted species cannot reroll on reload, and the eleventh valid watering adds its original flower to
**Grown by you** before the UI confirms it. A new seed does not reset that day's allowance. Water and move
reminders are off by default, bounded to 15–180 minutes, and show one quiet cue with Done/Snooze/Skip without stealing focus or stacking catch-up notices. Done and Skip schedule the next full interval; Snooze waits ten minutes. **Wait for a break** defers the cue during a running focus session.

The footer shows **Website — coming soon**, **Made in Silicon Valley** and the actual installed host version. The website's separate artwork-review gallery contains 95 illustrated candidates and free review packs; importing those adds separate items rather than replacing bundled art or saved progress.

## Free and local

All ten bundled charms and every functional control are permanently free. They work offline without
login, runtime AI, network APIs, telemetry, payments or audio. Free extra packs contain validated static
PNG data and work offline after import; they do not add executable code. [Artwork provenance](https://github.com/gautham-nvidia/charmlet/blob/main/extension/ARTWORK.md)
records asset origins, while the project source/art license remains pending and separate from price.

## Current limits

- Website artwork previews, Photo Studio and the standalone desktop beta are separate from this VSIX; the ten bundled defaults remain unchanged.
- The 0.4.3 candidate passes type/lint/build, 59 units and all six editor scenarios locally on Windows VS Code **1.90.0 and 1.140.0**, including navigation, reminders and saved preferences. A further current-host check imports the ten-image Starter Redraws review pack and restores it after reload. New hosted Linux/macOS results are still required; historical 0.4.1 run 37865298216 is not proof for this newer candidate.
- The earlier Phase 4A Mac assertions compared fitted cord length while controls were open. The corrected tests distinguish saved preference from rendering and passed in the 0.4.1 matrix.
- Hosted 0.3.2 run 37697185841 passed the canonical-file restoration path on macOS 15 Apple Silicon with VS Code 1.90.0 and 1.140.0: the acknowledged Lemon & Chilies file readback restored as Lemon after reload on both hosts. Earlier intermittent failures remain historical evidence, and their exact internal VS Code cause is not asserted.
- The animation loop stops when settled or hidden. [Recorded measurements](https://github.com/gautham-nvidia/charmlet/blob/main/docs/phase-1-validation.md) include whole-editor overhead and do not promise zero CPU use.
- Intel Mac, Windows ARM, authenticated Cursor/Devin Desktop, browser hosts and Remote-SSH/WSL remain unverified.
- These checks cover the VS Code extension. The standalone developer beta has its own verification and manual desktop-interaction gates; see the repository's desktop guide.
- The dock occupies editor space. Hanging saves headroom; Orbit reserves room for a full loop. Small panels scale the play area.
- Charm choice, layout, size, resting cord, visibility, motion and message preferences persist locally; cross-machine sync is not implemented.
- This is not yet published to VS Code Marketplace or Open VSX. The manifest publisher is not
	evidence of a registered or verified Marketplace publisher.

## Project and feedback

[Privacy and local data](PRIVACY.md) describes saved preferences, focus notes, imported packs and data removal. Charmlet does not send workspace code or progress to a server.

[Report an issue](https://github.com/gautham-nvidia/charmlet/issues) with your OS/editor version,
steps to reproduce and expected behavior. Avoid including private code or credentials in screenshots.

[Project log](https://github.com/gautham-nvidia/charmlet/blob/main/PROJECT_LOG.md) records dated
decisions and validation; [CHANGELOG.md](CHANGELOG.md) records behavior changes.

Independent personal project; no NVIDIA sponsorship or endorsement. Charmlet's own source/art
license is not yet selected; a public repository is not automatically a reuse license. Bundled
dependencies retain their licenses in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
