# Charmlet desktop developer beta

Charmlet Desktop is an unpublished Windows/macOS developer beta. It reuses the extension's charm renderer, physics, Focus/Learn/Garden controller, validated pack parser and confirmed JSON stores in one floating tray-managed window.

## Local commands

**On the Windows PC (PowerShell), from the repository root:**

```powershell
npm.cmd --prefix desktop install
npm.cmd --prefix desktop run test
npm.cmd --prefix desktop run package
```

The Windows output is an unsigned folder under `desktop/release/Charmlet-win32-x64/`. The macOS `.app` must be produced and checked by the hosted macOS job. There is no installer, signing, notarization, update service, store listing or public distribution in this slice.

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
