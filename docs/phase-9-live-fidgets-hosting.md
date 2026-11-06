# Phase 9 - live companions, fidgets and hosting

The owner tested extension 0.7.0 and desktop 0.4.0 and liked both, especially Sunny. This candidate makes live reactions more prompt, adds interactive fidget tools, and prepares the website for the supplied Vercel team.

## Candidate behavior

- Extension **0.8.0** and desktop **0.5.0**, with **156 included charms**.
- Sunny reacts directly to pointer/press input, uses time-based gaze smoothing, greets and winks, and sleeps between reactions/blinks. Input smoothing reaches 95% in 84 ms in the model, independent of refresh rate; this is a model measurement, not an end-to-end latency guarantee.
- Nimbus is a lit cloud; Byte is a bevelled robot. Both have distinct shapes in WebGL and canvas fallback. Static SVGs remain thumbnails/final fallback.
- Fidget Spinner has an independently rotating rotor and friction. Bubble Pop has six reusable pressable surfaces. Worry Stone responds to holding/rubbing. Keyboard input and Reduced Motion are supported; all tools are silent.
- Live 3D and Stress Busters are first in the picker. The existing nine smiley/squishy designs remain included, bringing Stress Busters to twelve. The desktop remains charm-only by default.
- [Vercel configuration and account instructions](vercel-hosting.md) and [monetization/Stripe guidance](monetization-and-payments.md) accompany the candidate. Paid access remains disabled.

## Local verification - 2026-11-05

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

## Candidate artifacts

These are trial artifacts, not published releases. Rebuild from the final checkout after merging; Windows line-ending conversion can change packaged bytes even when Git trees match.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `extension/charmlet-0.8.0.vsix` | 9,536,962 | `ef36721df8963816aed6fb3a09ac22cb1f2aaaa23e2784fb29e7e25ae2fc2562` |
| `desktop/distribution/Charmlet-desktop-0.5.0-win32-x64.zip` | 167,734,133 | `bc3714d7adbb6a7effa14eed76e28d18586a4905f1f91018c2d1f12eb2e1408a` |

## Public release decisions

Source and artwork licences, public starter/optional lineup, publisher ownership/credentials, Windows signing, macOS signing/notarization and remaining native platform coverage are still open. The owner has approved the trial's overall look; that is not a licence grant or a final pricing decision. Vercel hosting and merchant activation are separate from app-store publishing.
