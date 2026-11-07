# California companions candidate

Extension **0.10.0** and desktop **0.7.0** redesign Cali as a sharper California grizzly and add eleven California companions. The candidate contains **178 offline charms**, including fifteen live companions. Artwork remains for the owner's design review; website launch and paid offerings remain deferred.

## Appearance and behavior

| Character | Change |
|---|---|
| Cali | Consistent grizzly face, textured fur, small ears, a stronger muzzle and a Silicon Valley coder wardrobe |
| Daily outfits | Monday denim, Tuesday hoodie, Wednesday vest, Thursday flannel, Friday coastal shirt, Saturday trail fleece, Sunday knit |
| Cali reactions | Prompt gaze, blinking, head and arm movement, thumbs-up, wave and cheering pose |
| California family | Coast Redwood, Yosemite, Lake Tahoe, Western Gull, Harbor Seal, Golden Gate, Santa Cruz Otter, Pacific Gray Whale, Pacific Dolphin, California Condor, Golden Eagle |
| Controls | Live Companions remains near the front of the picker; encouragement, focus cues and celebrations retain their saved opt-outs |
| Desktop | Charm and cord by default; controls open on demand; brief encouragement stays optional |

Cali and the California family use detailed illustrated textures on curved surfaces. Cali also has separately animated head, arms and paws; the regional figures have gentle live glances and whole-figure reactions. The same geometry and artwork feed the GPU and software renderers. Sunny, Nimbus and Byte retain their procedural rendering.

The wardrobe follows the local calendar using the existing midnight scheduler. It also refreshes when a hidden view returns. Reduced Motion stops idle animation and uses immediate still feedback for deliberate actions. The new detailed figures do not use the stress-ball squash.

## Asset handling

`website/live-art-assets.json` records the hashes, dimensions, model and source references for 32 bundled files: seven outfit frames, two gesture references, eleven regional frames and twelve thumbnails. Frames are 512px; thumbnails are 216x252px. Runtime assets are local; image generation is an authoring-only operation.

The head and body framing remain registered across Cali's outfits. Foreground clipping, chroma removal, natural foliage, reflected green and limb joints were inspected on light and dark backgrounds at default charm size. Earlier rejected concepts remain in the ignored authoring history. Cord hooks use each figure's visible attachment point, including the whale's raised tail.

## Verification

| Gate | Evidence / status |
|---|---|
| Shared TypeScript, lint and build | Passed locally |
| Shared model suite | 88 passed, including weekday/local-midnight outfits, complete bundled frames, hook pixels, saved cord precedence and existing DST coverage |
| Editor mascot scenario | Passed with deterministic reaction/midnight boundaries, current outfit, rendered cheer, GPU-loss fallback, saved encouragement/opt-outs, all eleven regional figures, hook contact and restart |
| Installed extension | All four 0.10.0 VSIX scenarios passed on Windows / VS Code 1.145.0: live/fidgets, Cali/California, photos/wins and Restricted Mode/garden |
| Desktop models and expanded scenario | Twelve models passed; the expanded 0.7.0 scenario passed in 51.1 seconds, including all eleven California selections |
| Extracted Windows archive | 0.7.0 ZIP extracted and passed its 59.8-second scenario in an owned profile |
| Production dependency audit | `npm --prefix extension audit --omit=dev --json`: zero reported vulnerabilities |
| Website | Main gallery and review checks passed: all fifteen live companions, whale hook contact, queued visibility changes, downloads, mobile layout and no browser errors |
| Artwork, Photo Studio and package boundaries | 28 tests passed; catalogue synchronization and exact VSIX/website agreement passed |
| Hosted platforms | Required gate: Windows/Linux/macOS on VS Code 1.90.0 and 1.140.0, plus both desktop archives. Consult the candidate PR's checks for current results |

The full local editor run exposed a timer boundary: a reaction could expire during drawing, then lose its scheduled return to rest. The same boundary could skip an outfit change at midnight. A controlled before/after probe reproduced both failures; pending deadlines now remain until painting consumes them. The installed editor also exercises both boundaries with controlled clocks.

One initial installed Sunny keyboard-hold attempt stayed in the resting expression without an input trace. Its original cause is unconfirmed. The check now brings its owned editor forward, verifies webview focus and records keyboard diagnostics. The subsequent four-case run passed; the trace confirms Space reached the focused charm and produced the held expression.

The expanded website check also caught a live preview remaining hidden after quickly returning from the catalogue. Browsers can deliver an exit and an entry in the same visibility callback; the demo now uses the most recent observation. A regression using both recorded observations failed before this change and passed afterward.

The verified baseline is extension 0.9.0 / desktop 0.6.0 from PR #29. Earlier platform evidence is in [Phase 9](phase-9-live-fidgets-hosting.md). The Phase 10 results above are local checks; hosted Windows/Linux/macOS checks remain a separate gate.

## Local review packages

| File | SHA-256 |
|---|---|
| `extension/charmlet-0.10.0.vsix` | `1a0d9266310fa62ba41d7c0cc0e63cf3c29975e3b3a179a464d609b190878ab5` |
| `desktop/distribution/Charmlet-desktop-0.7.0-win32-x64.zip` | `f48b1340d708f0cf770400db6d8b8dd94f571dfcaf289479698811a9c996a118` |

The review page includes native installed-editor and desktop-development captures, plus separate shared-renderer sheets for all seven outfits and detailed light/dark comparisons. The desktop ZIP was independently extracted and checked; the review sheet is labelled with its development capture source.

## Remaining release decisions

The owner still needs to review the new artwork and decide the final public/free/paid lineup, source and artwork terms, publisher identity and signing. Builds remain unsigned. Native macOS and mixed-display validation remain separate from automated archive checks. The Vercel configuration is prepared, with public deployment deferred; the Photo Studio and live purchases remain disabled.
