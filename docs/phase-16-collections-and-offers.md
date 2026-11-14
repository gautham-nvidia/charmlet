# Collections and Pro offers

Extension 0.14.0 and desktop 0.11.0 expand the catalogue to 258 designs, retain the 31-charm starter and add a compact website theme control and optional subscription popup. The candidate remains for review; live provider configuration and artwork clearance are still required.

## Collections

| Collection | Change |
|---|---|
| Sports Icons | 14 studies included with Pro; no individual sports purchase or free-claim route |
| US Tech Hubs & Skylines | 13 new miniature city designs |
| California | Santa Clara Office and San Francisco Tower use generic names; Cupertino Ring Campus depicts the current circular headquarters |
| Retired starter designs | Alpine Lake → San Francisco, Night Sky → Austin, Ringed Planet → Seattle |

The sports lineup is Messi, Ronaldo, Michael Jordan, Kobe Bryant, LeBron James, Stephen Curry, Tom Brady, Patrick Mahomes, Serena Williams, Usain Bolt, Simone Biles, MS Dhoni, Sachin Tendulkar and Lewis Hamilton. Mia Hamm and Caitlin Clark are removed from the current lineup. Ten retained sports images preserve their earlier private-pack bytes, so identical existing imports keep their IDs and do not acquire duplicate bundled tiles.

Cities are Bay Area/Silicon Valley, San Francisco, San Diego, Austin, Raleigh-Durham, Dallas, Miami, Seattle, Boston, New York, Chicago, Atlanta and Denver. No company names or logos appear in the new city illustrations. Historical source IDs remain stable for the renamed buildings.

Existing beta access remains frozen, with free replacements for the three retired designs. Personal imports, pins, cord preferences, photos and earned flowers remain usable. The current artwork is bundled for offline use; trial/Pro access still requires the configured verified-email service.

## Website and email

- Auto follows the system appearance by default. One 44-pixel button cycles Auto → Light → Dark, saves the choice and exposes an accessible label.
- The first-visit offers popup closes with Escape, its close button, the backdrop or “Maybe later.” Dismissal pauses automatic display for seven days; the footer can reopen it.
- The popup uses explicit subscription consent. The separate download form keeps its offers checkbox unchecked. Email confirmation is required before joining the mailing list.
- Subscribing neither starts a trial nor grants Pro. Email is not stored in browser storage. Unconfigured signup remains disabled and explains why.
- Hosted Pro checkout permits provider-managed coupon codes. Item checkout keeps discounts off. The signed payment handler validates the original server-owned cart subtotal and bounds the provider discount.

Start with a dedicated regular Gmail address for support and account administration. Use Brevo for confirmed subscribers and campaigns, with an authenticated sender domain before public delivery. A paid Google Workspace mailbox is optional. Create an actual code, its terms and its Pro restriction in Lemon Squeezy, then rehearse a discounted purchase/refund before mailing it.

See [the service setup guide](../service/README.md) for account configuration, public signing keys, private secrets, delivery and provider checks. An `audience.json` form URL alone does not enable the popup.

## Artwork and verification

The review inventory has 280 bounded, unique records and 234 featured designs. The review-only status, image-path validation, immutable pack rules and public exclusion of installers/raw packs remain enforced. Unchanged legacy descriptions and image bytes are retained; renamed/new designs carry their revised metadata.

A native check caught a cord ending on a faint skyline edge. The attachment calculation now keeps its downward inset on opaque pixels, including slanted roofs and instrument necks. A regression test uses a slanted three-pixel silhouette; native checks measure the real rendered cord endpoint.

Local checks recorded so far:

- 101 app model tests, including migrations, imported ownership and attachment geometry.
- 13 service tests, including subscription without trial and Pro-only sports guards.
- Public website checks across 258 designs and 320/390/768-pixel layouts, with keyboard dismissal, theme persistence, protected delivery and isolated email/checkout responses.
- Desktop model, development-host and extracted Windows archive checks.
- Native VS Code sports/city imports, visible cord attachment, retained beta access and free-starter boundaries.

The release gate adds nine hosted jobs covering service/website security, Windows/Linux/macOS editors and Windows/macOS desktop archives, including native Windows input. Run them against the final candidate and record results and package hashes in the session handoff. The provider checks use simulated services; real subscriber email and payment still require the setup rehearsal.

## Before public launch

Configure sender/service/merchant accounts, publish the activation public key and rebuild the apps; finish artwork/likeness review, signing and remaining manual platform checks; then rehearse real email, coupon purchase, download and refund. Current configuration leaves signup and checkout off. Calling a portrait “inspired,” or including it with Pro, does not itself supply commercial rights.
