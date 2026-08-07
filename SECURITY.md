# Security

## Chrome permissions

- `contextMenus`: creates **Create Shipping Label**, limited to selected text.
- `sidePanel`: opens the workflow beside the active webpage.
- `storage`: keeps the saved sender and latest explicit selection locally.

The extension requests no `activeTab`, scripting, or tabs permission. A declarative content script runs only on `http://*/*` and `https://*/*` pages so it can reconstruct the user's current selection with rendered block and line-break boundaries. It responds only to the extension's `GET_STRUCTURED_SELECTION` message and reads only the active browser selection. Chrome pages and other restricted schemes are excluded.

## Secrets and backend rules

- Never put ShipAir, payment, marketplace, or other private keys in source code, a Vite environment variable, the manifest, or extension storage.
- Variables prefixed with `VITE_` are bundled into client code and must always be treated as public.
- `.env` files are ignored; `.env.example` contains documentation and safe placeholders only.
- ShipAir provider calls pass through the Click2Ship backend with server-side secret storage. `SHIPAIR_API_KEY` belongs only in `backend/.env`.
- `EASYPOST_API_KEY` is backend-only. Never expose it through a `VITE_` variable, the extension
  bundle, diagnostics, or logs. Development should use an EasyPost test key.
- The backend must validate all client data, enforce authorization and rate limits, protect against replay with idempotency keys, and avoid logging sensitive address or payment data unnecessarily.
- Payment details should be tokenized by a compliant provider and must not transit extension storage.
- Stripe-hosted Checkout is created by the backend using `STRIPE_SECRET_KEY`. Webhooks are verified
  from their raw request bytes using `STRIPE_WEBHOOK_SECRET`; success redirects are never trusted for
  fulfillment. Amounts are calculated by the backend and card details never pass through Click2Ship.

## Local data

Sender and selected recipient text may contain personal information. They remain in `chrome.storage.local` for this MVP. A production version should provide visible deletion controls, document retention behavior, minimize stored fields, and clear shipment drafts at appropriate lifecycle points.

The development backend binds only to loopback, applies an exact-origin CORS allowlist for the configured extension ID and local Vite UI, redacts address bodies and authorization headers from logs, and rejects invalid shipment data independently of the extension. Never use wildcard CORS. Before deployment, add user authentication, a durable idempotency repository, distributed locking, HTTPS, rate limits, audit records, and retention controls.

ShipAir labels are real and final. The UI requires explicit confirmation, sends one POST without automatic retries, and treats a post-submission timeout as unknown.
