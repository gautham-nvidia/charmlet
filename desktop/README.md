# Charmlet desktop developer beta

Charmlet Desktop is an unpublished Windows/macOS developer beta. It reuses the extension's charm renderer, physics, Focus/Learn/Garden controller, validated pack parser and confirmed JSON stores in one floating tray-managed window.

## Local commands

**On the Windows PC (PowerShell), from the repository root:**

```powershell
npm.cmd --prefix desktop install
npm.cmd --prefix desktop run test
npm.cmd --prefix desktop run package
```

The current Windows 0.1.2 output is an unsigned folder under `desktop/release/0.1.2/Charmlet-win32-x64/`. Packaging uses the manifest version and a versioned output directory, refuses overwrites and leaves earlier releases intact. The current macOS `.app` still must be produced and checked by the hosted macOS job. There is no installer, signing, notarization, update service, store listing or public distribution in this slice.

For a portable download, archive and test the extracted application.

**On the Windows PC (PowerShell), from the repository root:**

```powershell
node desktop/archive.mjs
```

This writes a Windows ZIP under `desktop/distribution/`. The hosted Mac job writes a `.tar.gz` so the `.app` keeps its executable permissions and framework links. Both archive types are extracted and launched in disposable profiles before upload. GitHub's outer artifact ZIP contains that tested archive; extract it, then extract the inner archive and keep the app folder together.

## Current local evidence — 2026-11-03

Version 0.1.2 includes the shared release bounce and silhouette attachment, soft Stress Busters, the motivational deck and optional festive defaults. Manual choices and imports pin the selected charm. This build retains the original bundled artwork; new designs are separate review imports.

Type/build, six model tests and the developer smoke passed. `node desktop/archive.mjs` extracted the Windows ZIP and launched its executable in an owned profile; restart, focus, garden, sandbox/IPC configuration and saved state passed. Native click-through and the OS behavior checklist below remain manual gates.

`desktop/distribution/Charmlet-desktop-0.1.2-win32-x64.zip` is 158278080 bytes; SHA-256 `1b39b8a32f908010b33f6674e9bc69c00280c69fb69014036a60c0df47872b21`.

## Historical local evidence — 2026-10-09

Windows 0.1.1 includes the same Charms/Focus/Garden/Settings navigation, motivation-first fresh state, compact reminder controls and host-version footer as extension0.4.3. Build/type checking, six model checks and the owned dev smoke passed. The portable ZIP was extracted and the extracted executable passed restart, focus, garden, source security and saved-state checks in a disposable profile.

`desktop/distribution/Charmlet-desktop-0.1.1-win32-x64.zip` is 158274214 bytes; SHA-256 `c77c0105bc61d3d81b08eb66f420508132ccd202402b9fb8549b04ec91f9db52`. This is an unsigned local beta, not proof of the native/manual gates below or a current-version Mac run.

## Data and security boundaries

- Desktop data stays under the app's own Electron profile: `preferences.json`, `companion.json`, `packs/`, and `window/preferences.json`.
- Desktop and IDE profiles do not automatically synchronize focus or garden progress.
- The renderer uses `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` and a narrow preload bridge.
- `charmlet:` serves only the copied template, bundles, styles and known media.
- Source links are opened only from reviewed learning-card IDs.
- No telemetry, account, global hotkey, autostart or update polling is present.

## What automated evidence proves

The owned Electron smoke test verifies profile isolation, renderer security flags, shared state/restart behavior, earned artwork, explicit-control focus, bounded placement and the restricted hit-test IPC configuration. CDP input and the diagnostic ignored-state do **not** prove that native clicks pass through to another application.

## Manual gates before any wider beta

- Real native click-through over empty transparent regions on Windows and macOS.
- Ordinary charm play does not steal focus from the active editor; explicit controls do.
- Tray/menu-bar Show/Hide, Focus/Learn/Garden, pack dialogs and Quit.
- Monitor disconnect/reconnect, negative-coordinate displays and mixed-DPI movement.
- OS suspend/lock and macOS Spaces behavior; running focus pauses and never auto-resumes.
- macOS package/run evidence from the hosted workflow.
- Owner decisions for source/art license, signing, notarization and distribution.
