# Phase 15 review candidate

The candidate has a fixed free starter, signed Pro/trial access and the approved website. It is ready for owner review, not public sales. Live accounts and distribution remain unconfigured.

| Artifact | Version | Local verification |
|---|---|---|
| VS Code extension | 0.13.0 | Compile/lint, 100 models, 14 source-editor scenarios, installed-package scenarios and release validation |
| Windows desktop | 0.10.0 | Compile, 13 models, owned-profile smoke and extracted ZIP launch |
| Website | 0.13.0 catalogue | 234 designs, 15 live companions, three puzzles, mobile layouts, Reduced Motion and isolated connected-portal scenarios |
| Access service | 0.1.0 | 13 security/ownership tests, Worker dry-run bundle, local D1 schema |

Current hosted platform results are on [draft PR #30](https://github.com/gautham-nvidia/charmlet/pull/30/checks): six editor jobs (Windows/Linux/macOS, VS Code 1.90.0 and 1.140.0), two desktop jobs and the new service/website job. Confirm all nine on the intended source revision. The macOS archive is produced and checked on that workflow; no Windows build is relabelled as a Mac artifact.

## Local package identity — November 13, 2026

| File | Bytes | SHA-256 |
|---|---:|---|
| `extension/charmlet-0.13.0.vsix` | 17,690,092 | `c5ac162ae3c4cc887a7c1d5bd88598a52758825f441f0e82fa6f25d3da05b6c7` |
| `desktop/distribution/Charmlet-desktop-0.10.0-win32-x64.zip` | 175,907,294 | `8598897a2fcede51b9d9fe98f6e5e24df75e7fc66c267d99f2e99dea3edc97ec` |

The Windows archive's verifier reports `extracted archive launched in an owned profile`. Local verification checks the app's click-through configuration; actual Windows pointer injection runs only on the isolated Windows CI desktop. The release checker validates all 305 VSIX files and reports `publicationReady: false` because source/artwork licence decisions are still open.

## What the checks cover

- Fresh profiles keep 31 fixed free choices after reload. Existing beta profiles retain their frozen 234-design collection, including in Restricted Mode.
- Expired trials retain free and purchased items, photos, imports and saved garden/puzzle progress. Repeat email, Gmail alias, concurrent request and service restart cases preserve the original trial deadline.
- Forged signatures, wrong keys/audiences, changed prices, expired/replayed links, unauthorized downloads, invalid payment details and duplicate/out-of-order refund events are rejected or handled idempotently.
- The public build excludes raw installers and packs. The portal uses server installer metadata, removes email tokens from its address, restores the short session after checkout, and waits for confirmed ownership before enabling purchases.
- The final local browser check reports no console errors. Dark-theme scans report no automated violations on the homepage, gallery, shop, About, About Us, Press, download and privacy pages. The homepage has incomplete contrast checks where the wide interactive SVG overlaps other layers; scans are not a full accessibility certification.

Connected email/checkout tests use synthetic addresses and provider fixtures. No real messages, subscriptions or charges were made. All three dependency audits reported zero known findings on November 13.

## Before launch

Follow the [hosting and payment setup guide](../service/README.md) and [security review](phase-15-security-and-launch.md). Configure Cloudflare, the verified sender and approved merchant, generate/back up the publisher keys, rebuild the apps with their public key, stage/upload validated releases, then complete the real delivery and purchase/refund rehearsal.

The release apps deliberately reject sandbox access files. Source/artwork licensing, celebrity/athlete rights, desktop signing/notarization, manual Mac and mixed-display checks remain separate prerequisites. Sports studies stay in the private owner review pack. Physical merchandise is deferred.
