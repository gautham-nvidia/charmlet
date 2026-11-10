# Live reactions, music and themed packs

The 0.11.0 extension / 0.8.0 desktop candidate expands the earlier playful-charms work to **200 included charms**: 175 rendered designs, Terminal, fifteen live companions and nine fidget/puzzle tools.

## What changed

- Nimbus uses a textured cloud with narrow cloud-fold eyes, sunrise, rain and a single local lightning bolt. Byte uses a metal body, jointed arms and a binary/code display. Both use the shared GPU/software renderer; Reduced Motion keeps reactions still.
- Music contains twelve instruments and controllers. California gains recognizable architecture and landscapes, including the original Infinite Loop campus rather than Apple Park. Diwali and Halloween join clearer shopping-day designs.
- Terminal is first and remains the fresh-profile default. Live 3D, Stress Busters and Music follow, with the remaining charms in themed packs. The settings selector, picker, website and optional download bundles use the same grouping.
- Bundled Soldering Iron and Digital Caliper retire. Saved choices move to Terminal; pins and cord preferences survive. Explicit imports remain the user's own data.
- Approved Cali artwork, outfits, gestures, all four spinners, three puzzle boards, 60–200% sizing, local photos, small wins and garden progress carry forward.

## Verification in progress

| Check | Evidence |
|---|---|
| Source types, lint and shared models | Passed; 95 models include new rig framing, all 200 saved selections, retirement migration and bounded settings-file retry |
| Artwork preparation | 219 review records; 176 featured including Terminal; all 24 new/replaced static designs prepared and synced |
| Live renderer | Eight reaction poses exported in GPU and software; distinct changing GPU textures verified; additional gaze captures checked |
| Source editor | All 13 scenarios passed: 11 in the full run, then both affected cases on a targeted rerun. New pack ordering, Music, live reactions, outfits, puzzles, photos, pins and persistence are covered |
| Installed extension | All six scenarios passed on the packaged 0.11.0 VSIX |
| Desktop | 13 models, the expanded development scenario and the extracted ZIP scenario passed. Eight fresh launches retained the initial topmost flag after the Windows fix |
| Website | Both checks passed: 200 charms, live tools, downloads, desktop/mobile layouts, 219 validated review PNGs and 47 app comparison links |
| Boundaries and artifact consistency | 28 artwork, Photo Studio and release-check models passed; VSIX bytes and website download agree |
| Hosted matrix | Current run results are tracked on [draft PR #30](https://github.com/gautham-nvidia/charmlet/pull/30/checks) |

The real Windows settings probe completed **1,000 writes** with a 50 ms reader, recovering three temporary rename locks. An aggressively continuous reader still exhausts the bounded retry; after that reader stopped, the next save succeeded in 16 ms. A permanently locked file returns an error and preserves the previous save.

The first editor run recorded native focus leaving during a sustained mouse hold; cancellation correctly released the squeeze. The unchanged case passed on the targeted rerun. The other failure was an old assertion for 23 raw metadata categories; it now checks the 15 themed packs. The full isolated hosted matrix remains required.

One extracted Windows launch reported `alwaysOnTop: false` despite the constructor setting. A separate packaged-app probe subsequently started correctly and preserved topmost across focusability and show/hide transitions; setting it explicitly did not take focus. The initial flag is now reapplied after the native page loads, before tray interaction, and the existing smoke scenario checks it on all four launches. The precise native cause of the intermittent loss remains unconfirmed.

Eleven new comparison sheets show the installed extension, extracted desktop, weather/code rendering, four Cali gestures, outfits, 200% sizing, four spinners, three puzzle boards and the new artwork. Native screenshots retain device pixels; the Windows display scaling makes its captures larger than the editor's fixed-density captures. Visual inspection found the weather states and Byte's displays distinct, the instruments and seasonal objects readable, and the revised landmarks recognizable. The artist studies remain review candidates.

Manual browser checks confirmed the Terminal default, the twelve-item Music filter and live WebGL mouse reactions: Nimbus cycled sunrise/rain/lightning, and Byte cycled binary/compile/cursor. Neither character reported an artwork loading error.

Ten artist-inspired concepts are separate local review material, including an optional validated ten-charm import pack. They are not part of the 200-charms core or an approved public/paid lineup.

PR #30 remains a draft. Website launch, pricing, source/artwork terms, publisher and signing remain owner decisions. Native macOS interaction and mixed-display validation remain separate from automated archive checks.
