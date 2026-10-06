# Charmlet project log

Dates use YYYY-MM-DD; Git preserves exact timestamps and authors. Append dated entries for new work
and corrections rather than erasing history. Record the linked issue/PR, commit description, evidence
and next action. Current milestone status is summarized below; entries preserve how it changed.

## Milestones - updated 2026-10-06

| ID | Status | Scope / next gate | Tracking |
|---|---|---|---|
| P0 | Merged baseline; local and hosted checks passed | One-charm docked prototype, tests, development VSIX, docs and CI | [#3](https://github.com/gautham-nvidia/charmlet/issues/3), [PR #4](https://github.com/gautham-nvidia/charmlet/pull/4) |
| P1 | Accepted and merged in PR #7 | Size/cord controls, lifecycle/accessibility coverage, two Windows hosts and resource captures | [#2](https://github.com/gautham-nvidia/charmlet/issues/2), [validation](docs/phase-1-validation.md) |
| P2 | Merged in PR #10 | Four free charms, saved picker, artwork provenance and prepared trial checklist | [#9](https://github.com/gautham-nvidia/charmlet/issues/9) |
| P3 | Orbit, collection, messages and gallery implemented; remaining readiness gates open | Ten defaults, free pack import/gallery, 80 messages; cross-editor/OS/remote tests, identity, license and registries remain | [#11](https://github.com/gautham-nvidia/charmlet/issues/11), [#13](https://github.com/gautham-nvidia/charmlet/issues/13), [readiness](docs/phase-3-readiness.md) |
| F1 | Delivered in the charm view (0.3.1) | 80 optional coding messages below the charm, with Next and saved visibility/rotation | [#13](https://github.com/gautham-nvidia/charmlet/issues/13) |
| F2 | Deferred | Cosmetic-only paid packs and explicit celebration commands | Roadmap #1 |

## 2026-09-17 - Identity and personal repository

- User selected **Charmlet**, **Charmlet: Coding Charms**, and keywords `charms`, `hanging charm`,
  `coding companion`. Earlier names in PLAN.md are research history, not the selected identity.
- Created public `gautham-nvidia/charmlet` with an initial README on `main`, outside the NVIDIA org.
- Initial commit: [`c019fe4`](https://github.com/gautham-nvidia/charmlet/commit/c019fe4), **Initial commit**.
- Name choice is not trademark clearance or Marketplace publisher registration. No NVIDIA branding
  or endorsement is implied. Project source/art license remains undecided.

## 2026-09-17 - P0 implementation and verification

| Item | Record |
|---|---|
| Issue | [P0 #3](https://github.com/gautham-nvidia/charmlet/issues/3) |
| Branch | `feat/phase-0-prototype`, based on GitHub's existing `main` |
| Implementation | [`c02e440`](https://github.com/gautham-nvidia/charmlet/commit/c02e440) |
| Commit description | `feat: establish tested Phase 0 charm prototype (#3)` |
| Decision | Proceed with the supported docked-view prototype; no installation patching or native helper |

Delivered: original source-authored terminal-keycap SVG, Matter.js pendulum, nudge and drag/release,
pull-down parking, pull-up retraction, saved state, restore/reset/motion controls, keyboard alternatives,
local-resource CSP, status-bar commands and stopped animation when hidden or settled.

Evidence from the **Windows PC**, 2026-09-17:

| Check | Result |
|---|---|
| `npm --prefix extension test` | Type-check, lint, both bundles, **5 unit tests + 1 real-editor test passed** |
| Runtime host | VS Code **1.138.0**, isolated user profile, 1400x900 and 1000x650 window sizes |
| UI coverage | Asset loads; native right docking; click/swing, down-to-park, sideways release, hide/restore, up-to-retract, keyboard, reload persistence, reduced-motion switch, typing/focus and compact bounds |
| Hidden work | Animation frame counter remains unchanged while hidden; no quantitative CPU claim |
| `npm --prefix extension run package:vsix` | **11 files, about 41 KB**; tests/dependencies excluded; third-party notices included |
| API floor | Pinned `@types/vscode` to **1.90.0** to match manifest; compilation passed |
| Screenshots | [Right dock](docs/phase-0-right-dock.png); detailed test artifacts remain local/CI outputs |

Corrections found by the checks:

- Restore had kept the temporary shortened cord after an upward pull. Reveal now restores the saved
  parked length; the regression checks 216 px parking, retraction/restore and 236 px after keyboard input.
- The initial UI test raced editor startup and selected a fuzzy command match. It now waits for the
  loaded editor and uses exact command labels.
- `--disable-extensions` created a toast covering the toolbar; the isolated empty extensions directory
  already provides isolation, so that flag was removed.
- Pointer traces exposed other mouse input during scripted drags. The test window now ignores hardware
  mouse input; Playwright still exercises real pointer events. The gesture test passes without debug probes.
- The installed packager requires `--skip-license`, not `--allow-missing-license`. Packaging still checks
  secrets; this flag does not select a project license or authorize public registry publishing.

Not verified: VS Code 1.90 runtime, other OS/editors, remote/browser hosts, system-level reduced-motion
integration, quantitative CPU use and cancellation during all visibility transitions. Those stay in P1/P3;
successful Windows checks are not evidence for every fork.

## 2026-09-17 - Repository tracking and delivery workflow

- Root folder tracks the entire project, including PLAN.md and extension source. GitHub's original
  history is retained. The generator's empty nested Git metadata was moved to a temporary backup
  outside the repo, not deleted or committed as a submodule.
- Root ignore rules exclude node_modules, builds, UI-test artifacts, VSIX files and environment files.
- Repo-local commit email uses the verified personal GitHub noreply identity; global Git config is unchanged.
- README documents setup, demo, testing, packaging and the issue -> branch -> commit -> PR -> merge flow.
- CHANGELOG records user-facing changes; this log records evidence and decisions. Git/PR history supplies
  exact commit timestamps, full descriptions and merge relationships without self-referential commit hashes.
- CI runs build/unit/UI/package checks and keeps artifacts associated with the checked commit. It does not
  publish the extension. The PR checklist requires dated log updates and explicit untested requirements.
- Integration and remote CI results will be appended after the feature branch is pushed and merged.

## 2026-09-17 - Phase 0 delivered to main

| History | Description / evidence |
|---|---|
| [`c02e440`](https://github.com/gautham-nvidia/charmlet/commit/c02e440) | `feat: establish tested Phase 0 charm prototype (#3)` |
| [`0fa45e4`](https://github.com/gautham-nvidia/charmlet/commit/0fa45e4) | `docs: add dated project tracking and CI gates (#1, #3)` |
| [PR #4](https://github.com/gautham-nvidia/charmlet/pull/4) | `feat/phase-0-prototype` -> `main`, merged with both commits preserved |
| [`cf1e584`](https://github.com/gautham-nvidia/charmlet/commit/cf1e5848090f6959c14b780107dbe865834dd766) | `Merge PR #4: tested Phase 0 prototype and project traceability` |
| [CI run 35273596086](https://github.com/gautham-nvidia/charmlet/actions/runs/35273596086) | Hosted Windows build, tests and packaging succeeded at **2026-09-17T20:56:39Z**, before merge |

The earlier "integration pending" status is superseded by this record. Local main was fast-forwarded
to the GitHub merge. No force push, history rewrite, registry publication or company-organized repository.
Phase 0 acceptance is recorded in issue #3. Roadmap #1 stays open; the next work is the free-core
refinement in issue #2, not payment infrastructure or a native overlay.

This delivery record uses `docs/phase-0-delivery-record` and a separate PR so documentation follows
the same workflow as code. Its own date, commit description and merge are discoverable through the
file's Git history; it does not need to embed its own future commit hash. Retain merged branches for
inspection. CI artifacts expire after 14 days; the screenshot, tests, commit messages and project log
remain versioned in the repository.

## 2026-10-05 - Phase 1 free core

- Branch: `feat/phase-1-free-core`; tracking [P1 #2](https://github.com/gautham-nvidia/charmlet/issues/2).
- Development version: **0.0.2**. The previously uncommitted P1 work was resumed and retained.
- User confirmed the delivery rule: one branch per phase, merged into `main` before the next phase starts. P2 is not part of this change.
- Added saved size/cord controls, size-aware layout/physics, cancelled-drag recovery, visibility handling, focus improvements and reduced-motion interaction.
- Repaired the editor test for both Command Palette accessibility roles and moved its editing fixture into a temporary directory. This also removes the unrelated Git-discovery toast from the screenshots.

| Windows PC verification | Result |
|---|---|
| Type checking, lint and bundles | Passed |
| State/physics unit tests | 9 passed |
| VS Code 1.90.0 UI test | Full interaction test passed |
| VS Code 1.138.0 UI test | Full interaction test passed |
| Active / settled / hidden profiling | Raw captures checked and preserved; see the [validation record](docs/phase-1-validation.md) |
| Development VSIX | `extension/charmlet-0.0.2.vsix` built locally; registry publication remains separate |

The CI matrix runs build/unit/UI/package checks on both Windows hosts. Hosted results and the merge commit are recorded by the phase PR and issue #2; local evidence does not substitute for that gate. The source/art license and publisher decisions remain open, and nothing here publishes to a registry.

Human feedback on occupied dock width has been requested and is not yet recorded. Automated compact-layout, typing and focus checks passed. After P1 is merged and reviewed, the next implementation phase is the three-original free collection.

## 2026-10-05 - Phase 1 placement feedback

Gautham tried 0.0.2 and clarified that the interaction felt good, but the charm hung at the extreme right and lacked room to swing both ways. The screenshot showed a parked charm with the cord set to 320 px. This refinement centers the anchor within the panel while retaining saved size/cord values and the existing motion tuning.

Development version **0.0.3**, on the retained `feat/phase-1-free-core` branch brought forward from main. The new narrow-dock physics regression failed with the old anchor and passed with centering. Type/lint/build, ten unit tests and the complete UI test on Windows VS Code 1.90.0 and 1.138.0 passed. The UI also checks centered clearance after sizing/resizing and an explicit rightward nudge.

[Centered settings view](docs/phase-1-centered.png) and [compact view](docs/phase-1-centered-compact.png) preserve the follow-up appearance. Earlier 0.0.2 captures remain unchanged. PR/hosted-CI/merge evidence is tracked in issue #2. This is still Phase 1; Phase 2 has not started.

## 2026-10-05 - Full pull and circular-drag feedback

Gautham reported that a maximum downward pull returned halfway up on release, and a circular gesture could leave the charm off-screen. Source/probe evidence showed a fixed 320 px cap in both saved-state restoration and layout, plus a valid rapid corner-grab case that pushed the simulated body outside the view. That particular probe later recovered; it did not establish the duration of the user's stuck case.

Version **0.0.4** uses the available panel height for the visible cord limit, preserves finite requested lengths, bounds the simulated body after physics steps, and accounts for the grabbed offset. Release uses the final pointer coordinates: deliberate vertical pulls park at their new length, while sideways/circular gestures retain the previous preference. The 126 px default and motion constants are unchanged.

Type/lint/build and twelve unit tests passed, along with the full real-editor test on Windows VS Code 1.90.0 and 1.138.0. New UI cases check bottom parking and reload persistence, and complete circles in both directions that release capture, return in view and settle without refreshing. [Full pull](docs/phase-1-full-pull.png) and [recovered circle](docs/phase-1-circle-recovered.png) show the tested states. Earlier numerical resource captures remain dated 0.0.2 evidence; no new CPU or frame-rate claim is made.

This continues Phase 1 on its existing branch and PR #7. Hosted checks must cover the updated commit before merge. Phase 2 has not started.

## 2026-10-05 - Correction: pulls return to the resting position

The 0.0.4 bottom-parking behavior was the assistant's mistaken interpretation. Gautham clarified: settings define the desired size and cord length; pulling in the view must return to that original resting position on release.

Version **0.0.5** treats the drag length as temporary and eases the tether back over 350 ms without modifying the saved preference. Reduced motion returns immediately. Grabs, resize, hide and explicit settings changes cancel or complete the return safely. The centered anchor and drag-boundary safeguards remain. A dedicated view container is named **Charmlet**.

Type/lint/build, fourteen unit tests and the full UI test on Windows VS Code 1.90.0 and 1.138.0 passed. UI cases stretch from both a chosen 50 px rest length and the 126 px default, then verify the same length and position after release and reload. [Stretched](docs/phase-1-stretched-0.0.5.png) and [returned](docs/phase-1-returned-0.0.5.png) show the two states.

The meaning of the separate full-circle request is still being clarified. Circular input recovery is not a claim of a full 360-degree spin or orbit. This remains Phase 1 on PR #7; do not merge or start P2 until the remaining requested behavior is resolved.

## 2026-10-05 - Phase 1 accepted; Phase 2 started

Gautham accepted the 0.0.5 interaction and requested the next phase. This supersedes the earlier hold for full-circle clarification. PR #7 merged with merge commit 57e13249feb440b04b523169d9c18bc29d1ae240 after CI run 37389648535 passed on the reviewed head. Phase 1 issue #2 is closed. Optional full-circle exploration is tracked separately in issue #8 and is not implemented.

Local main was fast-forwarded to that merge before creating `feat/phase-2-free-collection`. Phase 2 is tracked in [#9](https://github.com/gautham-nvidia/charmlet/issues/9): three new original Silicon Pack designs alongside Terminal, an accessible picker, saved selection and a development trial package. Actual coworker distribution/feedback is not automated.

## 2026-10-05 - Phase 2 free collection implementation

On `feat/phase-2-free-collection`, development version **0.1.0** retains Terminal and adds original Chip, Wafer and Circuit SVGs. The settings picker saves selection, uses only catalogued local resources and preserves existing preferences. Both Reset paths keep the selected charm. Existing saved states fall back to Terminal without losing their layout/motion choices.

The 72x84 canvas and attachment point match the accepted renderer. The artwork and settings UI were reviewed from real-editor captures, preserved in [Phase 2 validation](docs/phase-2-validation.md). [ARTWORK.md](extension/ARTWORK.md) records provenance and the pending project license. A [trial checklist](docs/phase-2-trial.md) is prepared; no coworker outreach or feedback is recorded.

Windows PC verification: type/lint/build passed, **17 unit tests passed**, and the complete UI suite passed on **VS Code 1.90.0 and 1.138.0**. Coverage includes every asset, keyboard switching, reload, reset, hidden preferences and the Phase 1 interaction suite. Hosted checks and merge evidence will be recorded in the phase PR and issue #9.

Development VSIX: extension/charmlet-0.1.0.vsix built locally; all four charms and artwork provenance are included. Phase 3 and registry publication have not started.

## 2026-10-05 - Phase 3 compatibility kickoff

P2 merged in PR #10 as fa0b3168f025d7e1a8a9e733d83a0a331eeb8d34 before creating `feat/phase-3-readiness`. The owner requested full-circle work and release-readiness progress. Issue #11 tracks P3 and issue #8 tracks the still-unsettled spin-versus-orbit behavior.

The unchanged 0.1.0 app passed the complete Windows VS Code 1.140.0 UI suite. Host-specific artifact labels, disposable-profile verification and schema-2 runtime identity metadata were added to the harness. The Windows CI matrix now retains 1.90.0 and uses 1.140.0 as its recent target. This checkpoint does not add application features or change dependencies.

Cursor 3.20.21 and Devin Desktop (branded 3.10.48, package 1.126.0) were probed in disposable profiles. Both reached host startup/login screens before completing the suite. Devin's CLI-install option was explicitly unchecked before advancing Customize once. No login, credentials/profile reuse or editor patch was attempted. These are blocked verification outcomes, not proof of an extension defect.

[Phase 3 readiness](docs/phase-3-readiness.md) records the evidence and remaining gates. Broader OS/remote/browser tests, publisher/license decisions, registry publication and the exact full-circle implementation remain open.

## 2026-10-06 - Full-circle orbit

Gautham confirmed the requested motion: the charm and cord make a complete loop around the fixed top peg. Development version **0.2.0** provides stationary-peg orbit clearance, radial temporary dragging and bounded release recovery while preserving saved resting size/cord and charm selection.

The code and screenshots were reviewed. Type/lint/build and **19 unit tests passed**. Complete UI runs passed on **Windows VS Code 1.90.0 and 1.140.0**, with actual rendered angular travel exceeding a full turn in both directions, all four quadrants visited, fixed peg coordinates and every captured position within the view. Upper release recovered to the resting setting without refresh. Frozen captures and scope are in [full-circle validation](docs/full-circle-validation.md).

Package: extension/charmlet-0.2.0.vsix built locally. PR #12 will carry the reviewed feature and new hosted checks. Other P3 readiness gates remain open; no public registry release or next phase has started.

## 2026-10-06 - Ten-charms collection, messages, packs and gallery

Gautham required the companion webpage and additional downloads in the current work, with ten charms bundled by default. He then requested 50–100 rotating messages directly below the stage and above the controls. Development version **0.3.1** now includes ten grouped original SVGs, 80 original messages, compact Hanging and optional Orbit layouts, validated static-PNG pack import/removal, six free website extras and a dependency-free local gallery.

The implementation, artwork and screenshots were reviewed. Compile/type/lint passed; **27 unit tests** passed. Complete Windows UI suites passed on **VS Code 1.90.0 and 1.140.0**, including preference-versus-visible-fit behavior, compact pull/retract/restore, message position/rotation persistence, fixed-peg loops and real Probe Card import/reload/removal. The installed-Edge gallery check passed at 1440 px and 375×812 with real pack/VSIX downloads and no console/page errors. Frozen scope and evidence are in [Phase 3 gallery validation](docs/phase-3-gallery-validation.md).

The UI tests distinguish the saved Cord preference from the visible length that current space can fit. The gallery/import path is real and free; paid checkout is absent. Package: extension/charmlet-0.3.1.vsix rebuilt locally with current documentation. Hosted integration remains for the current Phase 3 PR. Other Phase 3 operating-system, authenticated-fork, remote/browser, publisher, license, listing and registry-publication gates remain open.
