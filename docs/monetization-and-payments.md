# Digital packs now, merchandise later

**Keep the useful app free. Use Shopify when the first paid original packs are ready, with the Vercel website as the product experience. Add physical merchandise to that same store later.** This gives paid downloads an established checkout and delivery path without building a payment backend.

The current **234-charm trial, including all 34 Music Icons, is free**. No merchant account, paid product, price, subscription or live checkout has been activated. The recommendations and USD prices below are proposals, checked against official sources on **2026-11-10**.

## Which provider fits?

| Provider | Digital delivery | Future merchandise | Best use for Charmlet |
|---|---|---|---|
| **Shopify** | Free **Digital Products** app can email files automatically after successful payment | Products, variants, stock, shipping and fulfillment integrations in the same store | **Recommended when paid packs launch**, because merchandise is part of the plan |
| **Stripe** | Payment Links/Checkout take payment; add a delivery partner or your own reliable fulfillment service | Flexible, but catalog, shipping, inventory and fulfillment need additional software | Good if you want a custom store and are willing to maintain it |
| **Square** | Standard Square Online digital items require manual email delivery; its docs point to **SendOwl** for automation | Particularly useful if an existing Square/POS operation also sells in person | Reasonable if already using Square; extra delivery setup for digital packs |

You do not need all three. For Shopify, start with **Shopify Payments if your country/business is eligible**, configured inside Shopify. A separate Stripe Payment Link does not automatically create a Shopify order or trigger Shopify file delivery. An external gateway can also incur Shopify's additional third-party transaction fee.

Standard Shopify Payments, Stripe Payments and Square processing do not automatically make the provider the merchant of record. You remain responsible for the applicable business, refund and tax obligations. Tax calculation is not the same as registration, filing or remittance. Stripe Managed Payments is a separate merchant-of-record offering with its own eligibility and additional fees; evaluate it separately if choosing that route.

## What to charge

| Offer | Proposed USD price | Clear promise |
|---|---:|---|
| Current app and trial collection | $0 | Existing offline features and included artwork |
| New original themed pack | $4.99 once | 5–8 clearly listed new artworks, with import instructions |
| Three-pack bundle | $12.99 once | Three named packs, delivered as separate importable files |
| Optional support payment | Around $5 once | Support for the project; no exclusive content or all-future-products promise |

Start with one or two strong new collections. Avoid a subscription for the current offline app; recurring billing should fund a continuing benefit that has been designed and costed.

**Do not charge for repackaging the existing public trial files.** Current code and artwork are in the repository/build. Use new premium artwork, keep the full deliverables outside the public repo, app and website, and publish only previews. Downloaded offline files can be shared; do not promise DRM.

Start paid packs and merchandise with original Cali/Charmlet work and other artwork cleared for that use. Approval of the artist studies' designs is not a commercial likeness, trademark or merchandise licence. The public release lineup, source/artwork terms and paid rights remain owner decisions.

## Fees: US examples, not an account quote

The business country has not been selected. These are published US standard examples, before taxes, international cards, currency conversion, refunds, delivery services, hosting or artwork costs.

