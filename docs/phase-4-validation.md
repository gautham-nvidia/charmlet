# Phase 4 verification

## 2026-11-02 — resumed candidate verification

The owner authorized continued work on dedicated phase branches. The preserved candidate is extension **0.4.3** and desktop **0.1.1**; the artwork remains an explicitly labelled review collection.

Fresh checks on the Windows PC:

- `npm.cmd --prefix extension test` with `VSCODE_TEST_VERSION=1.140.0`: type checking, lint, build, **59 unit tests and six real-editor scenarios passed**. The navigation scenario imports the ten-design redraw pack and restores its selected charm after reload.
- `node --test website/art-cutout.test.mjs website/studio/test/core.test.mjs website/studio/test/service.test.mjs`: **23 passed**. This gate is now included in the six hosted editor jobs.
- `node website/studio/check.mjs`: three valid frame exports, retained crop after renewal, no photo data in 25 requests, empty browser storage, no mobile overflow or page errors. All provider responses were fixtures.
- `node website/check.mjs` and `node website/check-review.mjs`: classic downloads, live demo and matching VSIX passed; all **95 PNGs, 83 individual designs and 14 review packs** validated. No browser errors or desktop/mobile overflow.
- Agent-browser's full axe audit of the home page: 46 passed checks, no violations and two checks requiring manual assessment. This is one page's automated result, not a complete accessibility certification.
- Desktop type/build and six models passed. The first smoke run overlapped the editor suite and failed when the final trivia reveal did not persist. An isolated smoke run passed. Failure-only host/renderer/event capture was added; the initial failure is retained as an intermittent result, not declared fixed by one retry.
- `.env.local`, local session notes and all raw `output/` authoring files are Git-ignored. A scan against the locally configured secret found no matches in candidate source/assets.

Rebuilt VSIX: **125679 bytes**, SHA-256 `485b2093f6c993a4ed2c331279d7911907b0aba47a1de9c40daa95106c11f8c4`. ZIP timestamps make this a different artifact hash from October's preserved package record.

