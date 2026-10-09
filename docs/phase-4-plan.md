# Phase 4 — Focus, Learn and Grow

**Implementation progress, 2026-10-08:** Focus/Learn and Garden/Gentle Reminders are implemented in 0.4.1, with all six hosted editor targets passing. The website now has sixty free extras and an interactive swing demo, verified locally. Paid Photo Studio preparation and the desktop beta remain the next slices. See the root README, [verification record](phase-4-validation.md) and project log for current evidence; this document retains the kickoff requirements below.

**Owner direction, 2026-10-08:** build Charmlet into a useful, original coding companion. Prioritize the IDE release while developing the website and a working Windows/macOS desktop beta alongside it. Store availability is Phase 5; the broader product launch is Phase 6.

This is the Phase 4 implementation plan. The current installable baseline is still 0.3.2; the features below are not marked delivered merely because they are planned.

Tracking: [Phase 4 #17](https://github.com/gautham-nvidia/charmlet/issues/17) · [Phase 5 store launch #18](https://github.com/gautham-nvidia/charmlet/issues/18).

## Product promise

**A small silicon-inspired companion that helps you focus, learn something interesting and leave work a little better than you found it.**

Keep the charm playful, the UI compact and the useful features free. Use original art and a consistent graphite/mint/copper visual language. Engineering quality means responsive input, reliable persistence, accessibility, quiet defaults and clear installation—not a claim of NVIDIA affiliation or endorsement.

## The new phase sequence

| Phase | Scope | Exit |
|---|---|---|
| **3 — Engineering baseline** | 0.3.2, reliable local preferences, installation preparation and desktop VS Code matrix; merged in PR15/16 | Completed engineering baseline. Remaining publishing and host decisions are carried forward explicitly |
| **4 — Build the companion** | IDE productivity, learning, garden, original free catalogue, website commerce/photo-studio preparation; parallel desktop beta | Reviewed feature-complete candidate, migration/clock/accessibility tests, verified IDE matrix, functioning website download flow and desktop beta evidence |
| **5 — Extension-store launch** | Publisher/license decisions, live installation pages, Marketplace/Open VSX, actual verification in launch-target editors | People can find and install the same free product/version; website free downloads/install help are reachable |
| **6 — Product launch** | Public announcement, support/onboarding, low-price artwork and paid Photo Studio when checkout is ready; desktop availability follows IDE rollout | Public product and purchase/delivery experience verified; desktop can follow separately if signing/device checks need longer |
| **7+ — Further integrations** | Other IDE families, licensed fandom/brand packs, community contributions and deferred experiments | Each addition gets its own scope, rights review where needed, branch and verification |

Each phase retains its own branch and merges to main before the next phase begins. Phase 4 uses `feat/phase-4-companion`; its PR stays draft until the implementation exit criteria are met. The owner explicitly moved launch decisions into Phases 5/6, so the previous publication-before-Phase 4 sequence is superseded.

## Free and paid boundaries

| Offering | Model |
|---|---|
| IDE extension and proposed desktop core | Free |
| Focus timer, learning cards, wellness reminders, garden and earned flowers | Free |
| Ten bundled original charms and the existing six website extras | Remain free |
| Expanded original free collections | Free downloads from the website |
| Import/remove packs, choose layouts, size/cord/motion and accessibility controls | Free, offline after import |
| Optional premium original artwork | Low-price, one-time website purchase; download and import |
| **Personal-photo creation** | **Paid website Photo Studio**; produces a normal pack that the free app imports |

The paid Photo Studio is the explicit exception requested by the owner. It supersedes the earlier assistant recommendation for a free image creator. It does not introduce an IDE Pro tier or subscriptions for focus/garden features. The importer accepts compatible files freely; it is not DRM.

**The website is the only distribution/sales surface for additional downloaded charms.** The IDE may open the website and import a downloaded file; it does not become another storefront. Garden flowers are locally earned rewards, not downloaded products.

Recommended starting price exploration: approximately US$1.99–$2.99 for a small premium pack, with the Photo Studio price decided separately. These are proposals, not approved live prices; merchant fees and feedback must inform the final choice.

## Requested release features

| Feature | User experience | Important behavior |
|---|---|---|
| **Focus sessions** | Choose 25/5, 50/10 or custom focus/break lengths; start, pause, resume and stop from a compact control | Small peg progress ring; do not change the saved resting cord. Quiet completion, optional sound/notification. No forced break overlay |
| **Learning cards** | Mix coding/AI/silicon facts and trivia; reveal an answer, move to the next card, or open its source | Facts/trivia become the learning default; encouragement remains optional. Preserve message visibility/rotation preferences |
| **Water reminder** | Optional gentle reminder, Done, Snooze or Skip | Off until enabled, configurable interval, one pending cue rather than a backlog of alerts |
| **Stand/move reminder** | A small break suggestion during long sessions | Coordinate with focus/break state; avoid interrupting a focus session by default |
| **Seed garden** | Plant an unknown seed, water it once per day, reveal a flower on watering 11 | Missing days pause growth; no death, reset, guilt or paid acceleration. The flower becomes a selectable Charmlet automatically |
| **More free artwork** | Browse original computing, testing, AI/code and nature/place collections on the website | Proposed launch target 60 free website designs in total, including the six already available; keep the ten bundled defaults |
| **Paid Photo Studio** | Select a photo of a pet or loved one, crop it and choose a small keepsake frame | Preview privately; paid creation/export access. Export a bounded static-image pack, never executable content |
| **Desktop beta** | The same companion outside the editor, controlled from a tray/menu bar | Parallel development; IDE release has priority. Public desktop launch follows its own signing/device checks |

The 60-design target and 12-flower palette below are planning targets for review, not a claim that those assets exist. See [the original collection brief](phase-4-original-collections.md).

## Useful coding additions I recommend

These recommendations answer the owner's request for productivity beyond stickers. They are distinct from the requested features above; keep their scope small and review them before expanding the release.

| Idea | Why it helps | Proposed priority |
|---|---|---|
| **One-line focus intent** | Start a session with “finish the failing parser test” instead of an empty timer | Add with the focus timer; optional, stored locally |
| **Leave a breadcrumb** | Save an explicit next step and optional current file/line before a break; return to it later | Phase 4 if the focus experience remains compact |
| **Small wins** | A gentle celebration when a user-selected VS Code task finishes successfully | Phase 4 after the core; opt-in and driven by the task API, not guessed terminal text |
| **Debug duck prompts** | A short expected/actual/next-experiment checklist helps unblock thinking without another AI account | Stretch; no automatic source-code reading |
| **Bookmark a useful fact** | Revisit a small personal learning shelf instead of losing an interesting card | Stretch after the basic feed works |

Avoid competing with the IDE's full task manager, AI assistant or issue tracker. No screen/workday capture, simulated availability, global keystroke recording or compulsory productivity scoring is needed for this product.

## Garden rules

1. A planting creates a persisted plant ID and chooses its future flower once. Reloading does not reroll it; the species stays visually unrevealed until bloom.
2. Watering is allowed once per **host-local calendar day**. The first watering counts as 1. A second click or reload on the same day cannot add progress.
3. A missed day leaves progress unchanged. A backward clock/date must not grant another watering; the app is an offline personal companion, not an anti-cheat service.
4. The eleventh distinct watering day changes the plant to bloomed and adds its original flower charm to **Grown by you** exactly once. The model saves that transition before confirming it in the UI.
5. The flower stays available offline. The user can keep it hanging and plant another seed; a new planting does not erase the collection.
6. Prefer an uncollected species while any remain. After the proposed 12-species set is complete, another bloom can add a keepsake count rather than promise an endless stream of unique species.
7. Planting, watering, flower rewards and collection access stay free. No paid seeds, random paid rewards or growth skips.

The garden uses its own original seed/sprout/leaf/bud/bloom artwork. This takes inspiration from the growth idea without copying Charmling's illustrations, text or UI.

## Learning content

Proposed first content batch: 60 short sourced facts and 30 trivia cards, alongside the existing 80 optional encouragement messages. Topics include public computing fundamentals, CPUs/GPUs, memory, language/AI accelerators, machine learning, semiconductors, generic testing and coding craft.

Each factual/trivia card needs a stable ID, category, original concise wording, answer/explanation where applicable and an authoritative public source. Avoid fragile performance comparisons, invented “facts,” proprietary 93K/TM data and unsourced company claims. A timer or trivia completion is not evidence of actual productive work.

Keep the card in the existing position below the charm and above controls. Use a clear Fact/Trivia label; trivia answers reveal on request. Retain Next, automatic-rotation control and hide. Reading or answering should not unexpectedly lose the current card.

Sample writing, with public sources checked 2026-10-08; these are examples for the new feed, not shipped content:

| Kind | Example card | Source |
|---|---|---|
| Git fact | “A Git branch is a movable pointer to a commit. Creating a branch doesn't make a second copy of your project.” | [Pro Git: Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell) |
| GPU trivia | “In CUDA's execution model, how many threads form a warp?” Reveal: **32**. | [CUDA Programming Guide](https://docs.nvidia.com/cuda/cuda-programming-guide/03-advanced/advanced-kernel-programming.html) |
| Coding fact | “One character on screen can contain several Unicode code points. Grapheme clusters help text tools work with the characters people perceive.” | [Unicode Text Segmentation](https://www.unicode.org/reports/tr29/) |
| AI fact | “A token isn't always a word. Language models can split text into words, word pieces or individual characters.” | [Google's introduction to language models](https://developers.google.com/machine-learning/crash-course/llm) |

## Compact interaction design

The primary dock remains a charm with a small focus indicator and one learning card. Add a compact **Focus / Learn / Garden** drawer rather than permanently stacking every tool below the charm. Wellness preferences live in settings and reminders share one quiet cue area.

Keyboard, screen-reader labels, high contrast and reduced motion are required. Do not announce countdown seconds continuously. Do not steal editor focus, open surprise dialogs, rearrange the user's panes or create permanent animation work while settled/hidden.

## Engineering direction

| Shared piece | Host responsibility |
|---|---|
| Pure focus/reminder/garden state transitions with injected clock/random source | VS Code adapter owns commands/status/webview messages; desktop adapter owns tray/window/notifications |
| Validated companion state and original asset definitions | Each host persists complete local state through the proven serialized file-write/readback approach |
| Learning-card content and pack format | Website distributes packs; apps import and use them offline |
| Renderer/physics behaviors | Host adapter supplies theme, visibility and allowed external-link/file actions |

Keep existing charm preferences compatible. Companion state will have a separate versioned schema for timer/reminders/garden/collection instead of silently adding nested values to the current flat preference matcher. Centralize the atomic JSON-store seam so both hosts use the same validated behavior.

Timer state must preserve a deadline or paused remainder rather than depend on animation frames. After sleep/restart, recover one meaningful state and never manufacture a night of completed sessions/breaks. A finished timer means the timer ended; any “work done” note is explicitly supplied by the user.

Recommended desktop prototype: Electron, using a restricted preload bridge, the existing renderer/Node pack validation and local persistence. Add transparent selective click-through, tray/menu-bar controls, monitor/DPI handling and sleep/lock behavior. No injection into another application's UI.

Photo Studio should process images locally where practical, strip metadata from exported static PNGs and avoid retaining personal photos. Paid entitlement/checkout belongs to the website; no merchant secret or billing dependency goes into the extension. Phase 4 can validate a test-mode purchase/export flow; real accounts/prices/transactions require owner setup and release approval.

## Delivery slices on the same Phase 4 branch

| Slice | Deliverable | Evidence required |
|---|---|---|
| **4A — Shared core and Focus/Learn** | Host adapter seam, timer, optional intent, sourced cards and compact UI | Clock/migration/unit cases; real-editor start/pause/resume/reload; accessibility and hidden-view behavior |
| **4B — Care and garden** | Optional water/move reminders, one-per-day watering, 11-session bloom and permanent flower collection | Fake-clock tests across dates/DST/restarts, duplicate-click protection, saved rewards and no missed-day penalty |
| **4C — Original catalogue and website** | Curated free collection batches, clear free/paid/earned labels, demo and import help | Art/provenance review, actual pack exports/parser checks, desktop/mobile/download checks |
| **4D — Paid Photo Studio preparation** | Private local image preview/crop/frame/export plus website entitlement seam | Bounded-image validation, no metadata leakage, test-mode entitlement/delivery verification; no fake live Buy controls |
| **4E — Parallel desktop beta** | Shared focus/garden/pack engine in a working Windows/macOS shell with tray/menu bar | Actual build/run evidence per target, click-through/no-focus-steal, monitor/restart/sleep behavior |
| **4F — Release candidate** | Consistent docs, migration and supported-editor matrix | Complete reviewed feature checks, package/site artifacts and agreed launch scope before Phase 5 |

4E can progress alongside 4A–4D once the shared interfaces are stable. It must not delay a ready IDE launch. The paid Studio and merchant-dependent tests remain explicit dependencies if owner credentials are not yet available.

## IDE and release scope

The first target is the **VS Code extension ecosystem**: VS Code, Cursor and Devin Desktop, with Windsurf/VSCodium considered only after their actual installation/runtime checks. “VS Code compatible” is not proof that an authenticated fork works.

JetBrains/Android Studio, Vim/Neovim and other IDE families need different integration surfaces and belong in Phase 7+ unless separately authorized. Browser-host support and Remote-SSH/WSL must also be explicitly verified or excluded from the launch claim.

Phase 5 carries the unfinished publisher ownership, source/art licensing, store-listing and host-verification decisions. It also needs a reachable website for free downloads/install help. Phase 6 is the broader launch campaign and activation of ready commerce/desktop offerings; it is not permission to skip those gates.

## Rights and quality rules

Use original code/art/copy and retain existing dependency notices. Generic computing components, original city/nature landscapes and flowers avoid the need to obtain another product's character-art license. Do not use NVIDIA/Groq/Marvel/DC logos, official national-park badges, copied photographs or competitor assets without the appropriate rights.

Another app's free download or one-time purchase does not grant rights to redistribute its artwork. [Charmling's terms](https://charmling.app/terms), reviewed 2026-10-08, describe a perpetual, non-transferable licence to use the application on one Mac; that is not a blanket reuse licence for our project. Our own source/art distribution license still needs an owner decision in Phase 5. The project remains independent; “silicon quality” describes the craft and audience, not NVIDIA sponsorship.

## Current kickoff status

- [x] Owner's Phase 4–7 sequence and paid-photo exception recorded.
- [x] Phase 4 branch created from merged main.
- [x] Concrete feature, garden, content, catalogue, host and validation direction prepared.
- [ ] Phase 4 implementation slices delivered and verified.
- [ ] Phase 4 PR ready to merge.
- [ ] Phase 5 store/publication decisions completed.

Current 0.3.2 remains the tested installable build. No feature in this plan should be advertised as available until its implementation and evidence land.
