# Monetizing Charmlet

**Recommendation: keep the useful app free and start with optional one-time artwork packs.** Use a provider that delivers the download and handles transaction taxes for the first release. Avoid charging a subscription for the current offline features.

This is a proposal requested by the owner on 2026-11-05. No price, paid product, merchant account, checkout or charge has been activated.

## A practical first offer

| Offer | Proposed price (USD) | What the buyer gets |
|---|---:|---|
| Free app | $0 | Focus, garden, small wins, local photo charms, importer, basic cords, Sunny and basic fidgets, plus a selected starter collection |
| Optional themed pack | $4.99 once | 5-8 new, approved original artworks and future fixes to that pack |
| Three-pack bundle | $12.99 once | Three named packs, delivered as separate importable files |
| Optional support | Around $5 once | Support for the project, clearly described without implying exclusive content or all future products |

Choose one or two distinctive themes first, such as original South Indian everyday objects or a recognizable lab collection. Quality and a clear theme are more useful than a very large catalogue. The current trial keeps all 156 charms available; the public bundle and any future paid additions still need the owner's selection.

Do not remove already promised free functionality to manufacture a paid tier. Local photos are already free. The older paid website Photo Studio proposal is poor launch value now that the apps can make photo charms locally; leave it disabled unless it gains a separate useful service.

Subscriptions could make sense later for a regularly delivered art club or an AI-generation allowance with measured recurring costs. Do not promise unlimited generation or lifetime access to every future paid pack.

## What the current app can deliver

The importer accepts **data-only PNG charm packs**, with **at most 12 charms per file**. A paid five-charm pack therefore works with the existing app; a large bundle can contain several files.

The live companions are code built into the app. The existing pack format cannot deliver a new live 3D behavior. Selling live companions would first require a designed, validated delivery/entitlement mechanism. Do not advertise a paid live-character download as working today.

All current trial artwork and code are in a public repository/build. A payment link cannot make those existing files exclusive. Create genuinely new premium artwork, keep the full deliverables out of the public repository/site/app, and show separate previews. Offline files can still be shared; do not promise DRM.

## Stripe or a hosted merchant?

A **merchant of record** is the seller for the transaction and handles the covered sales-tax/VAT/GST obligations. A payment processor handles the payment; standard processing does not automatically take over those obligations.

| Route | Why choose it | Work still needed |
|---|---|---|
| **Lemon Squeezy** | Hosted checkout, private digital downloads, receipts and merchant-of-record tax handling in one service | Store approval, product/rights approval, files, price, terms and a tested purchase |
| **Stripe Payment Links / Checkout** | Familiar Stripe account, flexible checkout, lower standard domestic-card fee | Reliable private delivery plus tax setup appropriate to the business |
| **Stripe Managed Payments** | Stripe's merchant-of-record option for eligible digital products | Eligibility/activation, covered-market review, additional fee and private delivery |

For Charmlet's first optional artwork packs, **Lemon Squeezy is the simplest implementation**. The existing repository also has a disabled Lemon Squeezy Studio integration, although selling downloadable packs does not require enabling that Studio.

If staying entirely in Stripe is preferred, investigate **Managed Payments eligibility** before committing to standard processing. Stripe's documentation now supports a merchant-of-record route; the blanket statement "Stripe never handles merchant-of-record obligations" would be incorrect.

## Fee examples

Official public US standard rates checked on 2026-11-05:

