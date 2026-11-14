# Charmlet website preview and email setup

The preview now explains where Charmlet lives and lets visitors try focus, encouragement, celebrations and coding trivia before the Free/Pro comparison. The refined Terminal logo keeps the original charm's silhouette. Gmail, subscriber collection, checkout and production hosting are **not connected**.

## Review the experience

| Page | What to review |
| --- | --- |
| `next.html` | Desktop/VS Code placement switch, live companion, wider desktop dragging, flexible cord, ten-second focus example, app trivia and encouragement |
| `brand-lab.html#terminal` | Refined A, preserving the Terminal body, screen, bevels and loop |
| `next.html#memories` | Opening locket concept; chain and ring share one rig; local photo selection/reset |
| `next.html#pro` | Free essentials before the planned **$7.49 launch / $17.49 regular**, once across the current apps |
| `next.html#get` | Email-before-download flow and optional offers; currently an explicitly disabled design preview |
| `download.html` | Post-email installation instructions and real beta links |
| `privacy.html` | Preview privacy wording; final sender/contact and retention details still needed |

The workplace windows are illustrations with the real shared companion renderer. The focus example lasts ten seconds and does not record a real app win. The installed 0.12.0/0.9.0 packages have not been rebuilt for this design review. Opening live lockets, Pro activation and the 30-day Pro preview remain planned features. Today's beta has no expiry.

The new pages are included only by the optional design build. The normal homepage and app branding have not been replaced.

**On the Windows PC (PowerShell), from this checkout:**

```powershell
Set-Location "C:\dev\Lucky-Charms"
node website/build.mjs --design-preview
node website/server.mjs --design-preview
```

The server defaults to `http://127.0.0.1:4173/`; its root serves the new homepage, while `/index.html` remains available for regression checks. Set `PORT` to a free port if needed. The current session already has a preview server running; a rebuild updates it without another server.

## Gmail for contact; Brevo for delivery and subscriptions

Use a dedicated Gmail inbox for contact, recovery and replies. Use **Brevo Free** for forms, confirmation emails, subscriber records and unsubscribe handling. This avoids keeping a new subscriber database or mailing API secrets in the website.

Official pricing checked on November 10, 2026:

| Service | Current free allowance | Fit here |
| --- | --- | --- |
| Brevo | 300 email sends/day after account approval; official help lists storage for 100,000 contacts and automation for up to 2,000 contacts | Recommended first mailing service; campaign and transactional sends share the daily allowance |
| MailerLite | 250 subscribers, 2,500 sends/month; limited API; transactional email is a separate MailerSend product | Alternative for a small list |

Two messages per new signup—confirmation and download—use two sends. Do not budget 300 two-message signups per day from a 300-email allowance.

**Gmail is the contact inbox, not the bulk-mail sender infrastructure.** Brevo says it temporarily replaces free-domain sender addresses with its own authenticated domains. That is a temporary measure. For public campaigns, use an authenticated domain you control; domain registration is a separate cost. Do not promise customers that Brevo campaigns will arrive directly from an `@gmail.com` sender. No domain has been purchased.

## Set up the contact account

1. Open Google's account creation page and create the dedicated inbox. Suggested handle: `hello.charmlet`, **if Google says it is available**.
2. The owner enters their birthday, password, recovery information and any verification directly in Google. Do not put those details in chat, repository files or session notes.
3. Create the Brevo Free account for Charmlet with that inbox. Complete sender verification and any account approval. Keep the reply-to address pointed at the contact inbox.
4. Enter the business/contact information privately in the provider and finalize the contact/retention wording in `privacy.html` before opening real collection.

## Configure the hosted form

Use Brevo's own form builder, then copy its **public** `sibforms.com/serve/…` share URL. The website does not need its API key.

| Field | Requirement | Purpose |
| --- | --- | --- |
| Email address | Required | Confirm the requested delivery address and send the beta link |
| First name | Optional | A friendly greeting |
| App interest | VS Code / Windows desktop / Mac desktop | Understand which app visitors want; do not imply unavailable desktop binaries are downloadable |
| Offers choice | Optional, unchecked | “Yes, send me launch news, new packs and occasional offer codes. I can unsubscribe any time.” |

Use a download-request list separate from the offers audience. A download request is permission to deliver that request, not general marketing consent. Send campaigns only to contacts with an affirmative, confirmed offers choice who remain subscribed. Retain the consent text/version and the provider's confirmation records.

In the form's **Settings**, choose **Double confirmation email**. Start with Brevo's default double-opt-in template and preserve its generated confirmation button/link. Configure the **confirmation page after clicking the validation link** to the public `download.html` URL. Enable a final confirmation email containing the same installation link so the user can find it later. This uses the form's confirmation features; it does not need a custom payment server.

The first confirmation page, shown immediately after submitting the form, should say “Check your inbox to confirm your download request.” It should not announce a confirmed subscription or expose a paid file.

Suggested confirmation copy:

> **Subject:** Confirm your Charmlet download request
>
> You asked for the free Charmlet beta. Confirm your email using the button below, and we'll send your installation link.
>
> **[Keep Brevo's generated confirmation button here]**
> Launch news and offer codes are a separate choice. If you didn't request this, ignore the message.

Suggested final delivery copy:

> **Subject:** Your little co-worker is ready
>
> Your free Charmlet beta is ready to install.
>
> **[Install Charmlet — link to the public download.html page]**
>
> The current VS Code beta has no expiry. Public desktop links will appear on that page when those builds are available.
> Start with one companion, try a focus session, and make yourself at home.

Offer messages later need their own clear subject, the actual released offer/code, and the provider's unsubscribe/footer controls. No codes or campaigns have been created or sent.

## Connect only after a real delivery check

Update `website/audience.json` with the public form URL and the chosen public contact address, then rebuild. The validator rejects credentials, extra parameters, unapproved hosts and unknown fields. Keep private provider credentials out of this file.

Before enabling that URL, verify these actual provider flows:

- No offers selected: email confirmation and the download link arrive; the contact is excluded from offer campaigns.
- Offers selected: confirmation records the choice and the subscriber can unsubscribe.
- A previously unsubscribed person requests another download without selecting offers: delivery works **without re-enabling offers**. Brevo's general subscription status and the separate offers audience must both be checked. If the hosted form cannot preserve this separation, use a separate offers form rather than treating download confirmation as marketing consent.
- Duplicate request, invalid email, ignored/expired confirmation, exhausted sending allowance and a retried request do not produce a false success or silently lose delivery.
- The confirmation link goes to the final public domain, the download/installation page works, and the campaign footer/contact details are correct.

No live provider checks have happened yet; the account, sender and public form are missing. The current disabled preview never reads, stores or submits the sample fields.

This is an email step in the website's download journey, **not file-access protection**. The free beta URL remains public and shareable. Paid files will belong in the checkout provider's protected delivery system, not in this public download directory.

## Hosting and payments remain separate

Use the existing [hosting guide](vercel-hosting.md) for the Cloudflare Pages free/static option and the prepared Vercel setup. Public desktop archives remain GitHub Release links; do not copy large Electron archives into the static website.

Email collection does not activate checkout. Lemon Squeezy remains the initial recommendation for payment, protected downloads and software keys, subject to eligibility and a verified purchase/delivery test. Coda's cheaper headline fees still need a complete quote and a demonstrated software/download fulfillment flow. See [monetization and payments](monetization-and-payments.md).

## Sources

- [Brevo pricing](https://www.brevo.com/pricing/) and [official plan details](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans).
- [Create a sign-up form](https://help.brevo.com/hc/en-us/articles/208771869-Create-a-sign-up-form-in-Brevo): double confirmation, redirect after validation and optional final email.
- [Brevo signup forms](https://www.brevo.com/features/signup-forms/).
- [Sender requirements and temporary address replacement](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders).
- [MailerLite pricing](https://www.mailerlite.com/pricing).

Pricing pages were read with agent-browser. Brevo's help centre presented a Cloudflare verification screen; the cited help passages were retrieved through indexed official-document excerpts. Account-specific availability and delivery still need the live account check above.

## Verification completed on the Windows PC

- Shared motion/model suite: **98 passed, 0 failed**.
- Existing website regression: **234 charms, 34 artists, 16 collections**, live companions, three puzzle boards, downloaded VSIX contents, retained pack links, Reduced Motion and mobile layouts passed; no console errors.
- New homepage: Desktop/VS Code placement, ten-second focus-to-celebration example, encouragement, trivia and accessible answer reveal checked through real browser input.
- Desktop drag moved Cali from approximately x1237 to x650, then settled after release. This uses the wider page area.
- No horizontal overflow at 320, 390 or 768 pixels. The small-screen dock wraps; the open locket cover stays inside the screen. Transformed chain/ring endpoints align to within 0.001px.
- Light/Dark/Auto, keyboard focus, Reduced Motion, signup dialog Escape/focus restoration, local PNG selection, SVG rejection and photo reset checked. The only local storage entry was the theme preference; session storage stayed empty.
- Download and privacy pages load without errors. Missing desktop links stay hidden and the signup status correctly says that collection is not open.

The Gmail signup window is prepared with **Charmlet** as the name. The owner still needs to complete Google's private details and verification. No Gmail address, Brevo account, public form or subscriber list has been created by this work.

## Update, 2026-11-13

The owner has now created **getcharmlet@gmail.com** as the official Charmlet inbox. The website uses it for support, press and privacy enquiries. Gmail creation is complete; the application has no Gmail password or recovery details.

Use the [current service setup guide](../service/README.md) for the implemented verified-email portal and optional offers popup. The earlier standalone-form/download description above is historical: the current public build excludes raw installers and packs, and a form URL alone does not activate signup. Brevo, an authenticated sender domain, the service and live delivery checks still need setup.
