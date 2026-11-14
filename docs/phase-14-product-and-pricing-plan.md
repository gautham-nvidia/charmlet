# Charmlet: design, collections and a launch without monthly platform fees

**Proposal for owner review — 2026-11-10.** Improve the physical feel of the product, introduce a 30-day Pro preview, and sell one Pro licence across the current apps. Start with a provider that charges per sale. Keep Shopify for a later merchandise decision.

The current extension 0.12.0 / desktop 0.9.0 candidate remains unchanged: 234 bundled charms, no expiry or Pro licence enforcement, no live checkout. Its eight hosted checks passed on `85bac78`. This document describes future work and proposed prices.

## Recommended decisions

| Decision | Recommendation | Why |
|---|---|---|
| First purchase | **$7.49 launch price; $17.49 regular, once** | Owner-selected prices on 2026-11-10; one purchase across VS Code and the Windows/Mac desktop apps |
| Try before buying | **30 calendar days of Pro, no card, no automatic charge** | Enough time to use the companion, photos and the eleven-watering-day garden |
| Free edition | A curated **24-charm starter**, existing useful controls, basic photo tools and imports | People can keep a useful app after the preview |
| Additional artwork | New original **8–12 design packs around $4.99**; bundles later | A clear, substantial purchase without tiny per-charm transactions |
| Subscription | **Do not launch a $0.99 monthly plan** | Fixed transaction fees consume too much; there is no necessary monthly service today |
| Checkout/delivery | **Lemon Squeezy, subject to store/country approval; Payhip Free as an alternative** | Both document automatic digital delivery and have no required monthly ecommerce plan |
| Website hosting | **Cloudflare Pages Free**, within its limits and terms | Avoid adding a commercial hosting subscription before revenue |
| Merchandise | Revisit Shopify when there is a physical product and fulfillment plan | No reason to pay its subscription for a hypothetical future catalogue |

These prices are proposals in USD. Business country, currency, seller eligibility and final terms still need the owner’s decision. “No monthly platform fee” does not mean zero transaction fees, domain costs, signing costs or artwork costs.

## 1. Design changes

| Area | Proposed change | Review requirement |
|---|---|---|
| Logo | Retire the website’s C-dot square. Prepare three original directions: a hanging-loop symbol, a custom Charmlet wordmark with an integrated loop, and a restrained Cali profile mark. | Compare actual designs at favicon, header and app-icon sizes in both themes before selecting one |
| Yosemite Live | Natural granite, pines and waterfall; remove eyes and facial features from the artwork and animation. | Recognizable Half Dome silhouette, detailed rock surface, restrained water/mist motion; no rubbery mountain deformation |
| Lake Tahoe Live | Clear water, snowy peaks, pines and reflections; remove eyes and facial expressions. | Water ripples and subtle environmental movement; terrain stays grounded |
| Stress Busters | Replace the flat visual treatment with bevelled metal, visible bearings, silicone thickness, realistic pressure deformation and polished stone/glass. | Start with Classic and Orbit spinners, Bubble Pop, a stress ball, Worry Stone and Twisty Cube; review at actual 100% and 200% app size |
| Cord | Add a flexible cord with its own bending and delayed response, a little slack, weighted release and smooth settling. | Exact attachment at the peg and charm; bounded pulling, saved length/position, no focus theft, stillness under Reduced Motion |
| Photo keepsakes | Build on the existing local photo editor: richer paper prints, optional notes/photo cycling, and an opening hinged locket with gold/silver options. | Photos remain local; cropping and old keepsakes survive updates; the hinge and cover must look convincing in both renderers |
| Website themes | **Auto / Light / Dark**, with a saved choice. Light: warm ivory/forest/sage. Dark: charcoal/warm white/soft sage. | Original artwork colours remain intact; readable labels, visible controls, correct cutout edges and no theme flash |

The same quality should appear in the installed app and website preview. Attractive thumbnails should not conceal a flatter in-app renderer. Upgrade the quality of existing free fidgets too; charge for additional designs or new capabilities.

Technical evidence behind this work:

