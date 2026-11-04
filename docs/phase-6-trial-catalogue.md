# Phase 6: the complete trial collection

Owner direction recorded 2026-11-03, after the verified 0.5.2 review.

## Goal

Make the curated collection and the requested additions available immediately in the extension's visual picker. The owner should install one review build and try the artwork without importing separate packs. This is a trial distribution decision; the final bundled, free-download and paid-download split remains undecided.

Target review versions: extension 0.6.0 and shared desktop 0.2.0. These are planned versions until packaging and verification complete.

## Accepted artwork and correction

- Evil Eye is accepted. The owner said the rest of the current designs are good.
- Keep Probe Card: it is much better, though its identity is harder to recognize at a small size. Preserve this feedback when assessing the picker and enlarged preview.
- Keep Kovil and the original Terminal.
- Drishti Doll needs a new revision: the current image is a face, not a complete doll. Verify the traditional full-body form and render a recognizable head, torso, arms and legs. Preserve the rejected face artwork as history.
- Do not restore the previously rejected abstract technical concepts merely to increase the count.

## Expansion

Prepare recognizable photographic-style renders through the already approved Gemini route. Preserve accepted images and generate only additions and explicit corrections.

- Lab instruments: ATE tester, oscilloscope, precision tweezers, multimeter, inspection microscope, soldering iron, bench power supply and digital caliper. Use generic, unbranded equipment; no private tester documentation or proprietary board layouts.
- Solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune, plus the Sun. Planet appearance should be recognizable and rings should not be added to every planet.
- Cosmos: the Milky Way and an explicitly imaginative parallel-universe design. Keep the existing fantasy Ringed Planet distinct from Saturn.
- Gemstones: a varied small collection such as diamond, ruby, emerald, sapphire, amethyst, opal, citrine and rose quartz.
- Zodiac: all twelve conventional signs, with distinct, accurate silhouettes and consistent material treatment. Check symbol accuracy visually.
- US holidays: extend the current Halloween, Thanksgiving, Christmas, Black Friday and Cyber Monday set with major fixed-date and weekday-relative occasions. Include Santa and reindeer, with several Christmas objects for seasonal variety.
- Sacred traditions: a respectful set of Tamil Hindu figures, such as Ganesha, Murugan, Nataraja, Meenakshi, Perumal and Andal, plus appropriate broader figures/symbols. Keep recognizable iconography and the existing preference to omit “Tamil” from displayed collection/design names. Use original representations, not copied modern temple sculptures or branded religious merchandise.

The exact manifest should follow visual quality, not an arbitrary count. New sacred objects, glyphs and unfamiliar equipment need semantic inspection as well as PNG validation.

## Availability and saved state

- Include every active curated design and the new additions in the trial build, with clear search/category access.
- Include flower artwork for trial selection without marking flowers earned, advancing the garden, or rewriting the owner's progress.
- Retain the original ten designs and existing imported packs and selections. Avoid confusing duplicate versions in the picker.
- Keep previously shared download payloads immutable. Changed payloads receive new pack identities.
- Bundle the assets for offline use; opening the picker must not require a remote image service or API key.
- The website and README must explain that all trial artwork is included and that release pricing/placement will be chosen later.

## Holiday behavior

Holiday selection should be on by default for the trial experience and use the device's local calendar. Provide a clear pin/off escape hatch and preserve the normal saved choice behind seasonal display.

Broaden date handling beyond the current five occasions, including weekday-relative US holidays and Christmas-season variety. Verify year boundaries and any Easter/observed-date rules actually implemented. Do not silently rewrite garden progress or unrelated preferences. Inspect existing saved pin/opt-out semantics before choosing the migration.

## Delivery and verification