| Route | Published example |
|---|---|
| [Stripe standard](https://stripe.com/pricing) | 2.9% + $0.30 per successful domestic-card transaction; Payment Links are included in standard Payments pricing |
| [Square Payment Links](https://squareup.com/us/en/payment-links) | No monthly Payment Links fee; 3.3% + $0.30 per online transaction for new Square customers, with different rates for some methods |
| [Shopify Basic](https://www.shopify.com/pricing) | $39/month paid monthly, or $29/month billed annually; standard online card rate from 2.9% + $0.30 through Shopify Payments |
| Shopify qualifications | Premium online card rates shown as 3.5% + $0.30; Basic lists a 2% third-party transaction fee when an external gateway is used. Confirm exemptions and account terms |

At **$4.99**, approximate proceeds after only the stated standard card fee are **$4.55 with Stripe or Shopify Payments**, or **$4.53 with Square Payment Links**. These are not profit. Shopify's subscription and any delivery-service charges are additional.

For illustration, Shopify Basic paid monthly plus one US$20 Vercel Pro base totals **$59/month before usage and other costs**. Roughly thirteen $4.99 sales at $4.55 net card proceeds cover only those two base charges. There is no reason to start paying for a store before products and delivery are ready.

## Shopify: recommended setup

1. **Create the store and payment account yourself.** Choose the correct business country/currency, complete the business and payout checks, and configure Shopify Payments or a supported alternative. Verify costs and eligibility in that account.
2. **Install Shopify's free [Digital Products app](https://apps.shopify.com/digital-downloads).** The older URL still contains `digital-downloads`; the current app/documentation name is Digital Products.
3. **Prepare a private deliverable.** A ZIP can contain one or more `.charmlet.json` files plus a short installation guide. The current importer accepts data-only PNG packs with at most **12 charms per pack file**. It does not install new live-character behavior.
4. **Create the product and attach its files.** In **Apps → Digital Products**, use **Add assets → File**, upload the deliverable and associate it with the correct product/variant. Edit the product's title, price, status and sales channels under **Products**. Purely digital products must not require shipping.
5. **Set delivery to Send automatically.** The app emails the buyer an asset link after successful payment. Choose any access limit deliberately; the documented default is unlimited. Add the product to a **Digital collections** collection.
6. **Add the buyer-facing essentials.** Describe every included charm, supported apps, how to import, support contact, refund terms and the applicable tax treatment. Do not imply the pack adds live behaviors.
7. **Test the entire purchase path.** Use Shopify Payments test mode or the supported test gateway. Check approved/declined payments, receipt email, delivery email, reopening the download, and importing into both apps. Check how refunds and access revocation behave; a refund cannot erase an already downloaded file. See [test orders](https://help.shopify.com/en/manual/checkout-settings/test-orders).
8. **Activate only after review.** Switch the account/product to the intended live settings and verify the live product URL. Set `website/launch.json`'s `shop.provider` to `shopify` and `shop.url` to that verified store/collection URL, then deploy a tested site update.

The [official Digital Products guide](https://help.shopify.com/en/manual/products/digital-service-product/digital-downloads) confirms ZIP support, automatic delivery after payment and support for orders combining physical and digital products. Use private uploaded files for purchases, rather than putting full packs in Vercel's public assets.

Buyer instructions should say:

- Download and extract the ZIP.
- **VS Code:** Command Palette → **Charmlet: Import Charm Pack**, then choose the `.charmlet.json` file.
- **Desktop:** tray menu → **Import Pack…**, then choose the same file.
- Open **Charms**, find the new collection and select a design.

## Stripe: how charging and delivery fit together

1. In Stripe's Dashboard, finish the business/payout setup and work in a **sandbox/test environment** first.
2. Create a **Product** describing the pack, then a **one-time Price** for the agreed amount/currency. A Product says what is sold; a Price says how much and whether it repeats.
3. Create a **Payment Link**, collect the customer's email, and show the refund/support terms. A public Payment Link can be linked from a static website without exposing a secret key.
4. Choose fulfillment before selling. Use a compatible delivery partner from Stripe's [post-payment options](https://docs.stripe.com/payment-links/post-payment), or build the server flow below.
5. Test successful and declined payments, delayed methods if enabled, delivery/retry, repeat download and import in both apps. Move to live settings only when those steps work.

For a custom integration, a **webhook** is Stripe's signed server notification that an order changed. The server must:

- Verify the signature using the **raw request body** and server-held webhook secret.
- Retrieve the Checkout Session/line items; check paid status, currency, test/live mode and an approved Price. Never trust a browser-supplied amount or `?paid=true`.
- Save the order durably, using the Checkout Session ID as a unique key so repeated/concurrent events do not create duplicate fulfillment.
- Generate an expiring link from private storage and email it. Record delivery status and retry failed email without charging again.
- Handle delayed-payment success/failure when enabled, refunds and purchase recovery. A buyer may close the browser before reaching the success page.

Stripe's [fulfillment guide](https://docs.stripe.com/checkout/fulfillment) explains these guarantees. **This repository does not currently implement that Stripe webhook, order database or paid-file service.** A success-page redirect alone would not be sufficient.

After testing and approval, `shop.provider: stripe` and a verified public Payment Link can reveal the site link. This configuration does not implement fulfillment or activate a merchant account.

## Square: what to set up

1. Create/verify the Square business account, location, currency and payouts.
2. Create a digital item in Square Online or the appropriate payment link, with an accurate price and buyer email.
3. Add automatic delivery before unattended sales. Square's [non-physical-item guide](https://squareup.com/help/us/en/article/6873-sell-non-physical-items-in-square-online-store) says digital files are sent manually and points to the **SendOwl integration** for automation. Check that integration's current plan, capabilities and test flow.
4. Test the actual payment-to-delivery connection, repeat downloads, refunds and app imports. If integrating Square's API, use its [Sandbox](https://developer.squareup.com/docs/devtools/sandbox/overview); do not assume a live Dashboard payment link is a sandbox link.
5. Configure a verified public storefront/link with `shop.provider: square` only after delivery and the live offer are approved.

Square is useful if the business later sells in person. It is not the simplest first digital-pack store when no Square operation already exists.

## Merchandise later

Keep digital packs and physical products as separate collections within the chosen store. When merchandise is ready:

- Make print-quality source artwork and order samples. The app's **216×252 PNGs are not print masters**.
- Add physical SKUs/variants, sizes, stock, package weights and shipping profiles. Physical items require shipping; digital-only packs should not ask for it.
- Choose stock handling or a print-on-demand fulfillment partner, and test a physical order, tracking, delivery and return.
- Write physical shipping/return terms separately from the digital refund policy.
- Add a merchandise navigation/category on Charmlet only when real products and fulfillment exist.

With Shopify, Digital Products can still deliver digital portions after payment while physical items follow their shipping/fulfillment settings. Test mixed carts before offering a combined bundle.

## Decisions before the first charge

The owner still needs to choose the business country/currency, provider/plan, first cleared premium artwork, prices, customer support address, refund terms and tax setup. Then verify payment, private delivery and both-app imports before enabling the public shop link.

For now, `website/launch.json` leaves `shop` null. The site offers the free trial and gallery, with merchandise described only as a later plan. See [Vercel hosting](vercel-hosting.md) for deployment.