- `extension/src/fidget-renderer.ts` currently draws the spinner using Canvas 2D circles, lines and gradients.
- `extension/src/cord-design.ts` derives the cord and chain links from one quadratic curve between the current anchor and hook. It has no independent cord history. `pendulum.ts` already provides a moving body/tether, so prototype additional cord dynamics while preserving the working movement constraints.
- `california-companions.ts` explicitly defines eyes for Yosemite and Tahoe. Their source artwork and descriptions need review as well as the blink code; merely disabling animation may leave a face in the image.
- `website/studio/photo-core.mjs` already supplies **Mint Frame, Copper Locket and Paper Keepsake**. Keep these existing static photo tools free. The new value is live opening, depth, materials and additional photo interactions.

## 2. Music lineup

**Travis Scott leads Music Icons and the featured artist row.** Terminal remains the app’s default and Live 3D remains near the front of the main picker.

Add **Hardwell, Martin Garrix, Fred again.., Swedish House Mafia, Lil Wayne, Ye, Jay-Z and Drake**. “Fred” is provisionally interpreted as Fred again..; confirm before generating that study.

Remove **Tina Turner, David Bowie, Aretha Franklin and Dolly Parton** from the new visible lineup. Retain historical review evidence and users’ existing imports. Retired built-in selections need a deliberate migration rather than silent loss of personal data.

That gives **38 Music Icons review candidates**: 34 + 8 − 4. With no other additions, the catalogue would become 238. These are planned counts, not the current build.

Organize Music Icons using DJ/Electronic, Hip-hop, Pop and Legends/Bands filters, with a curated featured order. Keep Michael Jackson, Prince, Freddie Mercury, Whitney Houston, Beyoncé, Taylor Swift, Kendrick Lamar and the other retained acts. “Featured” expresses a curation choice; do not present it as an objective influence ranking.

## 3. Requested sports and entertainment packs

These are concrete **concept-review rosters**, not approved commercial products. Start with a few representative studies before generating every member.

| Collection | Initial concept roster |
|---|---|
| Soccer Heroes | Messi, Cristiano Ronaldo, Pelé, Maradona, Ronaldinho, Zidane, Marta, Mbappé |
| Basketball Heroes | Michael Jordan, Kobe Bryant, LeBron James, Stephen Curry, Shaquille O’Neal, Kareem Abdul-Jabbar, Giannis Antetokounmpo, Nikola Jokić |
| Football Heroes | Tom Brady, Joe Montana, Jerry Rice, Barry Sanders, Patrick Mahomes, Lamar Jackson, Travis Kelce, Josh Allen |
| Marvel request | Spider-Man, Iron Man, Captain America, Thor, Hulk, Black Panther, Doctor Strange, Scarlet Witch |
| DC request | Batman, Superman, Wonder Woman, Flash, Aquaman, Green Lantern, Cyborg, Harley Quinn |
| Disney request | Mickey, Minnie, Donald, Goofy, Stitch, Simba, Elsa, Moana |
| Pixar request | Woody, Buzz, WALL-E, EVE, Remy, Sulley, Mike, Nemo |
| Hollywood Icons | Keanu Reeves, Tom Cruise, Denzel Washington, Leonardo DiCaprio, Jackie Chan, Marilyn Monroe, Audrey Hepburn, Zendaya |

**“Inspired” describes a design; it does not grant commercial permission.** Character designs, trademarks and a person’s commercial likeness raise different rights questions. Removing a logo or changing a name does not necessarily resolve them, and giving a public pack away is not automatic clearance.

Keep these recognizable concepts in private review until the distribution/commercial position is resolved. Do not base launch revenue or a lifetime-content promise on obtaining major studio or sports licences.

The commercial catalogue can begin with cleared original **California scenes, Cali clothing, fidget materials, photo frames, sports equipment/stadium scenes, original heroes and storybook characters**. Original alternatives must have their own identities and designs. Celebrity/studio editions can be considered separately if rights become available.

## 4. Free, Pro and additional packs

For **new public users**, the proposed 24-charm starter is:

