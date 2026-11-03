# Phase 5 — extension-store release

Phase 4 merged through [PR #19](https://github.com/gautham-nvidia/charmlet/pull/19) at `69e067474f057fdd7d66948bc34f9a4fcb017909`. All six editor checks and both desktop archive checks passed at the accepted `c652107` head. Phase 5 uses `feat/phase-5-store-release` and [issue #18](https://github.com/gautham-nvidia/charmlet/issues/18).

## Candidate and release path

Version **0.5.0** prepares the free extension's store metadata, packaged privacy notice, support route and reproducible release checks. It retains the approved Phase 4 app behavior and original ten defaults. The 95 redraws remain review candidates.

The release check compares package.json and the VSIX XML identity, built renderer/host/media bytes, the changelog, required notices and the website's exact VSIX download. It rejects source files, environment files and unexpected package contents. `release/dist/release.json` records the candidate's SHA-256 and source commit; `SHA256SUMS` records the download checksum.

**On the Windows PC (PowerShell), from C:\dev\Lucky-Charms:**

```powershell
npm.cmd --prefix extension run compile
npm.cmd --prefix extension run test:unit
node --test release/check.test.mjs
npm.cmd --prefix extension run package:vsix
node website/build.mjs
node release/check.mjs
```

This builds a review artifact. A successful candidate check does not publish it or prove ownership of a store account.

The **Extension Release** workflow accepts the exact version and a destination. Its default, `artifact`, uploads review files only. Live destinations require a green main-branch editor run at the same commit, source/art licence files and the appropriate registry credentials. They publish the same checked VSIX to both registries rather than rebuilding between uploads. Run it from `main` after this phase's PR is merged and the prerequisites below are met.

## Concrete remaining setup

As verified on 2026-11-02, GitHub has **no repository Actions secrets**, **no release environments** and **no Pages site**. Current store URLs are null. No store upload has been attempted.

1. **Source licence:** the owner must select the licence. Add its actual text at `extension/LICENSE` and the corresponding `license` value in `extension/package.json`. MIT is a suggested option for the code, not an adopted licence.
2. **Artwork terms and lineup:** approve the included artwork and its terms at `extension/ARTWORK-LICENSE.md`. Decide which redraws replace bundled/free website designs; no premium catalogue or price has been selected.
3. **Marketplace:** confirm ownership of publisher `gautham-nvidia` and configure the repository secret `VSCE_PAT` with Marketplace publishing access. A manifest string does not register a publisher.
4. **Open VSX:** confirm the same namespace, complete its required publisher agreement and configure `OVSX_PAT`. No agreement is accepted automatically.
5. **Public gallery:** choose the hosting target and deploy an approved catalogue/install page. A GitHub Pages deployment is a possible free route; the local review site is not a public site.

Store credentials belong in GitHub Actions secrets or a local environment, never in this document, command arguments, repository files or chat. The check reports only missing credential names.

If one registry upload succeeds and the other fails, retain the published version and retry only the failed destination with the same candidate. Do not silently increment versions or unpublish the successful store. After publication, verify both public identities and downloaded versions, then update `website/distribution.json`.

## Host scope

- VS Code 1.90 and 1.140: Windows, Ubuntu 24.04 and macOS 15 Apple Silicon have current Phase 4 hosted evidence.
- Cursor 3.26.16: the Electron automation launch timed out; an independent disposable CDP launch reached the login/onboarding surface and an extension-host startup warning. No compatibility pass is claimed.
- Devin Desktop 3.11.238 (VS Code base 1.126.0): the disposable test reached onboarding rather than the visible Charmlet view. It needs completion of the normal setup and an actual interaction check.
- Intel Mac, Windows ARM, Remote-SSH/WSL and browser editors remain outside the verified matrix. There is no browser extension bundle.
- The unsigned desktop beta has separate native input, DPI/monitor, sleep/lock, signing and notarization gates. It does not block preparation of the IDE release.

## Release review

Before uploading, use the prepared VSIX in a disposable or explicitly authorized editor profile. Verify Charms search, Focus pause/reload, Garden watering, reminder actions, imported-pack restoration and the installed version. Confirm that the listing and support copy match the actual supported hosts.

Publication checks verify technical consistency, not legal approval or successful authentication. Merchant setup and live paid Photo Studio remain separate Phase 6 prerequisites.

## Current verification and findings

The local 0.5.0 candidate passed type checking, lint, build, 59 unit cases, five release-guard cases and the VS Code 1.140 navigation/import/reload scenario. Packaging includes the privacy notice; the website copy matches the exact 41-file VSIX. A fresh release record is generated after the final source commit, including whether the working tree is dirty.

The full Windows editor scenario also passed after the menu-state diagnostic additions. Installing the actual VSIX into an isolated profile then exposed a separate release defect: the old manifest did not declare Restricted Mode support, so VS Code disabled Charmlet there. The manifest now declares the local companion safe for untrusted workspaces. The installed 0.5.0 package passes with the editor still in Restricted Mode: ten original charms, planting, one watering, same-day protection and identical plant/progress after reload. No development-extension path or trust-disabling flag is used for that check.

Every hosted editor job now verifies this installed package after packaging. Its separate evidence directory preserves the earlier six development scenarios' outputs. This adds one installed-package scenario per supported OS/editor combination.

PR [#20](https://github.com/gautham-nvidia/charmlet/pull/20) passed all eight jobs at `fd3ed4a` and merged at `e363f50`. The artifact-only release workflow [41548742464](https://github.com/gautham-nvidia/charmlet/actions/runs/41548742464) then passed; its registry upload step was skipped and its manifest correctly reported the missing licences.

The subsequent main run exposed an incorrect test assumption: both macOS installed-package checks watered before midnight on November 2 UTC and completed reload after midnight on November 3. Progress remained one watering, but the test still expected the button disabled. The verification now checks eligibility against the current local day and requires the whole saved garden to remain identical. It also reloads a previous-day fixture in the same disposable profile and verifies the next watering advances to two. The product's calendar rule is unchanged.

The publishing-tool audit identified an existing critical `shell-quote` advisory and a high-severity MSAL advisory. Compatible targeted updates now resolve `shell-quote` 1.12.0, `@azure/identity` 4.14.1 and `@azure/msal-node` 7.1.2. `npm audit --omit=dev` reports zero advisories. The full toolchain still reports one low and nineteen moderate advisories, chiefly glob/minimatch denial-of-service issues and indirect dependents. No forced dependency downgrade or install-script approval was applied.

Post-merge main run [41541368400](https://github.com/gautham-nvidia/charmlet/actions/runs/41541368400) passed five editor jobs and failed Linux 1.140 while reopening Settings during the ten-charm loop. All 59 units and the five companion/navigation scenarios passed in that job. The failed screenshot shows the menu closed; the previous trace did not capture pointer delivery. The test now checks closed-panel/focus/open-menu transitions explicitly and captures pointer targets and menu state. This is diagnostic coverage, not a claimed product fix. Subsequent Phase 5 CI determines the next step.

## 0.5.1 motion follow-up — November 3

Released stretches now rebound across rest with diminishing amplitude. The return starts at the actual rendered position, including when pointer events arrive before the next physics frame. The above-peg return keeps its safe arc and transfers its last velocity into the settling swing. Reduced Motion still settles immediately.

Imported PNGs derive their cord connection from supported opaque pixels near the upper centre of the image. The decoder handles all five allowed PNG row filters; separate hooks cannot average into a transparent gap. Pack format and stored bytes are unchanged.

Local validation passed 63 unit cases, type checking/lint/build, all seven Windows VS Code 1.140 editor scenarios, six desktop model cases and an isolated desktop source smoke. The editor checks the real panda image at the cord tip, records a visible rebound while focus ticks, and verifies Reduced Motion advances no animation frames.

One earlier desktop smoke reported a companion-save failure during Resume and correctly retained the paused state. Its captured renderer reported `companionPersisted: error` and the retry message. The unchanged isolated rerun passed; the underlying filesystem cause was not captured. This is not a claimed storage fix. Hosted checks remain required.

The locally checked 0.5.1 VSIX contains 41 files, 128896 bytes, SHA-256 `66623fb83c1d824afc498395c4f048594e25f0581301797ae11f5505188586bb`. The website download matches. Source/art licence gates still block publication. This follow-up does not replace the artwork catalogue.

## 0.5.2 collection review — November 3

The motion follow-up passed all eight PR checks and merged in #22 at `b4e298c`. Both post-merge workflows also succeeded (`41708987673`, `41708987616`).

The collection review implements the owner's curation, seventeen new/revised samples, an entirely motivational 80-message deck, soft squeeze interaction and optional local-date festive choices. The original Terminal and bundled originals remain; review imports have separate identities. Manual selections/imports pin across dates and reloads. See the [actual-app review](art-refresh-review.md).

Local Windows VS Code 1.140 validation passed 66 units, type/lint/build and all nine editor scenarios, including installed-package Restricted Mode/garden persistence. The new scenario checks holiday selection without overwriting the usual charm, year-to-year pins, squeeze contact at an opaque image pixel, Space/blur cancellation, Reduced Motion and reload. An initial soft-release assertion failed once and passed on unchanged rerun; its cause was not established. The final implementation uses explicit input-held state rather than browser `:active`, and passed the full run.

Website checks passed 51 review downloads, ten originals, fourteen categories, 105 prepared PNGs, 64 featured records, sixteen packs, archived-download compatibility, desktop/mobile bounds and empty console/page errors. The gallery's VSIX exactly matches the installed candidate: 41 files, 131204 bytes, SHA-256 `bf5764257050b3219fcdab536e2a87ffcfe565a6ebee5b362719f6d461c09e3c`.

Desktop 0.1.2 passed six models, the developer smoke and an extracted Windows ZIP smoke. The ZIP is 158278080 bytes, SHA-256 `1b39b8a32f908010b33f6674e9bc69c00280c69fb69014036a60c0df47872b21`. Hosted editor/macOS archive checks are tracked in the PR. Native OS checks, artwork/licence decisions, publisher credentials and public release remain separate gates.

The first hosted review run passed the three 1.90 jobs and both desktop archives, but all three 1.140 jobs failed the new release assertion. A diagnostic follow-up recorded the release reaching the outer IDE while the charm frame retained pointer capture after a held screenshot. Its Windows and Linux evidence archives matched their API digests. Local reproduction also confirmed the same editor/Chromium versions, but a different display scale (250% locally versus 100% on the failed runners).

The fixture now uses 100% display scaling, limits the simulated date to Charmlet's frame and keeps screenshots outside the captured-pointer gesture. It verifies a sustained fully compressed hold, opaque cord contact and complete release; none of those assertions was relaxed. Pointer/capture traces and host versions remain in the evidence. This changes the verification setup, not the runtime; hosted results for the corrected fixture are tracked in #23.
