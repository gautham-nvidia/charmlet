# Charmlet project log

Dates use YYYY-MM-DD; Git preserves exact timestamps and authors. Append dated entries for new work
and corrections rather than erasing history. Record the linked issue/PR, commit description, evidence
and next action. Current milestone status is summarized below; entries preserve how it changed.

## Milestones - updated 2026-09-17

| ID | Status | Scope / next gate | Tracking |
|---|---|---|---|
| P0 | Validated locally; integration pending | One-charm docked prototype, tests, development VSIX, docs and CI | [#3](https://github.com/gautham-nvidia/charmlet/issues/3) |
| P1 | Next | Free-core sizing/cord UX, cancellation/lifecycle coverage, accessibility, profiling and engine-floor tests | [#2](https://github.com/gautham-nvidia/charmlet/issues/2) |
| P2 | Planned | Three finished free originals, switching UI, generic Silicon coworker trial | [Roadmap #1](https://github.com/gautham-nvidia/charmlet/issues/1) |
| P3 | Planned | Cross-editor/OS/remote tests; approved identity and license; Marketplace + Open VSX | Roadmap #1 |
| F1 | Deferred | Quiet opt-in coding motivation in the status bar | Roadmap #1 |
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