| Group | Included designs | Count |
|---|---|---:|
| Coding | Terminal | 1 |
| Core companions | Cali, Sunny, Nimbus, Byte | 4 |
| Pets | Golden Retriever, Goldendoodle, Husky, Corgi, Giant Panda, Tabby | 6 |
| Natural California | Redwood, Yosemite, Lake Tahoe | 3 |
| Instruments | Acoustic Guitar, Grand Piano | 2 |
| Fidgets and puzzles | Classic Spinner, Bubble Pop, Worry Stone, Twisty Cube, Sliding Tiles, Lights Out | 6 |
| Seasonal | Diwali, Halloween | 2 |
| **Total** | Subject to final distribution clearance | **24** |

Free functionality includes the existing focus timer, garden/progress, basic Cali encouragement and seven outfits, puzzle play, size/cord controls, themes, Reduced Motion, static photo creation and pack imports. A user who buys an artwork pack should be able to use it in the free app.

| Offer | What it buys | What happens later |
|---|---|---|
| Free | Starter collection and existing useful tools | Continues after the Pro preview |
| Pro preview | All Pro app features and the Pro collection included in that release | After 30 days, return to Free unless the user chooses to buy |
| Pro, one purchase | New live keepsake features, the first additional fidget/material set, new Cali Signature wardrobe and the **explicitly listed** original Pro launch collection; works across current apps | Perpetual use of the purchased Pro features/content; normal fixes and maintenance updates included |
| Additional original pack | A clearly listed new collection, suggested $4.99 for 8–12 designs | Owned separately; no Pro subscription required |
| Recognizable celebrity/franchise edition | Not offered until rights, cost and terms are resolved | Cannot be promised as part of “all future packs forever” |

The Pro launch content above still needs to be designed and built. Do not sell the current renderer or existing photo frames as newly completed premium work.

Good later standalone collections: **California After Hours**, **Garden Glasshouse**, **Desk Objects Studio** and original **Sports Moments**. Keep the included Pro collection distinct from additional purchases so buyers do not pay twice for the same content.

**Existing testers and files:** the current 234-charms beta has already been distributed without expiry. Preserve installed/imported content and personal photos; consider complimentary Pro launch keys for early testers. Old files cannot be made exclusive retroactively. A smaller default starter for new users is a product packaging choice, not a claim that existing public files have become secret. Public catalogue retirement for rights reasons is separate from deleting a user’s local imports.

## 5. How the 30-day preview should work

1. The user explicitly chooses **Try Pro for 30 days**. Explain the end date and that no card or automatic charge is involved.
2. Unlock all Pro features and its included launch collection. Keep the interface quiet; show the remaining time in Settings rather than repeated desktop interruptions.
3. After 30 calendar days, keep Free, purchased packs, photos, imports, garden progress, focus history and puzzle progress. A Pro photo style can fall back to its basic frame without deleting the photo.
4. A one-time Pro key restores the purchased capabilities across the supported apps. A lost receipt can be recovered through the provider’s order/download flow.
5. Use a gentle reminder near expiry and one clear expiry explanation. Never interrupt a focus session or steal desktop focus for an upgrade prompt.

There is **no 30-day expiry or shared Pro entitlement in the current apps**. This needs a new implementation with migration and offline tests. A local trial can be reset by a determined user; do not claim perfect enforcement or add invasive fingerprinting. A strict per-person trial across separate computers would need an identity/service design, and is not necessary for the first release.

The licence must cover VS Code and the current Windows/Mac desktop products, rather than charging again per host. State the personal-install allowance clearly; **five personal installations** is a reasonable proposal, with self-service deactivation. Do not promise unreleased mobile products or unsupported desktop architectures.

## 6. Why one-time pricing is a better start

Lemon Squeezy publishes **5% + $0.50** per transaction, with an additional **0.5% for subscriptions**. The following are illustrative US-card proceeds before tax effects, international/PayPal additions, payout fees, refunds and other costs:

| Purchase | Approximate proceeds after the stated provider fee |
|---|---:|
| $0.99 monthly subscription payment | **$0.44** |
| Twelve $0.99 monthly payments | **$5.23 total** from $11.88 charged |
| $11.99 annual subscription payment | **$10.83** |
| $4.99 one-time artwork pack | **$4.24** |
| $7.49 one-time Pro | **$6.62** |
| $17.49 one-time Pro | **$16.12** |

