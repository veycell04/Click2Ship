# Click2Ship Architecture

## Current extension

The MV3 service worker owns Chrome integration. It registers a selection-only context menu, requests a structured selection from the active tab, stores the selected text, and opens the side panel for that tab. A declarative content script on normal HTTP and HTTPS pages clones the active DOM Range and preserves block and `<br>` boundaries. If messaging is unavailable, the worker falls back to Chrome's `info.selectionText`.

The content script owns extraction. The React side panel consumes only a stored `AddressExtractionResult` and owns the editable recipient and sender forms, local sender persistence, package details, development pricing, final confirmation, and normalized backend label output. Vite emits the panel and service worker into `dist/`; a second Vite target emits the content script as a self-contained classic script required by MV3.

The side panel displays exactly one `ShipmentSession`. A new context-menu selection replaces that session immediately, including a fresh empty recipient, while sender data remains persistent and independent. Capture and extraction results carry the session ID end to end; both the background worker and the session reducer reject asynchronous results for an older session. This single-source-of-truth boundary can later be lifted into a session collection for undo, history, queues, and auto-save without changing recipient ownership.

Core models live under `src/domain`. Integration boundaries are represented by interfaces:

- `AddressParserProvider` isolates the postal-library implementation.
- `UniversalAddressExtractor` owns shared extraction and confidence scoring.
- `AIExtractionProvider` defines an optional low-confidence fallback. The MVP implementation makes no network calls.
- `ShippingProvider` isolates quoting and label creation.
- `PaymentProvider` defines a future payment authorization boundary.
- `AddressValidationProvider` defines future normalization and validation.
- `MarketplaceAdapter` only identifies a marketplace and isolates its visible raw address block.

Recipient extraction runs in priority order:

1. Amazon and TikTok adapters use semantic page structure to isolate a visible shipping-address block. The generic adapter returns selected text.
2. Every raw block is passed to the same `UniversalAddressExtractor`.
3. The extractor preserves line breaks, removes labels and metadata, detects phone/postal structure, and calls `UniverseAddressParser` for the postal portion.
4. Incomplete or low-confidence results pass to the configured `AIExtractionProvider`. The MVP provider returns `null` without calling an AI service.
5. The result remains editable. Postal validation is a separate `AddressValidationProvider` step before a future label purchase.

All strategies return `AddressExtractionResult`, including their source and confidence. Provider interfaces are seams for future secure backend clients using AI, Python `usaddress`, libpostal, or carrier validation. The UI never knows which marketplace supplied the raw text.

## Future production flow

```text
Chrome side panel
  -> Click2Ship backend (authenticated HTTPS)
      -> address validation provider
      -> payment provider
      -> ShipAir provider
      -> audit and shipment database
```

## Current ShipAir development backend

`backend/` is a separate Fastify TypeScript service bound to `127.0.0.1:3001`. The extension uses `Click2ShipBackendClient`; it never imports ShipAir provider code. The backend validates shipment data again, converts ShipAir responses into Click2Ship domain types, and streams label PDFs without exposing the bearer token.

`LabelRepository` isolates idempotency state. The development implementation is in-memory. A production implementation must use PostgreSQL with a unique constraint on `selectionId` and an atomic processing lease so multiple server instances cannot create duplicates.

The provider timeout distinguishes ordinary GET timeouts from a POST label timeout. A POST timeout is recorded as `unknown` and is not automatically retried.

The backend will own authentication, authorization, rate limiting, idempotency, payment state, shipment persistence, secret storage, and provider calls. The extension will send normalized user-entered shipment data over authenticated HTTPS and receive display-safe quotes and label metadata. Short-lived label downloads should be delivered through authorized, expiring URLs.

## Pricing and fulfillment providers

`RateProvider` isolates backend rating. `EasyPostRateProvider` creates a rating-only Shipment, converts
pounds to ounces, filters to USPS, and exposes only valid `retail_rate` values. Central service
mapping pairs EasyPost `Priority` with ShipAir label type `87`; unmapped services are rejected.
`LiveEasyPostPricingService` calculates the configured discount in integer cents and persists the
ten-minute quote with an immutable shipment snapshot.

Checkout accepts only the quote ID and uses its stored price. After a verified paid Stripe webhook,
ShipAir remains the sole label provider. No EasyPost buy operation exists in this flow.

Production uses Postgres-backed quote, order, and label repositories. Unique selection IDs prevent
duplicate orders, Stripe receives a quote-based idempotency key, and the transactional order claim
allows only one webhook worker to enter `label_processing`. In-memory repositories are restricted
to local development and automated tests.

Additional marketplace adapters should use semantic DOM relationships and stay isolated behind `MarketplaceAdapter`. Host access should remain limited to ordinary HTTP/HTTPS pages used for explicit selection extraction, with restricted browser pages excluded.
