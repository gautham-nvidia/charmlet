# Charmlet Photo Studio preparation

Photo Studio is an optional gated website service for creating a personal data-only Charmlet pack. It is **Coming Soon and unavailable by default**. The extension, desktop app, importer and existing gallery remain free.

## Hosting boundary

Studio requires the Node gallery server because entitlement endpoints are server-only. A static host can show the unavailable page but cannot safely hold merchant credentials or issue sessions.

Configuration is accepted only when all required environment values pass the frozen validator:

| Environment variable | Purpose |
|---|---|
| `CHARMLET_STUDIO_ENABLED=1` | Explicit opt-in; otherwise Studio is unavailable |
| `CHARMLET_STUDIO_MODE=test|live` | Must match the authenticated order's mode |
| `CHARMLET_STUDIO_STORE_ID` | Exact merchant store identity |
| `CHARMLET_STUDIO_PRODUCT_ID` | Exact Photo Studio product identity |
| `CHARMLET_STUDIO_VARIANT_ID` | Exact configured variant identity |
| `CHARMLET_STUDIO_ORIGIN` | Exact same-origin website URL |
| `LEMONSQUEEZY_API_KEY` | Server-only read-only API key for order verification |
| `CHARMLET_STUDIO_SESSION_SECRET` | Server-only secret of at least 32 bytes |
| `CHARMLET_STUDIO_CHECKOUT_URL` | Optional validated HTTPS Lemon Squeezy checkout URL |

Never put the API key or session secret into `website/dist`, browser JavaScript, logs, screenshots or source control.

## Privacy and entitlement behavior

- The browser sends only a licence key to `/api/studio/unlock`; photo bytes, crop settings, names and generated PNG data never enter the server API.
- The signed HttpOnly/SameSite session lasts at most one hour and is also bounded by licence expiry.
- Export rechecks the current session. Expired or unverifiable sessions lock export while retaining the current photo only in browser memory for re-verification.
- Lock clears the cookie and disposes the in-memory photo/canvas state.
- No photo or licence key is saved to Local Storage or Session Storage.
- PNG/JPEG/WebP inputs are bounded to 8 MiB, 8192 dimensions and 16 million decoded pixels.
- Output is 216×252 PNG inside the existing validated data-only pack format.

## Test and live boundaries

The owned browser check uses a random localhost port, an injected fake verifier and an explicit clock. Its test-mode banner and signed cookie prove the prepared integration, not a real purchase. No real provider request, merchant account, charge, checkout navigation, price, sandbox purchase, signing or public deployment has been verified.

A real Lemon Squeezy sandbox purchase/key/order check requires owner-provided merchant configuration. Live pricing, provider account, public hosting and launch decisions remain release gates.
