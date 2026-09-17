# Charmlet - design research and build plan

**Implementation update, 2026-09-17:** Charmlet is the selected product name; the personal public
repository is `gautham-nvidia/charmlet`. Phase 0's docked prototype now has passing Windows real-editor
checks and a development VSIX. See [README.md](README.md) for setup and [PROJECT_LOG.md](PROJECT_LOG.md)
for dated commits, evidence and the current roadmap. Research and earlier proposals below are preserved
as history; they do not override the implementation status or authorize publishing.

An original hanging-charm extension inspired by the general interaction of *Lucky Dangle*,
not a port of its branding, art, copy, or website. The product is an editor extension, not
a website or a native desktop app.

**Updated 2026-09-17:** permanently free core and bundled free items; original AI-assisted art;
responsive motion and direct interaction are essential. Rendering is **not decided**. Publishing to
both VS Code Marketplace and Open VSX is recommended to reach compatible forks with one product.

**Research correction:** the decoration approach below is an unproven visual experiment, not a
supported draggable overlay. VS Code exposes no arbitrary interactive overlay API for the code
editor or title bar. A docked webview supports pointer interaction inside its own bounds, but takes
space and is not equivalent to floating over code. Accept that compromise before implementation.
No application code, publisher registration, or extension ID reservation is part of this research.

## Research brief - 2026-09-17

### Name shortlist

| Name | Why it fits |
|---|---|
| **Swaybit** | Recommended: movement + computing; short and independent of the inspiration |
| **Charmlet** | Suggests a small charm; friendly and suitable for a collection |
| **Tetherbit** | Emphasizes the cord, pulling and developer audience |

Marketplace keyword searches returned no matches for these three. A combined GitHub repository-name
search found none for them; it did find an existing ByteBauble library, so that alternative was dropped.
These are preliminary checks, **not trademark clearance or confirmation of publisher/domain availability**.
Final name selection remains open. Use an independent author/studio publisher, not NVIDIA branding.
Keep the folder name; do not use Lucky Charms or Lucky Dangle as the product name.

### Existing projects worth studying