Current hosted editor and extracted desktop-archive checks are tracked on [PR #19](https://github.com/gautham-nvidia/charmlet/pull/19). The October results below are historical. Native desktop interactions, authenticated editor forks, final artwork selection, licensing, publisher/merchant accounts and store publication retain their own release gates.

## 0.4.3 / Desktop 0.1.1 - local review candidate, 2026-10-09

The approved four-button navigation, searchable picker, motivation-first fresh state, compact reminder controls and real-version footer are implemented. Existing saved choices and garden progress are preserved. The website has a separate 95-design illustrated Gemini review, not an approved replacement or paid catalogue.

| Local verification on the Windows PC | Result |
|---|---|
| Extension compile/type/lint and unit suites | 59 passed, zero failed |
| VS Code 1.90.0 and 1.140.0 owned-profile editor scenarios | Six passed on each version; current-version full final run includes review-pack import/reload |
| Navigation review-pack case | Ten Starter Redraws import alongside ten originals; selected216px artwork survives reload |
| Classic gallery/download/demo check | Ten included,60extras, twelve browsing categories, real0.4.3VSIX, no desktop/mobile overflow or browser errors |
| Full art review | 95bounded transparent PNGs;83individual downloads and14collection packs; browser download parses; flowers cannot be downloaded as unlocks |
| Cutout tests | Five passed; wrong backgrounds, blank silhouettes and edge clipping are rejected |
| Photo Studio model/service tests | Eighteen passed using fake vendor responses and owned local servers; no real purchase/provider validation |
| Photo Studio browser flow | Three framed exports validate; expiry preserves the crop/name/frame; delayed decoding cannot restore a locked photo; no photo data in requests or web storage;375pxnooverflow/errors |
| Desktop source | Type/build, six placement/power models and owned development smoke passed |
| Desktop packaged/archive | Windows0.1.1package and extracted ZIP run passed; installed-version footer and four navigation controls checked in packaged smoke |

**On the Windows PC (PowerShell):** verification commands are `npm.cmd --prefix extension test` with `VSCODE_TEST_VERSION` selecting the editor, `node website/check.mjs`, `node website/check-review.mjs`, `node --test website/art-cutout.test.mjs website/studio/test/core.test.mjs website/studio/test/service.test.mjs`, `node website/studio/check.mjs`, `npm.cmd --prefix desktop test`, `node desktop/test/smoke.mjs --packaged` and `node desktop/archive.mjs`. The web checks require the localhost4173preview server. All tests use disposable profiles/fixtures, not the user's installed app profile.

| Local artifact | Bytes | SHA-256 |
|---|---:|---|
| `extension/charmlet-0.4.3.vsix` | 125679 | `9ba44bf8444a6bfc1b9d005eabaa0c9f4d4b09435995d211337ea8c2eaa353e1` |
| `desktop/distribution/Charmlet-desktop-0.1.1-win32-x64.zip` | 158274214 | `c77c0105bc61d3d81b08eb66f420508132ccd202402b9fb8549b04ec91f9db52` |

Generated evidence is under `extension/test-results/1.90.0`, `extension/test-results/1.140.0`, `extension/test-results/art-review-0.4.3`, `extension/test-results/website-check-0.4.3`, Photo Studio's checker output and `desktop/test-results/`. Raw art/receipts are separate ignored authoring artifacts. Visual inspection caught an oval ball under Football after technical checks; the association-football candidate and Sports bundle were corrected without replacing the other94designs. PNG validation does not prove semantic accuracy or owner approval.

**Remaining gates:** new hosted Linux/macOS runs for this head; authenticated Cursor/Devin Desktop and other IDE scope; current macOS desktop packaging/permissions/Spaces; real native OS pass-through/focus/mixed-DPI; signing/notarization; merchant/sandbox purchase/refund setup; source/art licence and ownership; final bundled/free/premium choices; store/public hosting approval. Earlier hosted results below remain historical evidence only. No public release or live paid access is enabled.

## 0.4.1 — Focus, Learn, Garden and Gentle Reminders

**Accepted hosted head:** `afd000b0ea7e108120b9e1e58659d79e194dcae7` on `feat/phase-4-companion`. [Run 37865298216](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216) passed all six jobs. The phase PR remains draft because website commerce/desktop work is separate.

| Runner | VS Code 1.90.0 | VS Code 1.140.0 |
|---|---|---|
| Windows | [113610470070](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216/job/113610470070) — passed | [113610470310](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216/job/113610470310) — passed |
| Ubuntu 24.04 / Xvfb | [113610470424](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216/job/113610470424) — passed | [113610470264](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216/job/113610470264) — passed |
| macOS 15 / Apple Silicon | [113610470357](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216/job/113610470357) — passed | [113610470306](https://github.com/gautham-nvidia/charmlet/actions/runs/37865298216/job/113610470306) — passed |

Every job gated packaging and gallery build on the unit and editor tests. The lead matched the exact run/head and six job names/conclusions through GitHub Actions REST. Downloaded Linux/macOS1.140 logs explicitly reported:

```text
tests 58
pass 58
3 passed
```

The three editor cases cover:

- The existing full charm, physics, preference, accessibility, pack-import and resource regression.
- Focus/Learn recovery, exact pause/reload remainder, source/trivia state, stable reading during timer updates and keyboard controls.
- Garden's confirmed eleventh watering, earned picker entry, explicit flower hanging and reload, plus reminder Snooze/Done/disable and new-seed same-day protection.

The model tests cover simulated calendar dates, including local23/25-hour DST boundaries, missed days, persisted random selection, reward/save failure, no reminder backlog and schema migration. The real-editor garden fixture begins at ten previous waterings to exercise the final transition; this is not an eleven-day human trial.

Accepted local development package:

```text
extension/charmlet-0.4.1.vsix
120883 bytes
SHA256 F5955540C4B4EF110DEFBC3AFA525F2FD9C57B48324AC148F798D9D2FEAB5279
```

Windows local checks also verified matching website-delivered VSIX bytes, usable desktop/mobile gallery layout and original flower artwork. The later website catalogue expansion reuses this accepted extension file rather than rebuilding the app.

## Earlier 0.4.0 Mac assertions

Run37860624048 passed Windows/Linux, but the Mac tests expected the full rendered cord while a Focus/settings drawer reduced the available height. The test was looking at fitted rendering rather than the stored resting preference.

The corrected cases check the stored file/slider with controls open, then close the controls and retain the original exact rendered-cord assertion. The successful0.4.1 matrix exercises both checks. No bounds, physics checks or per-assertion deadlines were lowered to get that result.

## Limits

These are extension checks in the listed VS Code runners. Authenticated Cursor/Devin Desktop, Intel Mac, Windows ARM, Remote-SSH/WSL, browser hosts and a standalone desktop application require their own evidence or an explicit launch-scope decision. This record does not publish the product or waive publisher, source/art licence, merchant or hosting decisions.
