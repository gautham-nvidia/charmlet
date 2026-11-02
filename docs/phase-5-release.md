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

The publishing-tool audit identified an existing critical `shell-quote` advisory and a high-severity MSAL advisory. Compatible targeted updates now resolve `shell-quote` 1.12.0, `@azure/identity` 4.14.1 and `@azure/msal-node` 7.1.2. `npm audit --omit=dev` reports zero advisories. The full toolchain still reports one low and nineteen moderate advisories, chiefly glob/minimatch denial-of-service issues and indirect dependents. No forced dependency downgrade or install-script approval was applied.

Post-merge main run [41541368400](https://github.com/gautham-nvidia/charmlet/actions/runs/41541368400) passed five editor jobs and failed Linux 1.140 while reopening Settings during the ten-charm loop. All 59 units and the five companion/navigation scenarios passed in that job. The failed screenshot shows the menu closed; the previous trace did not capture pointer delivery. The test now checks closed-panel/focus/open-menu transitions explicitly and captures pointer targets and menu state. This is diagnostic coverage, not a claimed product fix. Subsequent Phase 5 CI determines the next step.
