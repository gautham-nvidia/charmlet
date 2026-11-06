# Phase 9 - live companions, fidgets and hosting

The owner tested extension 0.7.0 and desktop 0.4.0 and liked both, especially Sunny. This candidate adds prompt live reactions, working fidgets, a California-inspired motivational mascot and ten pets, while preparing the website for the supplied Vercel team. Website launch, prices and paid-charm choices remain deferred for the owner's review.

## Candidate behavior

- Extension **0.9.0** and desktop **0.6.0**, with **167 included charms**: 159 rendered designs, Terminal, four live companions and three fidget tools.
- Cali is an original golden bear, with WebGL and Canvas renderers, a forward gaze, quick reactions and brief passive encouragement bubbles. Its optional name, text and focus-prompt preferences stay local. No chat service or speech is required. Only selecting Cali enables its bubbles; existing favourites remain selected.
- New pets: giant panda; Golden Retriever, Labrador, German Shepherd, Husky, Corgi, Beagle and Goldendoodle; Silver Tabby and Tuxedo Cat. Neutral-fur background spill was removed in an opt-in preparation profile, preserving alpha and the cats' natural eye colours.
- Cali acknowledges new wins and live focus completion, with confetti when celebrations are enabled. Start/halfway prompts and occasional encouragement use the current focus intention and the local motivation deck. Reduced Motion cancels ongoing reactions; bubbles do not take focus or intercept pointer input.
- Sunny reacts directly to pointer/press input, uses time-based gaze smoothing, greets and winks, and sleeps between reactions/blinks. Input smoothing reaches 95% in 84 ms in the model, independent of refresh rate; this is a model measurement, not an end-to-end latency guarantee.
- Nimbus is a lit cloud; Byte is a bevelled robot. Both have distinct shapes in WebGL and canvas fallback. Static SVGs remain thumbnails/final fallback.
- Fidget Spinner has an independently rotating rotor and friction. Bubble Pop has six reusable pressable surfaces. Worry Stone responds to holding/rubbing. Keyboard input and Reduced Motion are supported; all tools are silent.
- Live 3D and Stress Busters are first in the picker. The existing nine smiley/squishy designs remain included, bringing Stress Busters to twelve. The desktop remains charm-only by default.
- [Vercel configuration and account instructions](vercel-hosting.md) and [monetization/Stripe guidance](monetization-and-payments.md) accompany the candidate. Paid access remains disabled.

## Expanded candidate verification - 2026-11-06

Shared type/lint/build and all 86 model tests pass, including schema-four migration, preference validation, clock recovery and avoiding repeated win announcements. The new editor scenario checks passive bubble geometry, keyboard encouragement, renderer fallback, edits while saving, local preferences, focus cues, confetti, opt-outs, reload and all ten pet images with cord contact. Source and installed runs now verify the second name save; pointer diagnostics remain after the initial unsuccessful second-save attempt.

| Expanded local check | Result before the final hosted matrix |
|---|---|
| Shared build, lint and model tests | Pass; 86 models |
| Desktop build and models | Pass; 12 models |
| Expanded desktop development smoke | Pass, 46.1 seconds; personal settings, confetti, quiet opt-outs, ten pets and restart, plus existing imports/photos/garden/tools |
| VS Code 1.90 scenarios | All 12 pass, 6.4 minutes, including four installed-VSIX scenarios |
| Rebuilt installed VSIX checks | All four pass, 1.3 minutes |
| Website | Pass; 167 unique charms, all collections/downloads, no desktop/mobile overflow or page errors |
| Artwork review | Pass; 201 validated PNGs, 160 selected designs, 29 app comparisons and 23 packs |
| Assistant visual inspection | Both pet sheets, Cali's normal/fallback rendering, encouragement and win captures inspected at 100% charm setting |

