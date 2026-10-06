# Phase 3 readiness - 2026-10-05

Phase 3 has started on `feat/phase-3-readiness` from the merged Phase 2 build, **0.1.0**. Tracking: [P3 #11](https://github.com/gautham-nvidia/charmlet/issues/11); [full-circle interaction #8](https://github.com/gautham-nvidia/charmlet/issues/8). This checkpoint changes test infrastructure and documents release gaps; it does not publish a release or implement an unspecified rotation behavior.

## Compatibility evidence

| Host | Evidence | Status |
|---|---|---|
| Windows / VS Code 1.90.0 | P2 local and hosted complete interaction suite | Verified baseline; retained engine-floor CI target |
| Windows / VS Code 1.138.0 | P2 local and hosted complete interaction suite | Verified historical baseline |
| Windows / VS Code 1.140.0 | Complete local interaction suite passed; runtime reports `Code`, 1.140.0, Electron 43.7.3, win32/x64 | Verified local baseline; selected as the recent CI target |
| Windows / Cursor 3.20.21 | Installed metadata reports VS Code 1.128.0; disposable-profile proof and scratch-file readiness passed, then startup switched to a Log In / Sign Up screen | Full interaction compatibility unverified; clean-profile automation blocked by host startup/login |
| Windows / Devin Desktop | Installed product metadata `windsurfVersion` 3.10.48, package 1.126.0; Charmlet activation occurred, but Customize onboarding covered the editor. Advancing once with CLI installation unchecked reached sign-in | Full interaction compatibility unverified; clean-profile automation blocked by host startup/login |
| macOS / Linux | Not run in this checkpoint | Pending |
| Remote-SSH / WSL | `extensionKind: ui` is declared, but these workflows were not exercised | Pending runtime verification |
| Browser hosts | Manifest has a Node `main` entry and no `browser` entry; host code imports Node APIs | Not declared/tested; assess a web target separately |

Fork probes used temporary user-data/extensions directories and proved the actual Electron user-data path matched the disposable directory. No normal editor profile was reused, no credentials were entered or copied from a normal profile, no CLI was installed, and no authentication/configuration workaround was attempted. Host sign-in screens do not establish an extension defect.

## Reproducible host selection

`CHARMLET_TEST_HOST` gives a custom host a safe artifact folder name. It requires an explicit `VSCODE_EXECUTABLE` and cannot be combined with `VSCODE_TEST_VERSION`, preventing misleading host labels. Resource schema 2 records the runtime host name/version as well as the requested label. Profiles include whole-editor overhead and remain diagnostic snapshots, not extension-only benchmarks.

The checked 1.140.0 capture is preserved in [JSON](phase-3/vscode-1.140.0-resources.json). Prior Phase 1 numerical captures remain unchanged.

**On the Windows PC (PowerShell), from the repository root after installing the locked dependencies:**

```powershell
npm.cmd --prefix extension run compile
Remove-Item Env:CHARMLET_TEST_HOST -ErrorAction SilentlyContinue
Remove-Item Env:VSCODE_EXECUTABLE -ErrorAction SilentlyContinue
$env:VSCODE_TEST_VERSION = '1.140.0'
npm.cmd --prefix extension run test:ui
Remove-Item Env:VSCODE_TEST_VERSION
```

For a custom host, use its verified executable path with `CHARMLET_TEST_HOST` and leave `VSCODE_TEST_VERSION` unset. The tested local labels were `cursor-3.20.21` and `devin-3.10.48`; their complete-suite outcomes remain blocked as described above.

## Remaining work before release

| Area | Required next step |
|---|---|
| Full-circle interaction | Implemented and locally verified in 0.2.0; see the orbit validation record and updated PR #12 checks |
| Cursor / Devin Desktop | Run the complete interaction suite with an authorized authenticated test setup, or collect explicit manual verification from the owner's already configured editor; do not copy credentials or bypass onboarding |
| macOS / Linux CI | Make keyboard shortcuts and executable selection portable; use a virtual display on headless Linux and run the real suite before claiming support |
| Remote / browser | Exercise real Remote-SSH/WSL placement; decide whether a browser bundle is in scope |
| Publisher | Confirm the intended personal publisher and actual ownership for Marketplace/Open VSX; the manifest value alone is not proof |
| License | Owner must choose the source/art license; current public visibility and permanently free pricing do not grant a reuse license |
| Listing | Prepare a suitable PNG marketplace icon and review the README/media; the existing SVG is the native view icon |
| Publication | Package and review a release candidate, then obtain explicit publishing approval before namespace/account changes or registry uploads |

Official [VS Code CI guidance](https://code.visualstudio.com/api/working-with-extensions/continuous-integration) uses Xvfb for headless Linux editor tests. The local `@vscode/test-electron` launcher source also includes `--no-sandbox` and `--disable-gpu-sandbox`; this repository's direct Playwright launch does not inherit that helper's launch arguments. These are preparation facts, not Linux execution evidence.

No macOS/Linux/remote/browser pass, publisher registration, license choice, public registry release or full-circle implementation is claimed by this checkpoint.

## 2026-10-06 - Full-circle feature complete locally

The owner clarified that the charm and cord must orbit the fixed top peg. Version **0.2.0** implements that behavior while retaining selected resting preferences and safe release. The peg is stationary during a gesture and has visible clearance above it.

Type/lint/build, **19 unit tests**, and both complete local UI suites on **Windows VS Code 1.90.0 and 1.140.0** passed. The [orbit validation record](full-circle-validation.md) contains screenshots and independently checked rendered-motion evidence. The earlier unresolved-motion entry is superseded by this implementation.

The macOS/Linux/remote/browser, authenticated-fork, publisher/license, listing and publication gates remain open. No new fork pass is inferred from the official VS Code results. Updated hosted checks and integration are tracked in PR #12.
