# Phase 1 validation - 2026-10-05

Charmlet 0.0.2's free-core controls and interaction checks passed on the Windows PC with VS Code 1.90.0 and 1.138.0. This record covers local verification; the phase PR records hosted CI and merge evidence. Tracking: [P1 #2](https://github.com/gautham-nvidia/charmlet/issues/2).

## Coverage

| Check | Evidence |
|---|---|
| State and physics | Nine unit tests passed: restoration/migration, size bounds, layout, motion/settling, resizing and reduced-motion dragging |
| Real editor | One complete interaction test passed on each exact host version |
| Settings | Size 60-140%, cord controls, keyboard adjustment, reload persistence and preservation of requested cord length after shrinking/restoring the window |
| Interrupted drags | Pointer cancellation, lost capture, window blur, resizing and collapsing/reopening the dock |
| Accessibility | Keyboard hide/restore focus, settings Escape focus, emulated `prefers-reduced-motion`, and visible focus in Dark High Contrast |
| Editing | Keyboard typing and saving to a temporary file while the charm is visible; saved text verified from disk |
| Bounds | Windows sized to 1400x900, 1000x650 and 1000x500; largest charm checked in the compact case |
| Isolation | Temporary VS Code profile, empty extensions directory and temporary source file; no editing of the repository during the UI check |

Screenshots: [settings](phase-1/settings.png), [compact window](phase-1/compact.png), [high contrast](phase-1/high-contrast.png).

## Resource snapshots

These are short diagnostic captures from the isolated VS Code host, not an extension-only benchmark. Each interval is approximately two seconds. CPU values come from Electron's `getAppMetrics()` interval counters, and memory is the per-process working set in KB. The records include editor, GPU, utility and automation overhead. Shared memory pages can appear in more than one process; do not sum working sets as unique memory.

| VS Code | Electron | Active animation frames | Settled frames | Hidden frames | Raw capture |
|---|---|---|---|---|---|
| 1.90.0 | 29.4.0 | 122 | 0 | 0 | [JSON](phase-1/vscode-1.90.0-resources.json) |
| 1.138.0 | 42.10.0 | 122 | 0 | 0 | [JSON](phase-1/vscode-1.138.0-resources.json) |

Both active samples began and ended with the animation loop running. Both settled and hidden samples began and ended with it stopped, and their frame counters did not advance. This verifies loop shutdown in these samples; it does not establish zero total CPU use, isolate Charmlet's memory cost, or establish a cross-machine performance budget. Exact timestamps, intervals, process identities and before/after readings are retained in the JSON files.

The 1.90.0 capture was recorded at 2026-10-05T21:34:25.242Z; the 1.138.0 capture at 2026-10-05T21:33:19.176Z. These checked captures are preserved rather than regenerated for this report.

## Reproduce

**On the Windows PC (PowerShell), from the repository root:**

```powershell
$env:VSCODE_TEST_VERSION = '1.90.0'
npm.cmd --prefix extension test
$env:VSCODE_TEST_VERSION = '1.138.0'
npm.cmd --prefix extension run test:ui
Remove-Item Env:VSCODE_TEST_VERSION
```

`VSCODE_TEST_VERSION` selects a cached/downloaded exact host. Without it, the test uses the standard installed Windows VS Code executable, or `VSCODE_EXECUTABLE` when supplied. New run artifacts go to `extension/test-results/<version>/`; the dated captures above remain unchanged.

## Remaining review and limits

- Human feedback on the dock's occupied width has been requested and is not yet recorded. A supported dock continues to occupy editor layout space.
- Reduced motion was exercised through browser media emulation; the Windows accessibility settings themselves were not changed. No screen-reader usability claim is made.
- macOS/Linux, Cursor/Devin Desktop, Remote-SSH/WSL and browser hosts remain future compatibility work.
- This is a development package. Publisher identity, project license and registry publication remain separate release decisions.

## 0.0.3 follow-up - balanced swing room

The dock-placement feedback listed above was received: the right-edge hanging point left unequal room for left/right swings. Version 0.0.3 centers the anchor and preserves the chosen cord length and size. The earlier pending-feedback statement describes the 0.0.2 checkpoint.

A new narrow-dock physics regression failed on the previous anchor and passed after centering. The full local gate now passes ten unit tests, plus the complete real-editor test on both Windows VS Code 1.90.0 and 1.138.0. The UI asserts balanced clearance at default size, maximum size and compact height and verifies a rightward nudge in addition to the existing click/drag checks.

[Centered controls](phase-1-centered.png) and [compact placement](phase-1-centered-compact.png) show the result. The numerical resource table above remains the original, dated 0.0.2 capture; no new CPU or smoothness claim is inferred from this placement fix.

## 2026-10-05 - Full pull and circular-drag feedback

Gautham reported that a maximum downward pull returned halfway up on release, and a circular gesture could leave the charm off-screen. Source/probe evidence showed a fixed 320 px cap in both saved-state restoration and layout, plus a valid rapid corner-grab case that pushed the simulated body outside the view. That particular probe later recovered; it did not establish the duration of the user's stuck case.

Version **0.0.4** uses the available panel height for the visible cord limit, preserves finite requested lengths, bounds the simulated body after physics steps, and accounts for the grabbed offset. Release uses the final pointer coordinates: deliberate vertical pulls park at their new length, while sideways/circular gestures retain the previous preference. The 126 px default and motion constants are unchanged.

Type/lint/build and twelve unit tests passed, along with the full real-editor test on Windows VS Code 1.90.0 and 1.138.0. New UI cases check bottom parking and reload persistence, and complete circles in both directions that release capture, return in view and settle without refreshing. [Full pull](phase-1-full-pull.png) and [recovered circle](phase-1-circle-recovered.png) show the tested states. Earlier numerical resource captures remain dated 0.0.2 evidence; no new CPU or frame-rate claim is made.

This continues Phase 1 on its existing branch and PR #7. Hosted checks must cover the updated commit before merge. Phase 2 has not started.

## 2026-10-05 - Correction: pulls return to the resting position

The 0.0.4 bottom-parking behavior was the assistant's mistaken interpretation. Gautham clarified: settings define the desired size and cord length; pulling in the view must return to that original resting position on release.

Version **0.0.5** treats the drag length as temporary and eases the tether back over 350 ms without modifying the saved preference. Reduced motion returns immediately. Grabs, resize, hide and explicit settings changes cancel or complete the return safely. The centered anchor and drag-boundary safeguards remain. A dedicated view container is named **Charmlet**.

Type/lint/build, fourteen unit tests and the full UI test on Windows VS Code 1.90.0 and 1.138.0 passed. UI cases stretch from both a chosen 50 px rest length and the 126 px default, then verify the same length and position after release and reload. [Stretched](phase-1-stretched-0.0.5.png) and [returned](phase-1-returned-0.0.5.png) show the two states.

The meaning of the separate full-circle request is still being clarified. Circular input recovery is not a claim of a full 360-degree spin or orbit. This remains Phase 1 on PR #7; do not merge or start P2 until the remaining requested behavior is resolved.