1. Prepare and visually inspect the Drishti correction and representative ATE/deity samples, then complete the authorized additions.
2. Validate transparent exports and small-size readability; generate the curated trial catalogue from the same artwork metadata used by the site.
3. Integrate bundled availability and holiday defaults in the shared app, preserving Reduced Motion, imports, earned progress and ordinary choices.
4. Update the website, review gallery, README, changelog and project log alongside the implementation.
5. Verify fresh and existing installations, all included assets, category/search access, holiday selection, pin/off behavior, garden persistence, squeeze and release. Keep editor screenshots outside press/release gestures and fake dates only inside Charmlet's frame.
6. Build the VSIX and desktop review package, capture the actual app, then complete the established branch/PR/hosted-check/main verification workflow.

Public/store release, source/art licensing and final pricing remain separate owner decisions. Named athlete/league ideas retain their existing rights gate. Paid checkout remains disabled.

## Implementation checkpoint - 2026-11-03

- Prepared all 176 authored images with no export failures. The review selects 135 designs and offers 22 optional packs; the shared app includes 134 rendered designs and ten preserved originals.
- Latest prepared PNGs total 8,253,292 bytes. The sync tool validates every image hash, dimensions and alpha-derived cord geometry, and rejects unreferenced generated copies.
- Drishti r4 has a complete clay body, hands and feet. Final Milky Way r3, Sun r2, Virgo r2, Valentine r2 and Saraswati r2 cutouts were visually rechecked after background/instrument corrections. Source masters and earlier pack files remain archived.
- Current type/lint/build and 69 model tests pass. Native editor, installed VSIX, desktop archive, website and hosted checks remain in progress.
- Calendar dates are actual local celebration dates, not substitute weekday bank closures. Specific dates override the December Christmas rotation. Older explicit opt-outs and pin settings survive; **Follow holiday defaults** enables and unpins without replacing the saved normal selection.

## Local verification - 2026-11-03

| Check | Result |
|---|---|
| Extension type checking, lint, production build and model tests | Passed; 69 tests |
| Windows VS Code 1.140 editor scenarios | All eight passed, with the old original-name expectation corrected before the final scenario passed |
| Actual installed VSIX in Restricted Mode | Passed; nine representative bundled PNGs, selection/reload, flower previews without earned progress, planting/watering and calendar-day persistence |
| Holiday and motion controls | Local-date cases, Christmas precedence, saved pins/opt-outs, Follow holiday defaults, sustained squeeze and complete release passed |
| Trial artwork sync and cutout checks | 144 available entries; every PNG hash and attachment checked; five cutout tests passed |
| Main website and artwork review | 144 gallery entries, 135 selected reviews, 176 validated PNGs, 22 packs; real pack/VSIX downloads matched; desktop/mobile layout and console checks passed |
| Release artifact checks | Five validation tests and actual VSIX/site checksum checks passed; public publication remains gated |
| Desktop 0.2.0 | Type/build, six model tests, developer smoke and extracted Windows ZIP smoke passed, including new PNG selection and earned garden persistence |

Thirty-four actual installed-app captures cover dark and light backgrounds at 100% size with normal motion. Each charm measured 72x84 CSS pixels, no packs were imported, and garden progress was unchanged. The [review page](../website/review.html) links the comparisons; the [full doll and lab tools](../website/assets/app-review/trial-lab-and-drishti-060.png) and [solar system](../website/assets/app-review/trial-solar-system-060.png) show representative results. Intricate probe-card and devotional details are easier to inspect at a larger charm size.

| Local artifact | Bytes | SHA-256 |
|---|---:|---|
| `extension/charmlet-0.6.0.vsix` | 8,429,287 | `06440f7f8d2c39bad8422273119f52a0673eb92bb1e4fbede73e5d6bd3efa3ce` |
| `desktop/distribution/Charmlet-desktop-0.2.0-win32-x64.zip` | 166,591,969 | `3f937d0c3210c6e632b30e3a4ea17dd43e968878e9852c30d5154f5318b7b80d` |

The branch/PR and post-merge workflow must additionally pass the six hosted VS Code jobs (1.90/1.140 on Windows, Linux and macOS) and both desktop archive jobs. Current results are available in [GitHub Actions](https://github.com/gautham-nvidia/charmlet/actions); local results above are not evidence for a different OS. Native desktop click-through, signing, editor forks, artwork/licensing and store-account gates remain separate.
