# Host Charmlet on Vercel

**Budget update, 2026-11-10:** the owner wants to avoid monthly platform charges at launch. The [Phase 14 plan](phase-14-product-and-pricing-plan.md) recommends evaluating Cloudflare Pages Free for the commercial static site, with protected paid files delivered by the commerce provider. This Vercel guide remains the alternative setup guide; its commercial-plan requirements still apply.

**Use Vercel for the Charmlet website and free extension download. When paid packs are ready, connect a hosted shop for checkout and private delivery.** The current site needs no database, payment secret or image-generation service.

| Item | Current value |
|---|---|
| Vercel team | [greensilver-personal](https://vercel.com/greensilver-personal) |
| Repository | [gautham-nvidia/charmlet](https://github.com/gautham-nvidia/charmlet) |
| Review branch | `feat/phase-10-california-mascots` |
| Review PR | [Draft PR #30](https://github.com/gautham-nvidia/charmlet/pull/30) |
| Intended project name | `charmlet`; availability and final URL are assigned by Vercel |
| CLI status, checked 2026-11-10 | Vercel CLI 65.11.0: **Logged out** |
| Production / payments | Not activated |

## 1. Sign in and select the right team

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
vercel login
```

Complete the browser sign-in with the account that can access `greensilver-personal`. The earlier device-login link is not a reusable credential.

**On the Windows PC (PowerShell):**

```powershell
vercel whoami
vercel teams list --json
```

Check that the account and team are correct. A dashboard URL alone does not sign in the CLI. Do not use the CLI's anonymous temporary-deployment suggestion as a substitute for the owner's account.

## 2. Link a project and protect the preview

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
git branch --show-current
vercel link --scope greensilver-personal --project charmlet
```

The branch should be `feat/phase-10-california-mascots`. Follow the linking prompts for the intended Charmlet project. If a project with that name already exists, verify it is the right project before using it. Let the CLI write `.vercel/`; do not invent or hand-edit project IDs.

In that project's Vercel dashboard:

1. Set **Root Directory** to the repository root, and **Framework Preset** to **Other**. Building from `website` alone misses the shared extension code.
2. Select **Node.js 24.x**.
3. Enable/check **Deployment Protection → Vercel Authentication** for previews before sharing a deployment. A preview URL is not automatically proof of private access.
4. Confirm the settings supplied by the root `vercel.json`:

| Setting | Value |
|---|---|
| Install command | `npm ci --prefix extension --include=dev` |
| Build command | `npm --prefix extension run compile-tests && npm --prefix extension run package:vsix && node website/build.mjs` |
| Output directory | `website/dist` |
| Environment variables | None for the current static site |

The first build downloads dependencies and builds the matching VSIX; allow several minutes and watch Vercel's build log.

## 3. Create and review a preview

**On the Windows PC (PowerShell):**

```powershell
Set-Location "C:\dev\Lucky-Charms"
vercel deploy --scope greensilver-personal
```

This command requests a preview deployment. Use the actual URL returned by Vercel; no `charmlet.vercel.app` address has been reserved or verified. Keep `--prod` out of this step.

Check these routes on the deployed preview:

| Route / action | Expected result |
|---|---|
| `/` | Modern homepage; Cali, Sunny, Nimbus and Byte react; installation tabs work |
| `/charms.html` | 234 charms, sixteen collection filters, search and local preview dialogs |
| `/charms.html?collection=music-icons&q=beyonce` | Beyoncé found; the filter/search survives reload |
| Preview a puzzle | Play opens a board; Escape returns to its charm preview |
| `/review.html` | Current 0.12.0 artist captures and clearly labelled earlier comparisons |
| Extension download | Installs as 0.12.0; the download comes from this build |
| Mobile | Readable layout, usable filters and no horizontal page overflow |
| `/studio/` | Old route remains unavailable, with no upload or payment form |
| Desktop and shop links | Absent until verified public destinations are configured |

For repeatable browser checks against a deployed preview, the browser must first have access through the configured protection. Do not disable protection just to make automation pass.

## 4. Production and your domain

After the website, public artwork lineup, licensing and release decision are approved, use **Deployments → the tested deployment → Promote to Production**. Then add an owned domain in **Settings → Domains** and copy the exact DNS records Vercel supplies. This guide does not reserve or purchase a domain.

If connecting Vercel's Git integration, review the **Production Branch** before enabling automatic deployments. Importing a repository or merging into its production branch can trigger production deployment; it is not the same as the protected review above.

## 5. Add real download and shop destinations

`website/launch.json` is public metadata, initially:

```json
{
  "desktop": {
    "windows": null,
    "macos": null
  },
  "shop": null
}
```

- **Desktop:** publish approved archives as GitHub Release assets in this repository, download and verify them, then set the corresponding URL. Windows uses `.zip`; Mac uses `.tar.gz`. The link validation accepts the repository's `Charmlet-desktop-VERSION-PLATFORM-ARCH` archive names. Buttons identify x64/ARM64 or Intel/Apple silicon from the actual filename.
- **Shop:** after checkout and delivery are tested, set `shop.provider` to `shopify`, `stripe` or `square`, and `shop.url` to the verified public storefront/checkout URL. The navigation then reveals **Shop collections**.
- **Extension stores:** `website/distribution.json` separately holds verified Marketplace/Open VSX listing URLs. Leave these null until published.

Never put merchant secret keys, webhook secrets, paid files or private download links into these files. Rebuild and preview after changing a public destination.

The local Windows archive is about 176 MB and is not a public download URL. `.vercelignore` excludes desktop builds and archives; GitHub Releases provide a separate distribution location. Signing, macOS notarization and manual macOS/mixed-display verification remain app-release work.

## Costs and boundaries

Vercel [Hobby is for personal, non-commercial use](https://vercel.com/docs/plans/hobby#fair-use-guidelines). Use an eligible plan for commercial promotion or sales; being free to download does not by itself make a business site non-commercial. Published [Pro pricing](https://vercel.com/pricing) starts at US$20/month, with seat/usage/add-on charges depending on the account. Confirm the actual team plan and spending controls before upgrading. No upgrade has been made.

Only `website/dist` is served. Raw artwork, receipts, local profiles, session notes, dependencies and environment files are excluded. Fonts are self-hosted; the public site does not need a model API key. Photo Studio remains disabled, and the app's local photo-charms feature stays free.

See [payments and future merchandise](monetization-and-payments.md) for the store recommendation and setup steps.
