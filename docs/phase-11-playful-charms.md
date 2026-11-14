# Playful charms and larger sizes

Extension **0.11.0** and desktop **0.8.0** build on the Cali and California artwork approved by the owner on 2026-11-09. The collection now contains 184 offline charms.

- Cali cycles through a curious head tilt, wink, double take and victory shimmy. Each reaction responds to a tap, finishes in about a second and returns to rest. Wins retain the thumbs-up cheer.
- Appearance offers automatic daily outfits or a saved choice of any seven Cali looks. Manual choices survive day changes and restarts; returning to Automatic follows the local calendar again.
- Orbit, Pinwheel and Bar join the original spinner. Dragging the rotor turns it directly in either direction; release lets it coast. The centre retains the cord pull, and Shift+Space spins backwards.
- Twisty Cube, Sliding Tiles and Lights Out have working puzzle rules, shuffle, undo and reset. Progress saves locally. The larger board opens through Play only when a puzzle is selected; closing it restores the minimal desktop.
- All charms share brief tap feedback, including static artwork, imported packs, local photos, earned flowers and fidgets. Space/Enter works too. The image rotates at its attachment point while preserving the separate squeeze and cord behavior.
- A new hold, selection change, hidden view or Reduced Motion cancels the wiggle. Reduced Motion uses still Cali feedback; optional encouragement and celebrations retain their saved settings.
- 100% is 15% larger than previous trials. Appearance supports 60-200% in 5% steps. Stored percentages are preserved, and Reset returns to the new 100%. Views fit the charm to their available space.
- The desktop still opens with just the charm and cord. Its peg bounds reserve enough space for larger charms near the bottom of a display.

The approved Cali and California artwork files are unchanged. The arm motion switches paw poses earlier, and the shimmy brings the arms inward enough to keep the animation inside the canvas. The six new toys use original code-authored SVG and canvas artwork.

## Verification

| Check | Current evidence |
|---|---|
| TypeScript, lint and shared models | Passed locally; 94 models include gestures, saved outfits, spinner direction, cube moves/inverses, solvable shuffles, saved puzzle progress, 200% bounds, cord attachment, rebound and full orbits |
| Editor source scenarios | Focused checks passed for outfits/taps/200% restart, all spinner designs with direct rotation and inertia, and all three playable puzzle boards with restart |
| Desktop source scenario | Thirteen models passed; expanded outfit/puzzle scenario pending |
| Installed packages and review | Pending final candidate build |
| Hosted editor/desktop jobs | Pending final candidate push |

The prior Phase 10 candidate passed all eight hosted jobs on `ae2b9c5`: [editor matrix](https://github.com/gautham-nvidia/charmlet/actions/runs/42326424192) and [desktop archives](https://github.com/gautham-nvidia/charmlet/actions/runs/42326424149). These are baseline results; the new candidate requires its own checks.

The pointer check caught the new wiggle being cancelled by `lostpointercapture` after a successful mouse release. That event now cancels only an interrupted active drag. The same real-editor pointer scenario failed before the fix and passed afterward; keyboard activation is also covered.

Source/artwork terms, the public/free/paid lineup, publisher and signing remain release decisions. Public website deployment and purchases remain deferred. Native macOS interaction and mixed-display validation remain separate from the automated archive checks.