- [Stripe](https://stripe.com/pricing): **2.9% + $0.30** for a successful domestic-card transaction. Payment Links are included with standard Payments pricing. International cards, currency conversion, tax services and other options can add fees.
- [Lemon Squeezy](https://www.lemonsqueezy.com/pricing): **5% + $0.50** base transaction fee. Its [fee documentation](https://docs.lemonsqueezy.com/help/getting-started/fees) lists additional fees including international transactions, PayPal and subscriptions; percentages can apply to the tax-inclusive total.
- [Stripe Managed Payments](https://docs.stripe.com/payments/managed-payments): its fee is **additional to Payments fees**. Check the account's current quoted rate and eligibility before comparing a live offer.

Illustrative domestic card sale, with no buyer tax, currency conversion, refunds or extra services:

| Price | Stripe standard: approximate proceeds | Lemon Squeezy base: approximate proceeds |
|---|---:|---:|
| $4.99 | $4.55 | $4.24 |
| $12.99 | $12.31 | $11.84 |

These are payment proceeds, not profit. They exclude hosting, artwork, support and the owner's income/business taxes. The higher hosted-merchant fee may be worthwhile to avoid building and maintaining digital delivery and cross-border tax handling. Confirm rates for the actual merchant country.

Vercel's Hobby plan is for non-commercial use. Published Pro pricing starts at **$20/month**, with possible usage charges. At the illustrative $4.24 proceeds, five $4.99 sales cover only that $20 hosting base. No paid hosting upgrade is authorized by this recommendation.

## Fastest launch: hosted digital delivery

1. The owner creates/activates the merchant account, completes identity and payout details, and obtains store approval.
2. Approve one new collection, its redistribution terms, price, currency, support contact and refund policy.
3. Build a validated `.charmlet.json` pack. Keep the full paid file private and upload it to the product's **Files** area, not public website assets.
4. Create a one-time digital product, add previews and describe exactly which files are included. Keep subscriptions and licence keys off for a simple offline art pack.
5. Test checkout, receipt delivery, repeat download and import into both apps. Test a refund and verify how download access changes.
6. Add the provider's verified checkout link to a separate optional-pack card after approval. The provider's receipt/account supplies the file; the website never needs to hold card details.

Lemon Squeezy [documents product files and delivery](https://docs.lemonsqueezy.com/help/products/adding-products). Its [API file links](https://docs.lemonsqueezy.com/api/files/the-file-object) are signed and expire. Keep checkout links separate from private download URLs.

## If you choose Stripe

### 1. Account and a test product

In the Stripe Dashboard, complete the business/payout setup yourself and work in a **sandbox/test environment first**. Select the correct business country rather than using US rates as an assumption.

Create a **Product**, for example "Charmlet: Lab Days - 6 original charms", and a **one-time Price** in the agreed currency. A Product describes what is sold; a Price defines how much is charged and whether it repeats. Use an accurate product tax code.

Create a **Payment Link** for that Price. Collect the customer's email, show the refund/support terms, and configure a confirmation page. A public Payment Link can be placed on the site; it does not require a secret key in browser code.

If using Managed Payments, confirm [eligibility](https://docs.stripe.com/payments/managed-payments/eligibility) and follow [its setup instructions](https://docs.stripe.com/payments/managed-payments/set-up). Standard Stripe and Managed Payments are different choices, even though both can use Payment Links.

### 2. Deliver the purchase reliably

**Payment Links do not by themselves build Charmlet's private download delivery.** Either choose a compatible delivery service or implement a small server-side fulfillment service.

The custom flow would be:

1. Stripe sends a signed payment event to `/api/stripe/webhook`.
2. The server verifies the signature against the **raw request body**, retrieves the Checkout Session and its line items, confirms paid status, test/live mode and an allowlisted Price.
3. Store the paid order in a durable database with a unique Checkout Session ID. Stripe can retry events or send concurrent deliveries; fulfillment must be idempotent.
4. Create a short-lived download link from **private** file storage and send it to the buyer. Store fulfillment/email status so a delivery failure can be retried without another charge.
5. Provide a way to retrieve a purchase again. Never treat `?paid=true`, a success-page visit or a browser-supplied amount as proof of payment.

Handle `checkout.session.completed` only when payment is actually paid. If delayed payment methods are enabled, also handle `checkout.session.async_payment_succeeded` and failure events. A buyer can pay and close the browser before returning, so the webhook must work independently of the success page.

Stripe's [fulfillment guide](https://docs.stripe.com/checkout/fulfillment) explains these guarantees. [Payment Link post-payment options](https://docs.stripe.com/payment-links/post-payment) also describe partner-based delivery.

### 3. Secrets and testing

For a custom integration, Vercel project environment variables would include `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, plus private storage/database/email credentials. Configure separate preview/test and production/live values. Keep them out of HTML, the extension, Git and chat. This static website currently has **no Stripe webhook, order database or paid delivery**.

Test successful payment, decline, cancelled checkout, delayed success if enabled, duplicate webhook, wrong signature, wrong Price, failed email, expired download and refund behavior. Verify the resulting pack imports in both apps.

Then create the live product/Price/Payment Link and live webhook using the approved final terms. Test and live IDs/secrets are different. The owner reviews the actual checkout before the first real sale.

## Decisions to finish

Choose the first new paid collection and its terms, one-time prices/currency, provider and merchant country, support/refund policy, and a commercial hosting plan. A free public launch can happen before paid packs are ready; payment setup should not hold up the free app once its independent release gates are met.
