# Phase 4 verification

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