The $0.99 monthly payment loses approximately 56% to these fees alone. These proceeds are not profit. If a future membership funds dependable new original content every month, consider an annual collector plan instead; do not launch one before that ongoing benefit exists.

[LuckyDangle](https://luckydangle.app/) currently advertises **$7.77 once**, or **$11.11 supporter**, covering Mac and Windows. Its page includes future charms/updates, photo prints and lockets, with no account or licence keys. Charmlet’s higher proposed price must earn its value through Cali, editor integration, the quality of the new interactions and an explicit content bundle. Quantity alone is a weak reason to charge more.

## 7. Checkout and automatic file delivery

| Provider | Fixed ecommerce fee | Per-sale example | Delivery and fit |
|---|---:|---|---|
| **Lemon Squeezy** | **$0/month** | 5% + $0.50 base, including card processing; additions can apply | Protected product downloads, receipt emails and generated licence keys; merchant of record for transaction taxes |
| **Payhip Free** | **$0/month** | 5% Payhip fee **plus** the selected gateway’s fees | Immediate download page and emailed link; software keys documented; check country/gateway/tax coverage |
| Standard Stripe Payments | No required monthly Payments subscription | US standard cards 2.9% + $0.30 | Takes payment; file delivery and app entitlements require another service or implementation |
| Square Payment Links | No monthly Payment Links fee | New US customers’ standard online rate shown as 3.3% + $0.30 | Standard digital delivery is manual or needs an integration |
| Shopify Basic | $39 monthly / $29 monthly equivalent billed annually in the checked US offer | Payment fees additional | Reconsider for actual physical merchandise |

For a $4.99 one-time pack, Payhip Free with the example US Stripe card rate leaves about **$4.30**, before other costs. Lemon Squeezy leaves about **$4.24** at its base rate. The small difference makes delivery, tax handling, eligibility and support more significant than the headline percentage.

**Recommended first flow:**

1. Create an approved one-time product in Lemon Squeezy. For Pro, enable a perpetual licence and the agreed personal-install limit. For an artwork pack, upload its validated file.
2. Store the full paid files in the provider’s protected product files. Publish separate previews on the website. The provider documents up to **5GB of files per product**.
3. The website’s Buy button opens the provider’s hosted checkout.
4. After confirmed payment, the provider gives access to the download page and sends the receipt. For Pro, the generated key is available in the receipt/order page.
5. **Pro purchase:** download the appropriate app or use the existing installation, then activate the key in the new Settings flow.
6. **Pack purchase:** download its `.charmlet.json`, or extract the supplied ZIP, then use **Charmlet: Import Charm Pack** in VS Code or **Import Pack…** in the desktop tray.
7. Test an actual permitted test-mode transaction, receipt, download, import, purchase restoration and refund/revocation before displaying a live Buy button.

A normal artwork pack needs no bespoke payment server for this hosted delivery path. Pro activation still needs app code. A payment-success URL or `paid=true` flag is not proof of purchase.

The current pack format contains static PNGs, with **1–12 charms per file** and a **2MiB JSON limit**. It cannot install a new spinner engine or an opening locket. Those behaviours must be implemented in the app; the Pro entitlement unlocks them. A larger bundle contains multiple importable packs.

Validate the correct provider/store/product entitlement, protect stored keys, keep service secrets out of public/native clients, and allow reliable offline use after activation. A provider outage must not erase a cached purchase. Treat downloaded artwork as copyable offline data; do not promise that a licence key makes it impossible to extract.

Lemon Squeezy’s January 2026 update describes its direction toward **Stripe Managed Payments** and plans for migration. Recheck current seller onboarding and file/licensing support when activating a store. Standard Stripe Payments, Stripe Managed Payments and Lemon Squeezy are distinct offers; do not assume their fees or APIs are interchangeable.

## 8. Hosting and merchandise

Use Cloudflare Pages Free for the static website within its published limits: **500 builds/month, 20,000 files, 25MiB per asset**. Static asset requests are documented as free and unlimited. Commercial use is discussed in its community guidance; review the applicable account terms at deployment.

The current largest website asset is the **17,683,024-byte VSIX**, below that individual-file limit. Windows/Mac archives are much larger and need suitable download hosting or the commerce provider. Move installers out of Pages if they grow beyond the limit.

The existing Vercel configuration is not Cloudflare configuration. Port and test security headers, redirects, download URLs and the build command. A free provider subdomain can be used first; a custom domain costs separately. Vercel Hobby is for personal/non-commercial use, so it is not the zero-cost recommendation for the eventual commercial site.

When physical merchandise is real, evaluate Shopify against actual order volume and fulfillment needs. Use print-quality masters, physical product variants and a shipping/returns plan. Keep digital purchase rights independent of the future merchandise checkout so an app owner does not have to buy again.

## 9. Build order and acceptance

| Stage | Concrete output | Acceptance |
|---|---|---|
| **A — Visual quality** | Three logo concepts; natural Yosemite/Tahoe; six representative realistic fidgets; flexible-cord prototype; website light/dark/auto | Review actual app-size captures in both themes, GPU/software rendering, pointer/keyboard controls, Reduced Motion and idle behaviour |
| **B — Collection edit** | Eight music additions, four retirements, Travis-first ordering; a few sports/entertainment concept studies and the proposed rosters | Approved artwork, legibility at charm size, exact old-import preservation, explicit rights status; no mass generation before the sample quality is settled |
| **C — Personal keepsakes** | Live print/locket prototypes, notes and photo cycling | Local processing, bounded files, hinge/crop quality, save/reload, no loss of existing static keepsakes |
| **D — Trial and purchase** | Free/Pro catalogue, 30-day preview, one cross-app Pro entitlement, provider-neutral purchase records | Expiry, offline/outage behaviour, clock changes, reinstall/restore, invalid keys, wrong product, refund and existing-user migration |
| **E — Store and release** | One Pro offer and at most one or two new original pack offers; free static hosting configuration | Complete payment-to-delivery test, cleared distribution lineup, licences/signing/manual platform gates, app + website regression checks, owner launch approval |

Start with Stage A. Do not build a paid launch around the full celebrity/franchise wishlist or introduce nine competing checkout offers at once.

## Sources and evidence limits

Checked on **2026-11-10**:

- [LuckyDangle](https://luckydangle.app/): browser page, photo open/close controls, pricing and light/dark/auto options inspected. No competitor binary, checkout or performance benchmark was tested.
- [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing) and [fee documentation](https://docs.lemonsqueezy.com/help/getting-started/fees): browser-read. Fees document +1.5% international, +1.5% PayPal, +0.5% subscription, and regional payout fees.
- [Product files](https://docs.lemonsqueezy.com/help/products/adding-products): browser-read; protected downloads and 5GB per product.
- [Generating licence keys](https://docs.lemonsqueezy.com/help/licensing/generating-license-keys) and [receipt emails](https://docs.lemonsqueezy.com/help/checkout/customizing-receipt-emails): official documentation retrieved through search.
- [Lemon Squeezy 2026 update](https://www.lemonsqueezy.com/blog/2026-update): browser-read; transition direction is not a guarantee of current merchant approval.
- [Payhip pricing](https://payhip.com/pricing), [billing help](https://help.payhip.com/article/102-billing-and-upgrading), [delivery flow](https://help.payhip.com/article/132-how-payhip-works) and [software keys](https://help.payhip.com/article/317-software-license-keys-new): official search results. Its pricing page blocked this browser; these facts were not established by a successful direct page visit or merchant transaction.
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): browser-read. [Static asset pricing](https://developers.cloudflare.com/pages/functions/pricing/) and [commercial-use discussion](https://community.cloudflare.com/t/hosting-a-for-profit-company-website-on-cloudflare-pages/679055): search-retrieved documentation/community guidance.
- Existing [hosting guide](vercel-hosting.md), [payment guide](monetization-and-payments.md) and [pack format](charm-packs.md) establish the current repository setup.

No merchant account was created, no price or paywall activated, and no design generation or runtime change is represented as completed by this plan.