The older platform failures were addressed separately: `76ea1f8` waits for companion readiness and a complete idle interval; `3ca58c7` cancels an unfinished greeting when Reduced Motion is enabled and exercises that transition in a single task. All eight hosted jobs passed at `3ca58c7`: [editor matrix](https://github.com/gautham-nvidia/charmlet/actions/runs/42189259972) and [desktop archives](https://github.com/gautham-nvidia/charmlet/actions/runs/42189260060), including isolated native Windows input. Those results precede the new mascot and pets; [PR #29](https://github.com/gautham-nvidia/charmlet/pull/29) carries the final candidate and post-merge results.

The installed 0.9.0 captures add both pet sheets and Cali's encouragement/win views to the review page. Original capture pixels are retained; the desktop sheet uses the development app and the win view exercises the Canvas fallback. These are assistant review captures, not the owner's final public-artwork selection. Final artifact hashes belong to the finished checkout's readiness record.

The records below describe the earlier 0.8.0/0.5.0 trial.

## Earlier local verification - 2026-11-05

| Check | Result |
|---|---|
| Shared type/lint/build and 83 model tests | Pass |
| New real-editor live/fidget scenario, VS Code 1.140 | Pass; all three faces, visible groups, keyboard tools, Reduced Motion, first-frame gaze, idle rest and saved selection |
| Existing photo/wins/Sunny scenario, VS Code 1.140 | Pass |
| Editor regression scenarios | Eight passed initially; the two failures passed after the fixes below, including the full 3.5-minute editor scenario |
| Installed 0.8.0 VSIX | All three checks pass: live/fidget tools, photos/wins, Restricted Mode and garden progress |
| Desktop model tests and development smoke | Twelve models and expanded app smoke pass |
| Extracted Windows 0.5.0 archive | Pass, 45.8 seconds; state, local photos, live companions, tools and Reduced Motion |
| Website and review page | Pass: 156 charms, 191 current/archive PNGs, 25 app comparisons, 82 original comparisons, 22 packs; no page errors or mobile overflow |
| Artifact release guard | Pass for the VSIX; source/artwork licences still block publication |
| Hosted platform/native Windows matrix | Pending |
| Deployment under `greensilver-personal` | Login remains incomplete; static files and root build configuration are prepared |

The regression run caught a 55 ms squeeze transition that overrode Reduced Motion. Matching selector specificity fixes it in both the app and website; the checks require a computed zero-duration transition while held. An unrelated VS Code plugin-marketplace update error also covered the secondary-side toolbar. The test dismisses only that specific editor notice; application notifications and interaction assertions remain.

Nine captures from the installed 0.8.0 VSIX show the three companions, three fidgets and three light-background examples at 100% size with normal motion enabled. Each panel is a separate selection. No packs were imported and garden progress was unchanged. The review page preserves the older 0.7.0 comparisons under their original version.

The local Windows packager completed its output but failed the final directory rename. The recovered package was checked against every current built file and every staged runtime file before the extracted archive test passed. Hosted packaging remains an independent gate.

Local desktop automation checks renderer behavior and host configuration. Isolated native Windows input, native macOS behavior and mixed-display validation have separate scopes; the current hosted matrix is still required before merging.

## Initial candidate artifacts at `49b6e1d`

These hashes identify the initial locally tested candidate, not a published release. Later builds and final hosted results are recorded in [PR #29](https://github.com/gautham-nvidia/charmlet/pull/29). Rebuild from the final checkout after merging; Windows line-ending conversion can change packaged bytes even when Git trees match.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `extension/charmlet-0.8.0.vsix` | 9,536,962 | `ef36721df8963816aed6fb3a09ac22cb1f2aaaa23e2784fb29e7e25ae2fc2562` |
| `desktop/distribution/Charmlet-desktop-0.5.0-win32-x64.zip` | 167,734,133 | `bc3714d7adbb6a7effa14eed76e28d18586a4905f1f91018c2d1f12eb2e1408a` |

The first hosted Mac archive passed, and Windows passed native movement, click-through and long-pull checks. Windows then caught a redundant live-face redraw after closing controls returned focus to the underlying window. Dispatching blur while Reduced Motion was enabled reproduced the extra frame locally. Gaze reset now skips repainting when both the target and current gaze are already centred; the desktop check includes that blur and retains the unchanged-frame assertion.

## Public release decisions

Source and artwork licences, public starter/optional lineup, publisher ownership/credentials, Windows signing, macOS signing/notarization and remaining native platform coverage are still open. The owner has approved the trial's overall look; that is not a licence grant or a final pricing decision. Vercel hosting and merchant activation are separate from app-store publishing.
