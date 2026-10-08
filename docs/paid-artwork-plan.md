# Paid artwork collections - proposal - 2026-10-06

> **Proposal only. Nothing in this document is live, approved for sale, or an instruction to create accounts or accept legal terms.**

Charmlet's extension, every functional control, the importer, ten bundled defaults, and the current six gallery extras remain free. Optional paid artwork may be considered only after Phase 3 public-release readiness and owner decisions are complete.

## Proposed first delivery model

Use a hosted one-time checkout and private file delivery service for the first paid artwork release. Lemon Squeezy is the current recommendation because its official documentation supports digital product files, receipt/account downloads, and merchant-of-record payment and tax handling. Store activation requires provider review. No Lemon Squeezy account, commerce MCP, product, price, checkout link, or approval exists in this repository.

Proposed flow:

1. Approve five original artworks and the applicable artwork license.
2. Build and validate one five-charm version-1 JSON pack.
3. Upload the full pack only to the merchant's private product files.
4. Publish a separate public preview, name, count, final owner-approved price, and hosted checkout link.
5. Let the provider handle purchase, receipt, and authenticated file delivery.
6. Import the downloaded pack through free Charmlet.

This initial provider-hosted approach needs no custom payment backend. A success-query parameter must never be treated as proof of payment.

Keep paid source files and full paid packs outside this public repository and generated website. Public preview images are separate assets. Private hosted delivery avoids a trivial public-download bypass, but downloaded offline artwork can still be copied; do not promise digital rights management (DRM). Do not add license-key feature locks or a subscription requirement.

## Draft pricing—not approved

A possible starting point is **about US$5 for one original five-charm pack**. Final currency, price, taxes, terms, refund policy, pack size, and launch timing belong to the owner. No real product or Buy control should be created until those decisions and provider approval exist.

Suggested first original collections:

- **Silicon Lab**
- **Trail Days**
- **City Lights**

Each would contain five original designs and fit the current 1–12 charm pack format.

## Collection ideas and rights boundaries

| Theme | Original design directions | Boundary |
|---|---|---|
| Cities | Skyline, cable car, streetlamp, subway sign, coffee shop | No transit or company logos |
| Silicon Valley Days | Startup garage, code laptop, coffee mug, cable car, circuit skyline | Generic places and objects only |
| Mountain Mornings | Snowy peak, pine, tent, compass, camp mug | Original landscapes |
| Park Landscapes | Granite cliff, redwood grove, geyser, layered canyon, desert arch | No official National Park Service badges or arrowhead |
| Silicon Lab | Wafer pass map, scope waveform, probe tips, test-handler clamp, eye-diagram tile | Invented signals/maps; no proprietary device or test data |
| Compute Club | Generic GPU board, CPU package, heatsink, memory modules, tensor cube | No company or product logos |
| AI Companions | Friendly robot, neural graph, token stack, dataset jar, matrix cube | Original characters and diagrams |
| Original Mascots | Rubber duck, bug gremlin, coffee cat, pocket astronaut, sleepy robot | Original character designs |
| Comic Originals | Cape fox, circuit guardian, masked debugger, speech-bubble art | Not lookalikes of licensed characters |
| Licensed Collaborations—later | Marvel/DC/recognizable cartoons or NVIDIA-branded art | Obtain the appropriate written rights before inclusion in commercial packs or advertising a branded collection. |

Employment does not establish permission to use NVIDIA branding. For commercial Charmlet packs, obtain the appropriate rights before using recognizable third-party characters or branded artwork. Generic GPU, CPU, silicon-testing, city, mountain, park, and AI concepts do not automatically require branded imagery; keep implementations original and unbranded.

## Owner decisions before live sales

- Final personal publisher identity.
- Source-code license and free/paid artwork licenses.
- Public hosting and domain.
- Merchant country, account, provider review, and acceptance of legal terms.
- First collection, artwork approval, price, currency, refunds, and support policy.
- Written permissions for any protected brands or licensed characters.

The correct phase order is: finish and merge Phase 3 public-release readiness and obtain publication decisions, then create a separate paid-commerce phase branch. The user allowed a next phase only when ready; it is not ready today.

## Official references

- [Lemon Squeezy merchant of record](https://docs.lemonsqueezy.com/help/payments/merchant-of-record)
- [Lemon Squeezy product files](https://docs.lemonsqueezy.com/help/products/adding-products)
- [Lemon Squeezy getting started](https://docs.lemonsqueezy.com/guides/getting-started)
- [NVIDIA logo and brand usage](https://www.nvidia.com/en-us/about-nvidia/legal-info/logo-brand-usage/)
- [National Park Service arrowhead requests](https://www.nps.gov/subjects/partnerships/arrowhead-requests.htm)
- [Marvel content licensing contact](https://www.disneystudiolicensing.com/who-do-i-contact-to-license-content-from-marvel-films/)

No rights holder or merchant was contacted while preparing this proposal.

## 2026-10-07 - Market comparison and focus-timer interest

The owner requested a comparison with desktop charm products, expressed interest in focus timers and asked about a standalone Windows/macOS version. The [competitive review](competitive-review.md) records the public evidence and its access limitations.

Several alternatives already offer free functionality, personal-image customization or focus timers. The approximately US$5/five-artwork idea remains an unvalidated proposal. Prioritize original coding/silicon artwork and useful free features, then test demand for one carefully made collection before expanding paid inventory.

A free focus timer, local pack creator and a standalone host are recommendations for future work, not implemented features or approved new phases. They do not change the permanently free extension/importer requirement or authorize merchant accounts, licensed artwork, charges or publication.

## 2026-10-08 - Owner revision for Phase 4–7

The owner has authorized Phase 4 companion work before public extension-store launch. The earlier recommendation that publication must precede Phase 4 is superseded; Phase 5 now owns publisher, license, store and launch-gate decisions. The earlier recommendation for a free personal-photo creator is also superseded by the owner's explicit **paid website Photo Studio** exception.

- The extension core, focus/productivity features, learning, water/move reminders, garden, earned flowers, importer and ten bundled defaults remain free.
- Continue releasing more original free website extras. The website remains the only download/sales channel for additional packs; the IDE imports ordinary downloaded pack files and is not a storefront.
- Garden flowers are earned locally through free progress and are not downloaded or sold.
- Optional original premium artwork remains a one-time purchase proposal. The owner requested very low pricing; my exploratory recommendation is approximately **US$1.99–$2.99** for a small pack, not an approved live price.
- The paid website Photo Studio may create a normal pack from a private personal photo for the free importer. Prefer local crop/fit/background processing, metadata-free static output and no retained private image where practical.
- Marvel/DC, recognizable characters, NVIDIA/company logos and other rights-dependent collaborations remain Phase 7+ ideas requiring appropriate commercial rights.
- No live merchant account, product, payment, checkout, approved price, public deployment or Photo Studio exists yet.

These changes authorize planning and Phase 4 implementation on its branch; they do not approve legal terms, merchant accounts, licensed art, charges or public launch.
