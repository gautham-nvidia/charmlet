# Charmlet project log

Dates use YYYY-MM-DD; Git preserves exact timestamps and authors. Append dated entries for new work
and corrections rather than erasing history. Record the linked issue/PR, commit description, evidence
and next action. Current milestone status is summarized below; entries preserve how it changed.

## Milestones - updated 2026-10-08

| ID | Status | Scope / next gate | Tracking |
|---|---|---|---|
| P0 | Merged baseline; local and hosted checks passed | One-charm docked prototype, tests, development VSIX, docs and CI | [#3](https://github.com/gautham-nvidia/charmlet/issues/3), [PR #4](https://github.com/gautham-nvidia/charmlet/pull/4) |
| P1 | Accepted and merged in PR #7 | Size/cord controls, lifecycle/accessibility coverage, two Windows hosts and resource captures | [#2](https://github.com/gautham-nvidia/charmlet/issues/2), [validation](docs/phase-1-validation.md) |
| P2 | Merged in PR #10 | Four free charms, saved picker, artwork provenance and prepared trial checklist | [#9](https://github.com/gautham-nvidia/charmlet/issues/9) |
| P3 | Engineering baseline merged in PR15/16; launch gates carried forward | Windows/Ubuntu/macOS Apple Silicon VS Code matrix verified; publisher/license, authenticated forks, remote/browser and public hosting/registry decisions move to P4/P5 | [#11](https://github.com/gautham-nvidia/charmlet/issues/11), [#18](https://github.com/gautham-nvidia/charmlet/issues/18), [readiness](docs/phase-3-readiness.md) |
| P4 | Started: scope/architecture kickoff; features pending | Free focus/learning/reminders/garden, original collections, website Photo Studio preparation and parallel desktop beta | [#17](https://github.com/gautham-nvidia/charmlet/issues/17), [plan](docs/phase-4-plan.md) |
| P5 | Planned: extension-store launch | Publisher/license decisions, launch-target editor checks, public install pages and Marketplace/Open VSX availability | [#18](https://github.com/gautham-nvidia/charmlet/issues/18) |
| P6 | Planned: product launch after IDE availability | Broader launch, support/onboarding and ready commerce/desktop offerings | [Phase 4 plan](docs/phase-4-plan.md) |
| P7+ | Deferred integrations/licensed art | Additional IDE families, rights-cleared fandom/brand collaborations and later experiments | [Phase 4 plan](docs/phase-4-plan.md) |
| F1 | Delivered in the charm view (0.3.1) | 80 optional coding messages below the charm, with Next and saved visibility/rotation | [#13](https://github.com/gautham-nvidia/charmlet/issues/13) |
| F2 | Replanned into P4/P6 | Optional original art and paid Photo Studio; free core, productivity and importer remain | [#17](https://github.com/gautham-nvidia/charmlet/issues/17), [#18](https://github.com/gautham-nvidia/charmlet/issues/18) |

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

## 2026-10-06 - Version 0.3.2 release preparation

Gautham asked for clear manual-versus-store installation, a responsible paid-pack buying proposal and collection ideas, and progression only when Phase 3 is ready. Phase 3 is not ready to close: publisher ownership, source/art licenses, public hosting/listing approval, authenticated-fork checks and remaining compatibility evidence are still owner/review gates.

Version **0.3.2** prepares an original 256×256 Marketplace icon, manual VSIX versus future store guidance, strict nullable identity-matching store URL configuration, portable macOS/Windows/Linux test shortcuts, Linux isolated-CI launch flags, and a six-job Windows/Ubuntu 24.04/macOS 15 workflow for both supported VS Code versions. The matrix is prepared, not evidence of Linux/macOS support until its hosted results are reviewed. Application behavior, ten defaults, 80 messages and the six frozen free packs remain unchanged.

The [paid artwork plan](docs/paid-artwork-plan.md) recommends provider-hosted one-time digital delivery as a proposal and records original theme/rights boundaries. No account, product, price, Buy control, checkout, public deployment, license choice, registry listing or next phase was created.

Local Windows verification passed: marketplace icon export/PNG dimensions, compile/type/lint, **27 units**, the complete VS Code 1.140.0 UI suite, package, gallery build and extended installed-Edge website check. The website check covered manual installation copy, null store state, direct URL validation and synthetic matching-link rendering without navigation. Package: `extension/charmlet-0.3.2.vsix` built locally. The prepared six-job hosted matrix remains unverified until owner review.

## 2026-10-07 - Serialized and confirmed preference writes

Run 37542781796 at d241c79 passed Linux 1.90.0, Linux 1.140.0 and Windows 1.90.0. Windows 1.140.0 failed startup command discovery; macOS 1.90.0 failed the native Home picker assumption; macOS 1.140.0 failed an obsolete visible-fit 146/121 equality.

Run 37657649462 at 91c5b21 passed both Windows jobs, both Linux jobs and macOS 1.140.0. Only macOS 1.90.0 failed: Lemon & Chilies was selected and acknowledged before reload, then Terminal restored. VS Code 1.90 source exposes asynchronous whole-map storage echo/update behavior, and upstream #171827 reports update/get mismatches. Whether that explains this particular failure remains unconfirmed. Serial writes plus readback confirmation avoid acknowledging an unverified value.

Three focused unit tests cover write order/flush, stale readback rejection and recovery after a rejected write. Snapshot copies, revision acknowledgements, save-error handling and deactivate flushing remain. No retry, arbitrary delay, storage clear or file migration was added.

Local Windows compile/type/lint, **30 unit tests**, the complete VS Code 1.140.0 UI suite, package and gallery build passed. The live gallery candidate download matched the rebuilt source VSIX bytes. Hosted minimum-macOS verification remains the deciding evidence; do not claim the macOS 1.90 failure fixed until that rerun passes.

## 2026-10-07 - Six-job desktop VS Code matrix passed

GitHub Actions run [37663692698](https://github.com/gautham-nvidia/charmlet/actions/runs/37663692698) at feature head `637f1e8751262a0293d4eaec5a6321c5d49b687b` and PR merge ref `3b46d03321956b66afb527bd39d855a95dc3fae0` passed all six jobs: Windows Server 2025, Ubuntu 24.04 x64/Xvfb and macOS 15 Apple Silicon, each on VS Code 1.90.0 and 1.140.0.

Every job passed 30 unit tests, the complete UI scenario, VSIX packaging and static-gallery build. The lead downloaded all six evidence archives, verified actual host/platform identities, and checked 96 rendered samples per direction, more than 360 degrees in each direction, all four quadrants, fixed peg coordinates, in-view bounds, and zero settled/hidden frame deltas. Frozen values and job IDs are in `docs/phase-3-platforms.json`; no cross-platform CPU or battery comparison is claimed.

The minimum-macOS persistence case passes with ordered confirmed state writes. Actual macOS geometry constrained the requested 1400×900 window to 1400×684 with a 1024×684 work area, and native typeahead is used instead of unsupported Home/End select behavior. The exact cause of every earlier failure remains unproven.

Phase 3 remains open for publisher ownership, source/art licenses, authenticated Cursor/Devin decisions, Remote-SSH/WSL/browser scope, public hosting, registry listings and publication approval. Intel Mac and Windows ARM remain unverified. Focus-timer and standalone-app directions remain proposals.

## 2026-10-07 - Intermittent persistence trace instrumentation

The all-six pass from run 37663692698 remains factual. A later documentation-only head `a7d3b98` in run `37666186391` passed five jobs but repeated the macOS 1.140 selected-charm reload failure: Lemon & Chilies was selected before reload and Terminal restored at the existing assertion. Product source was identical, so the intermittent issue remains unresolved; the earlier pass is not treated as proof of reliability.

Opt-in tracing is limited to Development mode with `CHARMLET_TRACE_SAVES=1`. The host records timestamps, flat charm IDs, revisions, view generations and save/readback/lifecycle labels. The disposable UI test records picker/stage values and relevant DOM/host-message events, writes a preference transcript, and copies only its own editor logs after application shutdown so deactivate drain logs are present. Ordinary installed mode emits no trace. No explicit delays/retries or state-behavior changes.

Local diagnostic verification passed: compile/type/lint, the complete VS Code 1.140.0 UI suite, package and gallery build. The disposable run wrote `preference-events.json` with 53 records and copied 43 editor-log files after shutdown. The copied local logs contained zero `[Charmlet state]` prefix records; this is a trace-presence count only, not a causal interpretation. The live VSIX download matched the rebuilt 81450-byte candidate. The hosted trace rerun remains the deciding evidence, and the lead owns transcript interpretation.

A dedicated fresh-profile smoke then verified host-log delivery through the Development-only `Charmlet State Trace` LogOutputChannel. The copied output-channel log contained 13 trace records and the required `restored`, `write-start`, `write-returned`, `readback` and `save-ack` labels. This proves diagnostic delivery only; it does not explain the intermittent failure. Compile/type/lint, package and gallery build passed, and the live download matched the rebuilt 81503-byte candidate. No full UI or unit suite was repeated for this channel-only adjustment.

## 2026-10-07 - Canonical extension-owned preference file

Frozen run 37693710452 at head 6539276 captured the failure on both macOS hosts. Each transcript shows the final Lemon & Chilies save received, read back and acknowledged; the DOM remained Lemon with `persisted=true` before reload; no later Terminal save appeared; and the new host initialized from Terminal. This confirms a failure at the store/restore boundary in those runs, not every internal VS Code storage operation.

`preferences.json` under Charmlet's extension-owned global-storage directory is now authoritative. Existing `globalState` is read only as a migration fallback when the file is missing or unreadable and is never cleared. New preferences use serialized complete same-directory file replacement, then read back the actual file before saved acknowledgement. No retry, delay, storage reset, cross-window synchronization claim or sudden-power-loss guarantee was added.

Four focused file-store tests and existing writer tests cover migration, file precedence, complete rapid writes after reopening, unreadable JSON fallback, write failure recovery and confirmation. Local compile/type/lint, **34 unit tests**, the complete Windows VS Code 1.140.0 UI suite, package and gallery build passed.

The exact lead-authored two-launch smoke used one fresh disposable profile, selected and confirmed Lemon & Chilies, closed the first process, launched a second process with a different PID, and restored the equal canonical file with a `restored` trace whose source was `file`. This proves local full-process file restoration, not cross-platform stability. Package and gallery build passed; the live download matched the rebuilt 82158-byte candidate with SHA256 `AC7890B393F8D1E0CA8E61F1C0D2CC68DC2D03CB22AAFBCF6C1C25F234CF1CD6`. Hosted cross-platform evidence is still required before declaring the intermittent macOS case resolved.

## 2026-10-07 - Canonical preference file passed the six-job gate

GitHub Actions run [37697185841](https://github.com/gautham-nvidia/charmlet/actions/runs/37697185841) at head `1c39afdc81ba415e5a99c8f698535463c771084c` passed all six Windows Server 2025, Ubuntu 24.04 x64/Xvfb and macOS 15 Apple Silicon jobs on VS Code 1.90.0 and 1.140.0. Every job passed 34 units, complete UI, VSIX package and gallery build.

The lead checked both macOS traces. In each, final canonical-file readback was Lemon & Chilies, revision 14 was acknowledged, the pre-reload DOM remained Lemon with `persisted=true`, the new host restored Lemon with `source=file`, and the post-reload UI remained Lemon without an intervening save. Frozen reviewed evidence is `docs/phase-3-preferences.json`. The exact internal cause of earlier VS Code cache behavior is not asserted.

The local distinct-PID two-process restart and the hosted macOS paths now validate the canonical file boundary on the listed hosts. Phase 3 remains open for publisher ownership, source/art licenses, authenticated forks, remote/browser scope, public hosting, registry listings and publication approval. Intel Mac, Windows ARM, focus timer and standalone desktop app remain separate unverified/proposed scopes.

## 2026-10-08 - Linux resize-settling harness gate

Documentation-head run 37799712752 at `e07d1b41996a9c4c3dc6067e81d6c0825c8b3e6c` passed both Windows jobs, both macOS jobs and Linux 1.90.0. Linux 1.140.0 job `113388357201` passed all 34 unit tests and the canonical preference-file case, then failed in the collapse-during-drag setup: `beginDrag` at line 103, called from line 493, expected `Held` and received `Parked`.

The preceding resize-during-drag step requested restoration to 1400×900 but asserted only a cord value already present in the 1000×650 view. Because product `resize()` deliberately cancels active drag, an unfinished OS/webview resize can cancel the next gesture. This establishes a test synchronization gap in the observed path; it does not prove every possible `Parked` result has that cause and does not establish a Linux product incompatibility or preference regression.

The harness now captures the actual expanded browser/stage geometry, waits for both geometries to return after restoration, and crosses a two-animation-frame barrier so ResizeObserver delivery settles before the next pointerdown. It does not hardcode 900 px, retry the gesture, sleep, force `Held`, disable cancellation, or change production code/assertion caps. Local check-types and lint passed; hosted rerun remains the evidence gate.

## 2026-10-08 - Post-merge reload-discovery follow-up

PR #15 merged at `246d387` after all six jobs passed in run `37825599786`. Automatic main run `37826370809` passed five jobs; the first macOS 1.140 attempt reached pack-import evidence and exceeded the 300000 ms aggregate scenario budget. A scoped retry request produced a second attempt whose macOS job `113485495705` failed with `locator.isVisible: Frame was detached` in `readyFrame` after the size/cord reload.

The retained P3 branch was fast-forwarded from main for this test-only follow-up. Frame discovery now skips only expected detached-frame transitions, preserves other errors, and excludes every pre-reload frame when reacquiring the charm. Eight duplicated reload blocks and the initial scan use shared helpers. The combined scenario budget is explicitly 420000 ms (seven minutes) inside the unchanged 15-minute CI job; individual assertion, typing, gesture, resource and performance limits remain.

Local Windows type checking, lint and the complete VS Code 1.140.0 suite passed (`1 passed (3.3m)`). Production code and the accepted 82231-byte 0.3.2 VSIX are unchanged. Hosted follow-up verification remains pending; this does not reopen the verified preference-file boundary or start another phase.

## 2026-10-08 - Phase 4 companion kickoff

The owner explicitly authorized Phase 4 on `feat/phase-4-companion`, based on clean merged main `e60749e066d8dbbe911d45929cd47d5960f1186e`. This supersedes the earlier assistant recommendation that public registry publication must precede Phase 4. Launch/store gates are carried into Phase 5 rather than waived.

The authoritative [Focus, Learn and Grow plan](docs/phase-4-plan.md) scopes free focus, learning, reminders, garden rewards, expanded original free collections, website Photo Studio preparation and a parallel Windows/macOS desktop beta. The [collection brief](docs/phase-4-original-collections.md) defines a 60-design website target and 12-flower garden target; these are planned targets, not assets that currently exist.

Phase 5 tracks extension-store launch and outstanding publisher/license/launch-target decisions in issue #18. Phase 6 is the broader product launch; Phase 7+ holds later IDE integrations and rights-dependent licensed art. The owner-approved paid Photo Studio is a website exception to the earlier free-creator recommendation; free core, productivity, reminders, garden, importer and ten defaults remain free. Pricing remains a proposal, and no checkout, merchant account, public deployment, feature implementation, publication or next-phase completion occurred in this kickoff.

## 2026-10-08 - Phase 4A Focus and Learn candidate

Development version **0.4.0** implements the first Phase 4 slice: persisted focus/break sessions and a saved sourced-learning feed. Focus provides 25/5 and 50/10 presets, bounded custom durations, optional one-line intent, pause/resume/stop, deadline-based reload recovery, a compact peg ring and status-bar/command access. Learn provides 60 sourced facts, 30 sourced trivia questions and the existing 80 optional encouragement messages, with saved feed/card/reveal state and source opening restricted to trusted catalogue IDs.

The host owns the once-per-second timer snapshots while active; countdown ticks do not write to disk or resize/cancel a charm drag. User actions use a separate confirmed `companion.json` request/ack path. The renderer has no countdown interval/RAF loop, pauses five-minute card rotation for drawer/reveal/hover/focus/pending activity, keeps focus announcements stable between phase changes and preserves the existing charm preference/physics/import behavior.

Local Windows verification passed: compile/type/lint/bundles, **47 unit tests**, and both VS Code 1.140.0 real-editor suites (`2 passed (3.5m)`). The focused suite verified elapsed-away recovery, confirmed start/pause/reload/resume/stop, exact paused remainder, saved trivia/feed identity, answer/source display, encouragement migration and command opening. Evidence includes `phase-4-focus.png` and `phase-4-learning.png` under the focused test result.

Packaging produced `extension/charmlet-0.4.0.vsix`, 103555 bytes, SHA256 `6328B45FCCFEF0D5AB3D6DF13420044CFEBC6221C9880840CD4A20ABAA8D5E21`. Gallery build reported ten included/six extras; installed-Edge website checks passed at desktop/mobile sizes with matching 103555-byte download and no console/page errors.

Garden, reminders, expanded art targets, paid Photo Studio and desktop beta remain pending later Phase 4 slices. This candidate is unpublished; no account, checkout, public deployment, merchant action, store listing or next phase occurred.

## 2026-10-08 - Phase 4A consolidated review fixes

Lead review confirmed that once-per-second focus snapshots repeatedly restarted the five-minute card timer, starving eligible automatic rotation. `MessageRotation.setEnabled` now preserves an existing eligible timer while retaining `update` as the explicit manual-reset contract. Companion user actions stop rotation before posting and confirmed results restart a fresh period. A deterministic heartbeat unit covers the full five-minute interval.

Heartbeat snapshots now preserve unchanged learning-card text nodes, selection and assistive reading. Focus form validation rejects non-integer/out-of-range minutes inline; Tab navigation inside the panel does not trigger a save that disables the next field. Focus/Learn tabs wrap correctly, explicitly opened tabs receive focus, known controller errors retain `data-companion-persisted=error`, and facts/trivia use normal four-line text with the compact two-line cap.

Host lifecycle now stops companion ticks before the final provider drain. Ready delivery owns only the current view, clears only the pending tab included in that delivery and forwards a newer open request that arrived while posting. Companion action errors preserve the controller's newer-schema message. The lead-authored forward-schema guard prevents 0.4.0 from overwriting a newer companion file; its targeted test passed before this batch.

Narrow Windows verification passed: compile/type/lint/bundles; compile-tests; three focused message-rotation cases; and the focused VS Code 1.140.0 companion UI test (`1 passed (19.5s)`). The unchanged full 47-unit and baseline UI suites were intentionally not rerun; the next full gate is expected to contain 49 units, but no complete 49-unit pass is claimed yet.

The rebuilt candidate `extension/charmlet-0.4.0.vsix` is 103995 bytes, SHA256 `80F00AFE684EC48818D32CC8E67762DBA403B1A03F1CB4B6F5BB555A5D0A6644`. Gallery and installed-Edge checks passed with a matching 103995-byte download, no overflow and no console/page errors. Hosted 0.4.0 evidence remains pending.

## 2026-10-08 - Phase 4B Garden and Gentle Reminders candidate

Development version **0.4.1** adds the free local garden and optional quiet care reminders. One garden-wide host-local-day allowance survives reload, bloom and planting another seed; missed days pause; a planted species cannot reroll; the eleventh confirmed watering awards once before the UI acknowledges it. Twelve original flowers become picker entries only after they are earned, and hanging a reward is an explicit confirmed action.

Water and stand/move reminders are disabled by default, bounded to 15–180 minutes and keep at most one pending cue per kind. Focus deferral, Done, ten-minute Snooze and Skip are stored in schema-2 `companion.json`. A cue appears only inside the drawer, with a fixed-size toolbar badge and status-bar nudge while closed—no popup, sound, focus steal, backlog counter or outside row that can resize/cancel a charm drag.

The companion host loads garden state before the final charm restoration, refreshes only when owned IDs change and derives every garden file from the trusted flower catalogue. Host crypto supplies seed IDs/species choice. Version-1 Focus/Learn state migrates to schema 2; the newer-schema overwrite guard remains. Sixteen original 72×84 SVGs were added: four unrevealed growth stages and twelve distinct reward flowers, with provenance in `extension/ARTWORK.md`.

Phase 4A hosted run 37860624048 passed Windows/Linux; macOS failures were exact rendered-versus-resting test-contract mismatches while Focus/settings controls were open. Tests now check the real stored preference/slider while controls are open, close the controls, then retain the exact rendered-cord assertion. No saved-preference regression was established, and macOS 0.4.1 is not claimed before the next hosted gate.

Local Windows verification passed: compile/type/lint/bundles, **58 unit tests**, and both focused VS Code 1.140.0 companion UI scenarios (`2 passed (34.0s)`). The Garden/Care case verified cue Snooze/Done/disable timing, 10→11 bloom, picker refresh, explicit hang, SVG width, reload persistence, retained collection and same-day protection after planting another seed. The unchanged three-minute baseline UI was intentionally not rerun locally.

Packaging produced `extension/charmlet-0.4.1.vsix`, 120880 bytes, SHA256 `B5C99D7E3B5867CFA890F30CC46A33A4A2F0A819412B22A18BA8571C3110993F`. Gallery build retained ten bundled/six website extras; installed-Edge checks passed with a matching 120880-byte download and no overflow or console/page errors. Evidence includes `phase-4-care.png`, `phase-4-garden.png` and the 12-flower atlas under ignored test results.

Expanded website collections, paid Photo Studio and desktop beta remain pending. The candidate is unpublished; hosted 0.4.1 verification remains required.

## 2026-10-08 - Phase 4B finishing review

Collection flower buttons now perform explicit confirmed **Hang** actions; they no longer replace the main Garden preview. The main art/status/progress always describe the current seed/plant, including after an owned flower is hung. Disabling a reminder succeeds even when its draft interval is invalid by restoring the saved interval and sending the disabled state.

A failed earned-catalogue refresh now latches that exact collection key and reports once instead of retrying on every focus heartbeat. Manual Hang/import/reload remain recovery paths; no automatic retry loop was added. Bluebell's three closed berry-like shapes were replaced with the lead-specified curved branches and three small flared hanging cups; no other flower was redrawn.

The Garden UI regression now clears the water interval before disabling it, then plants the next seed, confirms the main preview remains `garden-seed.svg`, hangs Hibiscus from its collection button and confirms the seed preview/daily water block remain unchanged. Narrow Windows checks passed: compile/type/lint/bundles and the Garden/Care VS Code 1.140.0 case (`1 passed (13.8s)`). The accepted 58-unit/two-focused-UI evidence was not rerun.

The finishing candidate `extension/charmlet-0.4.1.vsix` is 120883 bytes, SHA256 `F5955540C4B4EF110DEFBC3AFA525F2FD9C57B48324AC148F798D9D2FEAB5279`. Gallery and installed-Edge checks passed with a matching 120883-byte download and no errors. The refreshed twelve-flower atlas is 76592 bytes, SHA256 `EE2ABC64BBB42DAE419519F2A146BEE1F321019E5253EAB989D7FF2B64A1EE43`. No saved-preference regression was established by the earlier macOS run; hosted 0.4.1 remains the deciding gate.

## 2026-10-08 - Phase 4C sixty free extras and live demo

The website catalogue now contains the exact reviewed sixty-record manifest: 18 Compute & Silicon, 12 Test Bench, 14 AI & Code and 16 Places & Nature. The original six retain their IDs, metadata, SVGs and pack bytes; all twelve authoritative old-file hash comparisons passed. Fifty-four new original 72×84 SVGs and validated static-PNG packs were added without changing the ten bundled defaults or earned garden flowers.

A checked-in trusted one-time generator records the 54 reviewed motifs. The exporter now refuses missing, duplicate or unknown IDs and the first invocation explicitly selected only those 54, preventing accidental re-export of the accepted six. Ordinary builds enforce 60 extras/70 total unique IDs, exact collection counts, matching source filenames and all existing pack parser/PNG constraints; they do not rerender artwork.

The hero now runs a bounded live swing/pull/reset preview using the existing Pendulum/getLayout/Matter implementation and verified physical-scale bridge. Preview buttons accept only same-origin local asset paths. Animation stops when settled, offscreen, hidden or reduced-motion, with no idle-loop, CPU/battery or fake-IDE claim.

Installed-Edge verification passed all sixty production-lazy/test-eager image decodes, all sixty pack parses during build, four filter counts, search/reset, one old and one new real pack download, source/download VSIX equality, swing/drag-return/reset/offscreen/reduced-motion demo behavior, desktop/mobile overflow and zero browser errors. The website still serves the accepted byte-identical 120883-byte 0.4.1 VSIX (`F5955540C4B4EF110DEFBC3AFA525F2FD9C57B48324AC148F798D9D2FEAB5279`).

Review evidence under `extension/test-results/website-check-0.4.1/` includes desktop/mobile pages, `live-demo.png`, and labelled light/dark contact sheets for all 54 new designs. Photo Studio, paid controls, desktop beta, public hosting and later Phase 4 slices remain absent.

## 2026-10-08 - Phase 4C finishing review

A real pointer click on the demo charm now records a ≤3 px tap and nudges once; Enter/Space use the synthetic click path without a duplicate impulse. One clear/reset path releases capture and the Matter pointer before reset, resize, new preview selection, blur, hidden/offscreen or reduced-motion settlement. Ordinary drags still animate back to cord 126.

Preview is available for both included and extra designs. The browser check now covers physical-click horizontal movement, keyboard activation, drag/return, resize while held followed by a new drag, pointercancel followed by another click, reset/offscreen capture release, reduced motion and included Evil Eye plus extra GPU Tile selection. The implementation-detail hint was replaced with user-facing swing/pull copy.

Phase 4C website provenance moved from packaged `extension/ARTWORK.md` into `website/ARTWORK.md`, keeping extension source consistent with the unchanged accepted VSIX. Root/website docs now describe locked build dependencies, current evidence paths and the implemented sixty-design catalogue rather than planned expansion.

Eight compact transparent-art contact sheets—light/dark for each collection—and one cropped hero screenshot replace the long gallery sheets. They show only the 54 new designs: 15 Compute & Silicon, 11 Test Bench, 14 AI & Code and 14 Places & Nature. All eight use the requested five columns and at most three rows.

Final website build/check passed all prior inventory, image, pack, download, overflow and URL assertions plus the extended demo lifecycle with zero errors. Original-six hashes and the accepted 120883-byte 0.4.1 VSIX remained unchanged. No generator, artwork, pack export, extension test/build/package or future feature ran in this finishing batch.

## 2026-10-08 - Phase 4C final art and tap correction

Embedding Stars' constellation connector explicitly uses `fill="none"` in both the checked-in SVG and trusted generator, preserving the coloured stars/nodes instead of drawing an unintended solid polygon. Only `embedding-stars` was re-exported; its final SVG SHA256 is `F1B40246880ACA21E4B11426F5AB9C7B5C29EB352632C8B4A7A55243AD5F11B3`, and pack SHA256 is `49A5D7BAFA33B5FBA3129729DF0B15128D5152066FCF44ACA8893A0A5719AAE8`. No other pack was exported.

Pointer release now always clears capture/constraint and restores preferred cord before optionally nudging an unmoved normal-motion tap. A ≤3 px reduced-motion jitter returns immediately to cord 126/resting position without running; the same normal-motion jitter settles to 126 within the existing 20-second guard. Website build/check passed the expanded coverage and regenerated only the AI & Code light/dark sheets and cropped hero evidence. All sixty catalogue checks, original-six hashes and accepted VSIX identity remain valid.

## 2026-10-08 - Phase 4E standalone desktop developer beta

Core 0.4.1 hosted run 37865298216 at `afd000b` passed all six Windows/Linux/macOS jobs; lead-reviewed Linux and macOS 1.140 logs show 58 units and three editor UI scenarios. Phase 4E adds a separate unpublished Electron 0.1.0 developer beta without changing extension runtime, dependencies or the accepted VSIX.

The desktop package pins Electron 44.7.0 and `@electron/packager` 20.3.0 locally. One frameless transparent always-on-top window reuses the extension's renderer, Pendulum, controller, garden catalogue, validated pack parser and confirmed JSON writers through a context-isolated sandboxed preload. A strict `charmlet:` resource map, CSP nonce, denied navigation/window creation, trusted-card source lookup and whitelisted sender-checked IPC keep Node/filesystem APIs out of the renderer.

The app owns its profile (`preferences.json`, `companion.json`, `packs/`, `window/preferences.json`), restores earned flowers before the active charm, serializes writes before acknowledgements, drains on Quit, pauses a running focus on public suspend/lock events without auto-resume, and keeps desktop/IDE progress independent. One floating window supplies header, tray/menu controls and validated pass-through configuration; no global hotkey, autostart, telemetry, updater, account or remote content was added.

The exact lead placement model passed all five cases: primary top-right, retained negative monitor coordinates, disconnected-monitor recovery, partial-overlap clamp and malformed/small-screen bounds. The exact power stub passed once-only pause. Owned Windows Electron smoke passed isolated-profile/restart persistence, paused remainder, earned Hibiscus, Focus resume/pause/stop, trivia reveal, explicit keyboard focus, hide/show retention, bounded placement, restricted hit-test state, and security flags (`nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`, `webSecurity=true`). Renderer `require` and `process` are absent.

Unsigned Windows packaging produced `desktop/release/Charmlet-win32-x64/`: 116 files, 385948424 bytes total; `Charmlet.exe` is 246302208 bytes, SHA256 `16139C7C7C6BE93668C107FB65C6DB3ED3F53BFDBB3B39E1E8680FB3DC9CE1DF`. Evidence: `desktop-focus.png` 102793 bytes/SHA256 `23583F9ACF708EC9AE2A78C18A3AE67BA6A43961D66F40662D856DF215BBB025`; `desktop-garden.png` 112914 bytes/SHA256 `791CE7256AB04DB46E8A3EE4D03F089F5A4E69C7F2B3FD09D33F0A3D13A04D0D`.

Automated CDP evidence proves the restricted IPC and BrowserWindow ignored-state configuration, not native clicks passing through another app. Real native pass-through/no-focus-steal, tray behavior, mixed-DPI/monitor changes, suspend/lock, macOS Spaces/build, signing/notarization and distribution remain manual or hosted gates. No macOS pass, signing, installer or public-release claim is made.

## 2026-10-08 - Phase 4E finishing review

Native show/hide events now centrally send renderer visibility and a fresh companion snapshot whenever the window returns, including already-visible explicit controls. Reload increments a main-frame generation, clears renderer readiness and drops stale ready/save/action replies; sender validation also requires the current main frame. The hidden-running test emits only the owned app's `powerMonitor` suspend event, confirms persisted pause, calls actual `showInactive()` without injecting visibility, and immediately sees the current Paused state/remainder.

The pass-through stage is now truly transparent (`#app`/`#stage` computed rgba 0,0,0,0); readable surfaces remain on header/cards/tools/drawers/readout with dark color scheme and visible focus. Resource serving admits only known SVG/PNG media and safely returns 404 for malformed paths. `app.setName('Charmlet')` precedes profile access. Diagnostics read actual Electron `getLastWebPreferences()` and distinguish measured window state from unqueryable configured frame/transparent/skip-taskbar flags.

Unreadable preference/companion files now stop initialization without replacement. IPC, placement, display, power, tray actions, startup and shutdown have bounded error handling; background failures latch one quiet tray status, and Quit still drains all possible writers then exits. Remove Pack uses a scalable native popup menu. Tray tooltip/title reflects notice/reminder/focus, and macOS gets explicit app/Edit menus.

The existing Node:test smoke now has a 180-second owned cleanup hook and `expect.poll` 5-second limits, plus dev and packaged modes with separate profiles/evidence. Both passed the full security/profile/Hibiscus/hidden-power/show/reload-generation/restart/stop/trivia lifecycle. Dev paused remainder 46830 ms; packaged 46840 ms. Actual Electron preferences showed `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`, `webSecurity=true`; renderer globals remained absent.

Final unsigned Windows package contains 116 files/385953559 bytes. `Charmlet.exe` remains 246302208 bytes/SHA256 `16139C7C7C6BE93668C107FB65C6DB3ED3F53BFDBB3B39E1E8680FB3DC9CE1DF`; packaged `main.cjs` SHA256 is `09E0A5A76DC0CD76F5BF1F013E9F15EAF00921A918FFE0074C196EEB9FB56E03`. Dev screenshots: Focus105964/`9B10FFEA47B68B0EAC97604F6DE219256A4815E2EA090BF5428453032ED86699`, Garden117597/`084BBA979E7DF6516B05377BA8A1D231CDF5B63C2B4BB051E5158E9930610CE7`. Packaged screenshots: Focus105962/`A45396CE0EAAE4DB21822CDB465BE359663452F5272E00103EF8C429F467FBC5`, Garden117599/`48E44DF1FF123AB5E19784BA5B4E1390FFBF7DC17BE5D6EEB38833B64E9B0232`.

Actual native click-through/no-focus-steal, tray popup behavior, real monitor/DPI removal, real OS suspend/lock, macOS Spaces/build and signing/distribution remain manual or hosted gates. Extension/gallery artifacts remain untouched.
