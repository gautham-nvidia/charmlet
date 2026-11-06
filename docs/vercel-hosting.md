# Host Charmlet on Vercel

The website is a static build. Vercel can serve the gallery, live playground and VSIX without a database or payment backend.

Owner's team: **[greensilver-personal](https://vercel.com/greensilver-personal)**. The repository is **[gautham-nvidia/charmlet](https://github.com/gautham-nvidia/charmlet)**. The intended project name is **charmlet**; its final URL is assigned by Vercel.

## Current preparation

- Root `vercel.json` installs the locked extension dependencies, including build tools, compiles the shared modules, builds the matching VSIX and generates `website/dist`.
- `.vercelignore` excludes local environment files, raw authoring output, session notes, desktop archives, dependencies and test profiles. Only generated `website/dist` is served.
- The static `/api/studio/config` response keeps the old website Photo Studio unavailable. Local photo creation inside both apps remains free. No payment or image-service secret is required for hosting.
- Downloads have attachment headers; mutable assets use short caching. No analytics or account sign-in was added to the app.
- On 2026-11-05 the installed CLI was 65.11.0 and `vercel whoami` returned **Logged out**. No project link or Vercel environment configuration existed. A dashboard URL selects a team; it does not authenticate the CLI.

## Connect the account

**On the Windows PC (PowerShell):**

```powershell
vercel login
```

Finish Vercel's browser sign-in using the account that can access `greensilver-personal`. Do not paste a password or access token into chat.

**On the Windows PC (PowerShell):**

```powershell
vercel whoami
vercel teams list --format json
```

The second command should show the supplied team. If it does not, check the account/team access before linking a project.

## Import through the dashboard

1. In `greensilver-personal`, choose **Add New > Project**, then import `gautham-nvidia/charmlet`. Authorize the GitHub connection if Vercel requests it.
2. Use **charmlet** as the project name and **Other** as the framework.
3. Keep the **Root Directory at the repository root**, not `website`. The website imports shared code and uses locked build tools from `extension`.
4. Use Node.js **24.x**. The checked-in configuration supplies install/build/output settings:

| Setting | Value |
|---|---|
| Install command | `npm ci --prefix extension --include=dev` |
| Build command | `npm --prefix extension run compile-tests && npm --prefix extension run package:vsix && node website/build.mjs` |
| Output directory | `website/dist` |
| Environment variables | None for this static preview |

5. For the current review, create a **preview of `feat/phase-9-live-fidgets-hosting`**. A Git integration normally treats `main` as production, so review those settings before importing or merging. Leave preview protection enabled where available.
6. After the preview is ready, inspect the home page, Live 3D/Stress Busters playground, review page, `/studio/`, mobile layout and VSIX download. The Studio page should be unavailable and must not offer a paid checkout.
7. Promote a reviewed build to production only after the public lineup, licences and release decision are settled. Add a custom domain afterward; Vercel will show the exact DNS records for the chosen domain.

For an existing Vercel project, use the CLI's repository linking flow under the specified team, then deploy the feature branch as a preview. The CLI manages `.vercel/`; do not hand-edit project IDs.

## Cost when selling

Vercel's [pricing](https://vercel.com/pricing) describes **Hobby as personal, non-commercial use**. A site selling Charmlet packs needs a plan that permits commercial use. The published **Pro entry price is US$20/month**, with usage/add-on charges possible; verify the team's current plan and spending controls before enabling sales. No upgrade has been performed.

Keep the gallery static. Hosted checkout and private file delivery can be provided by the merchant rather than adding payment functions to Vercel. This reduces the amount of infrastructure needed for the first sale.

## What hosting does not finish

Hosting is separate from Marketplace/Open VSX publication, Windows signing, macOS notarization and payment activation. Store links remain null until verified live listings exist. The installable trial is still a candidate, and its source/artwork licences remain unresolved.