| Project | What exists | Relevance |
|---|---|---|
| [VS Code Pets](https://github.com/tonybaloney/vscode-pets) | Interactive animated companions in a webview | Closest established category; source registers `WebviewViewProvider`, not a free-floating overlay |
| [Power Mode](https://github.com/hoovercj/vscode-power-mode) | Animated typing effects using decorations | Passive-image precedent; README documents positioning and animation limitations |
| [Doki Theme](https://github.com/doki-theme/doki-theme-vscode) | Corner stickers and wallpapers | README explicitly requires modifying installation CSS/checksums; unsuitable for our architecture |

VS Code Pets has [MIT-licensed code](https://github.com/tonybaloney/vscode-pets/blob/main/LICENSE),
but separately credited artwork. Review licences and retain required notices for any reused code;
use our own art and copy. [Matter.js](https://brm.io/matter-js/) is a candidate physics engine for
cord constraints and release momentum, not an existing charm extension.

No exact hanging, pull-down, corner-parking charm extension surfaced in the reviewed results.
This is a bounded search, not proof of uniqueness: Marketplace terms included `charm`, `dangle`,
`dangling`, `pendant`, `keychain` and `pets`; GitHub searches included `vscode charm`, `vscode dangle`,
`vscode mascot` and `vscode shimeji`; Open VSX searches covered `charm` and `dangle` with fuzzy matches
reviewed for relevance. General web searches were inconclusive: Google returned a JavaScript challenge
and Bing gave insufficient relevant results. No third-party extension was installed or executed.

### Placement decision and proposed gestures

[Official restrictions](https://code.visualstudio.com/api/extension-capabilities/overview#restrictions)
exclude arbitrary workbench DOM access. Decoration image properties do not provide pointer-down,
move and release callbacks. Moving the desired charm from the editor corner to the app's top-right
does not solve this. A [webview](https://code.visualstudio.com/api/extension-guides/webview) is an
interactive HTML surface confined to an editor tab, sidebar or panel, not an overlay over code.

**Proposed compromise, not yet accepted:** a compact view the user can dock on the right. It takes
space, even with a transparent background. Do not rearrange existing panes automatically. If its
space cost is unacceptable, revisit scope; do not silently substitute a static icon or native helper.
Installation patching and private workbench APIs remain ruled out.

| Action | Prototype response |
|---|---|
| Summon | Drop from the top-right inside the accepted surface and settle; preserve editor focus |
| Click | Nudge from the current pose; repeated clicks respond immediately |
| Drag / release | Follow the pointer, then swing with release momentum and settle |
| Pull down | Extend and remain parked at the corner after release |
| Pull up | Proposed retraction gesture; confirm this interpretation of "pull it out" |
| Hide / restore | Reversible, with keyboard and status-bar alternatives |

All webview gestures stay inside its bounds. Transparency does not permit clicking through to code.
Respect reduced motion, default sound off, clamp position on resize, handle cancelled drags, and stop
simulation when hidden or settled. Do not promise zero CPU without measuring. Test beside normal
typing, selection, scrolling and autocomplete; a browser-only animation is not integration proof.

### Free core, art and coworker pack

- **Permanently free core:** complete interaction, switching, persistence and accessibility, plus at
   least three finished charms bundled for offline first use. No expiry, account or runtime AI key.
- Optional paid packs may add cosmetics later; never paywall the starter set or basic interaction.
- AI is an authoring tool: generate from independent briefs, hand-edit and review the results. Keep
   generator/model/licence provenance. Do not recreate competitor art, branding, screenshots or copy.
   AI generation does not guarantee originality or commercial rights; check the generator's terms.
- Use transparent PNG/WebP or manually refined SVG as appropriate, with separate attachment points
   and cord/body motion. Inspect at actual editor sizes; no fixed SVG-only pipeline before the prototype.
- Proposed free coworker trial: **Silicon Pack**, with original generic chip, wafer and circuit charms.
   No confidential diagrams or unreleased product references. A branded NVIDIA pack remains optional
   and approval-gated, not the product identity.
- [NVIDIA's brand guidelines](https://www.nvidia.com/en-us/about-nvidia/legal-info/logo-brand-usage/)
   require written authorization for branded assets and prohibit recreating/stylizing its logo.
   Employment or an "unofficial" label is not permission. Check applicable employer side-project,
   IP and device-install policies before distribution or monetization; no internal approval is verified.

### Distribution: one extension, not one registry

| Host | Route / limit |
|---|---|
| VS Code desktop | Microsoft Marketplace; primary test host |
| Cursor | [Open VSX through Cursor's proxy](https://cursor.com/docs/configuration/extensions); security review and enterprise policies can affect visibility |
| Devin Desktop, formerly Windsurf | [Open VSX](https://docs.devin.ai/desktop/recommended-extensions); [rename FAQ](https://docs.devin.ai/desktop/devin-desktop-faq.md) confirms the same IDE |
| Other compatible forks | Their permitted registry or manual VSIX install; verify each host/version before claiming support |
| Devin Cloud browser IDE / vscode.dev | Separate runtime and installation-policy checks; not automatically covered by desktop support |
| Standalone Pi | [Terminal coding harness](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent), not a VS Code extension host |

Publish the same product/version to Marketplace and Open VSX, with a VSIX download where permitted.
Open VSX is distribution, not a second app or website. Pi inside a supported editor can coexist with
the charm, but the extension installs into the editor, not Pi. Do not promise every fork or bypass
allowlists. Test Windows/macOS, Cursor and Devin Desktop, plus Remote-SSH/WSL host placement.

For later URI triggers use `vscode.env.uriScheme`, not a hardcoded `vscode://` scheme. Also correct
the old licensing assumption: [SecretStorage](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
does **not** sync secrets across machines. Paid checkout and licence delivery are later work.

### Future: motivation in the bottom status bar

Separate optional feature, off by default: short original encouragement or licensed quotations,
quiet rotation, manual next/pause/hide, bounded width and a tooltip for longer text. No popups,
flashing, guilt-based streaks or productivity surveillance. Not an MVP dependency.

### Next gate

Agree on the placement compromise before building. Then test one placeholder charm in an actual
extension webview. **Hypothesis:** responsive pull/click physics can coexist with code editing, but
not free-floating placement. **Disconfirming check:** drag, release and park the charm while editing
beside it, including focus, clipping, resizing and occupied-space checks. Only after that gate:
free starter collection, coworker feedback, name/publisher clearance, packaging and both registries.

**Historical draft below: superseded by this research brief.** Its renderer promises, fallback ladder,
fixed art choices, payment assumptions and estimates are retained as context, not implementation
instructions or verified facts. In particular, neither SVG animation nor CSS positioning was tested.

---

## 1. The one thing that changes the whole design

**VS Code extensions cannot draw on the OS screen.** There is no API to float a window over the
desktop, and the extension host is sandboxed away from the Electron renderer's DOM. The original app
is a native always-on-top window; that is not portable.

So the charm hangs from the **top of the code editor viewport**, not the top of the display. Everything
else about the app — the sway, the click-through, the rituals, the gallery, the summon shortcut, the
`bless` hook — ports cleanly, and one of them (`bless`) ports *better*, because it lands inside the
editor where the developer already is.

The only route to a true screen overlay is patching `workbench.html` (what "Custom CSS and JS Loader"
does). It trips VS Code's checksum, shows users a **"Your installation appears corrupt"** banner, and
breaks on every update. **Not viable for a product.** Ruled out.

### Surfaces that can actually render

| Surface | Can animate? | Takes space? | Role here |
|---|---|---|---|
| **Editor decoration** (`after` attachment, SVG icon) | Yes, via SVG SMIL | No — overlays code | **The dangle** |
| **Status bar item** | Text swap only | One slot | The "tray/menu bar" charm |
| **Webview view** (sidebar) | Full HTML/CSS/Canvas/audio | A docked pane | The gallery |
| **Hover** (`MarkdownString`) | Static image | No — floats | Charm story + ritual trigger |
| **Quick Pick** | No | No — floats | Charm switcher |
| Gutter icon | Yes, via SVG | Gutter column | Fallback dangle |

---

## 2. How the dangle works

Verified against `vscode.d.ts` (`ThemableDecorationAttachmentRenderOptions`):

```
contentIconPath?: string | Uri;   // "an URI to an image to be rendered in the attachment"
textDecoration?: string;          // "CSS styling property that will be applied to the decoration attachment"
```

Both fields exist and are documented. The mechanism:

1. **Anchor** — take `editor.visibleRanges[0].start.line`, the top visible line.
2. **Attach** — apply a decoration to a zero-width range there with an `after` attachment.
3. **Draw** — `contentIconPath` is a `data:image/svg+xml;base64,…` URI holding the charm.
4. **Sway** — the SVG carries its own `<animateTransform type="rotate" values="-3;3;-3" dur="4s"
   repeatCount="indefinite"/>`, pivoting at the cord. **The animation runs inside the SVG, so the
   extension host burns zero CPU per frame.** This is the crux of the approach.
5. **Position** — CSS through `textDecoration`:
   `none; position:absolute; top:0; right:48px; pointer-events:none; z-index:10`.
6. **Follow** — re-anchor on `onDidChangeTextEditorVisibleRanges` and `onDidChangeActiveTextEditor`,
   throttled to ~60 ms.

Clicks pass through because decorations never capture pointer events — which gives us the original's
"everything else clicks straight through" for free.

### Risks — all resolved by the Phase 0 spike

| # | Risk | If it fails |
|---|---|---|
| R1 | Chromium may not run SMIL when the SVG is a CSS `content: url()` | Animate by swapping the data URI on a 100 ms timer (costs CPU) |
| R2 | `position:absolute` may be clipped by `overflow:hidden` on the view-line container | **The main risk.** Drop to fallback B |
| R3 | VS Code may sanitise the smuggled CSS | Drop to fallback B |
| R4 | Charm jitters during fast scroll | Throttle + ease; accept minor drift |

### Fallback ladder

| | Approach | Fidelity | Certainty |
|---|---|---|---|
| **A** | Absolute-positioned decoration, top visible line | Hangs and sways over code | Needs spike |
| **B** | Inline `after` on the top visible line, no positioning | Sways, sits at line end | High |
| **C** | `gutterIconPath` on the top visible line | Sways in the gutter | Very high |
| **D** | Status bar + gallery only | No dangle | Certain |

> **Architectural rule:** define a `DangleRenderer` interface and implement A–D behind it. The charms,
> rituals, state and licensing must never know which surface is live. This is what makes the spike a
> *choice* rather than a bet — if A dies, one file changes.

---

## 3. Module layout

```
src/
  extension.ts              activate / deactivate, wiring only
  dangle/
    DangleRenderer.ts       interface — the seam that absorbs the spike result
    DecorationRenderer.ts   fallback A / B
    GutterRenderer.ts       fallback C
    Anchor.ts               top-visible-line tracking, throttled
  charms/
    Charm.ts                id, name, origin, story, svg(state), ritual, tier
    registry.ts
    defs/                   nazar.ts, ghanta.ts, daruma.ts, emoji.ts
  ritual/RitualRunner.ts    transient state -> SVG swap -> revert
  gallery/GalleryView.ts    WebviewViewProvider: art, story, switch, unlock
  status/StatusCharm.ts     status bar item = the "tray"
  uri/BlessHandler.ts       single URI handler, routed by path
  license/
    LicenseStore.ts         SecretStorage
    verify.ts               offline Ed25519 signature check
media/charms/               SVG sources
```

---

## 4. Feature port map

| Original | VS Code port | Notes |
|---|---|---|
| Hangs from top of screen | Hangs from top of editor viewport | Best available |
| Sways | SVG SMIL `animateTransform` | Free, no CPU |
| Clicks pass through | Native to decorations | Free |
| Lives in menu bar / tray | Status bar item | Click = ritual |
| Drag along the top edge | `charm.position` setting + Quick Pick | No drag API |
| Keyboard shortcuts | `contributes.keybindings`, user-rebindable | **Better** — VS Code rebinding beats the original's Mac-only customisation |
| Summon / hide daily | `charm.toggle` command + shortcut | Direct |
| Gallery with each charm's story | Sidebar webview + decoration `hoverMessage` | Direct |
| `luckydangle://bless` | `vscode://<publisher>.<ext>/bless` | See below |
| Free future charms | Ships in extension updates | Direct |
| Appears in screenshots / screen shares | Same — it's in the editor | **Better for devs** |

### Bless — the feature that ports better

Confirmed from `vscode.d.ts`: the URI must be prefixed `vscode://<publisher>.<extension>`, and
**an extension may register only one URI handler in its entire lifetime** — so route on the path inside
a single handler.

**On the Windows PC (Git Bash), in `.git/hooks/pre-push`:**

```bash
code --open-url "vscode://<publisher>.<ext>/bless?charm=nazar"
```

Ship this hook and a `tasks.json` recipe in the README. A charm that rings before a deploy is a
stronger pitch to developers than a charm that rings on the desktop.

---

## 5. Art pipeline

**Do not auto-trace the generated raster.** Vectorisers emit 200+ paths that turn to mush at 24 px.

1. Generate a reference raster per charm: single object, front-facing, hanging from a cord, flat
   background, no text.
2. Import as a **reference layer** in Figma/Inkscape and redraw in ~10–30 paths. This redraw *is* the
   hand-clean step, and it is where the quality comes from.
3. Every charm uses the same skeleton so the renderer stays generic:
   ```
   viewBox="0 0 64 128"
   <g id="cord">    fixed at top
   <g id="body">    carries <animateTransform>, pivot at the cord anchor
   <g id="ritual">  hidden by default, revealed during a ritual
   ```
4. SVGO with a config that **preserves SMIL** — the default plugin set strips animations.
5. Budget **< 4 KB per charm** so base64 data URIs stay manageable.
6. **Cultural accuracy pass.** These are real religious and cultural objects — Nazar's ring order,
   Daruma's eye sequence, Hamsa's orientation. Getting them right is what makes the gallery worth
   reading, and it is the respectful default. Credit each origin as the original does.

**v1 charms** — three, chosen to prove all three interaction archetypes:

| Charm | Origin | Ritual | Archetype |
|---|---|---|---|
| Nazar boncuğu | Turkey / Mediterranean | Flick | Transient |
| Ghanta | India | Ring | Transient + sound |
| Daruma | Japan | Paint an eye | **Persistent state** |
| Emoji | Yours | — | User-supplied, free tier |

---

## 6. Freemium without a server

**Confirmed: the Marketplace has no payment, licensing, trial, or IAP infrastructure.** It offers only
a `pricing` label (`Free` / `Trial`) and a `sponsor` link. Everything else is yours to build.

**Design: offline-verifiable signed keys. No runtime backend.**

- On purchase, a store webhook signs `{email, tier, issuedAt}` with an **Ed25519** private key.
- The extension embeds only the **public** key and verifies the signature locally via Node's built-in
  `crypto.verify`. Zero dependencies, zero network calls, works offline, nothing to keep up.
- Key lives in `context.secrets` (SecretStorage) — encrypted, and it rides Settings Sync to the user's
  other machines.
- `package.json`: `"pricing": "Trial"` — the honest label for freemium.

| Tier | Contents |
|---|---|
| **Free** | 3 charms + any emoji. Full dangle, rituals, gallery, bless. **No nagging** — one unlock row in the gallery, zero toasts. |
| **Paid** | Full collection + every future charm |

**Store:** use a merchant-of-record (Paddle or Lemon Squeezy) so global VAT/GST is handled for you
rather than registering for tax in each jurisdiction as an individual seller.
⚠️ *Unverified:* whether either supports **UPI** at checkout, which the original offers. Confirm on
their live pricing/payment-methods page before committing — India-specific rails may need Razorpay
alongside, which does **not** handle global tax.

**Piracy:** ignore it. A cracked charm costs nothing and anti-piracy work costs weeks.

---

## 7. Build & release pipeline

- **TypeScript → esbuild** into one `extension.js`. Target < 100 KB.
- **`.vscodeignore`** aggressively — the VSIX should be small.
- **Tests:** unit tests for charm state and licence verification; `@vscode/test-electron` for anything
  touching decorations, since they need a real editor instance.
- **`activationEvents`: `onStartupFinished`.** Never `*` — an ambient extension that slows startup gets
  uninstalled.
- **`extensionKind: ["ui"]`** — forces the charm to run on the *local* machine, not the remote host.
  Without this it misbehaves over Remote-SSH / WSL / Codespaces.

**GitHub Actions**

| Trigger | Job |
|---|---|
| PR | lint · typecheck · test · `vsce package` (proves it packages) |
| Tag `v*` | package → `vsce publish` → `ovsx publish` → GitHub Release with the `.vsix` attached |

Secrets: `VSCE_PAT`, `OVSX_PAT`. Use `--pre-release` for a dogfood channel before each stable tag.

---

## 8. Launch checklist

### VS Code Marketplace
1. Azure DevOps organisation → PAT with scope **Marketplace → Manage**, set to **All accessible
   organizations**. *(Scoping it to a single org is the most common publish failure.)*
2. Create the publisher at `marketplace.visualstudio.com/manage`.
3. Manifest: `publisher`, `displayName`, `description`, `categories`, `keywords`, `icon` (128×128 PNG),
   `galleryBanner`, `repository`, `license`, `sponsor`, `pricing`.
4. **README is the store page.** An animated GIF of the dangle, above the fold, decides installs.
5. `CHANGELOG.md`, `LICENSE`.
6. Pin a real `engines.vscode` floor and actually test against it.
7. **Verified publisher** (blue check) — needs a domain you control plus a TXT record.

### Open VSX — this is what reaches Cursor
Verified from the Eclipse publishing guide:

8. Eclipse account whose **GitHub username exactly matches** your open-vsx.org login — a mismatch
   silently breaks the link.
9. Sign the **Publisher Agreement** (Settings → Profile → *Log in with Eclipse*). Distinct from the
   Eclipse Contributor Agreement.
10. Generate an access token — one per environment, so any single token can be revoked alone. The
    value is shown **once**.
11. `npx ovsx create-namespace <publisher> -p <token>` — note that creating a namespace does **not**
    make you its verified owner; claim that separately.
12. `npx ovsx publish`.

> Skipping Open VSX means the extension does not exist for **Cursor, Windsurf, VSCodium, Gitpod or
> Theia** users. Given you work in Cursor, treat it as required, not optional.

### Product
13. Store live, webhook → key issuance → delivery email.
14. Support route (GitHub issues is enough).
15. **Telemetry: ship none, and say so in the README.** If ever added, it must be opt-in and honour
    `telemetry.telemetryLevel`.
16. Web-extension target (`vscode.dev`) — decorations work there, but Node `crypto` does not, so
    licence verification would need WebCrypto. **Defer to v2.**

---

## 9. Two flags to clear before naming anything

1. **"Lucky Charms" is a General Mills trademark.** It is a live mark in food, and using it as a
   product name invites a takedown that the Marketplace will honour without argument. The folder name
   is fine; the *product* name needs to be something else. Pick it before the publisher ID is
   registered, because the publisher and extension ID are effectively permanent.
2. **The mechanic is not protectable — the expression is.** Reimplementing "a charm that hangs and
   sways" is fine. Copying *Lucky Dangle*'s name, artwork, page copy, or visual identity is not.
   Original art (already the plan) and original copy keep this clean. Crediting the inspiration
   openly costs nothing and is the honest move.

---

## 10. Phases

| Phase | Work | Est. | Exit criterion |
|---|---|---|---|
| **0 — Spike** | Throwaway extension: animated SVG in `contentIconPath`, CSS-positioned via `textDecoration` | 1–2 d | **Fallback A / B / C chosen on evidence** |
| **1 — Dangle** | `DangleRenderer` seam, one charm, anchor tracking, status bar, settings, toggle | ~1 wk | A charm hangs and sways over real code |
| **2 — Charms** | 3 charms, ritual state machine, `globalState` persistence, gallery webview, hover stories | 1–2 wk | All three ritual archetypes work |
| **3 — Bless** | URI handler, commands, keybindings, git-hook + `tasks.json` recipes | 2–3 d | `git push` rings the bell |
| **4 — Freemium** | Ed25519 keys, SecretStorage, store + webhook, unlock UX | 3–5 d | A real purchase unlocks the pack |
| **5 — Ship** | CI, both registries, README GIF, pre-release soak | 3–5 d | Installable from Marketplace **and** Cursor |

**Phase 0 gates everything.** Until the spike returns, treat fallback A as unproven.

---

## Verification status

| Claim | Source |
|---|---|
| `contentIconPath`, `textDecoration` exist on decoration attachments | ✅ `microsoft/vscode` `src/vscode-dts/vscode.d.ts` |
| Marketplace has no payment/licence/IAP layer; only `pricing` label + `sponsor` | ✅ VS Code publishing docs |
| URI handler is prefix-locked; one handler per extension lifetime | ✅ `vscode.d.ts` |
| Open VSX flow: Eclipse account → Publisher Agreement → token → `create-namespace` → publish | ✅ Eclipse openvsx wiki |
| **SMIL animates inside `contentIconPath`** | ❌ **Unverified — Phase 0 spike** |
| **`position:absolute` survives the view-line container** | ❌ **Unverified — Phase 0 spike** |
| Paddle / Lemon Squeezy support UPI | ❌ **Unverified — check their live docs** |
