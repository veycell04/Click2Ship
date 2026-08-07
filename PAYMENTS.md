# Click2Ship payments

Click2Ship uses Stripe-hosted Checkout in Stripe **test mode**. Stripe.js and payment credentials
never run inside the Chrome extension. The backend calculates the amount, creates Checkout, verifies
webhooks, and creates the ShipAir label only after a verified paid event.

## Local configuration

Copy `backend/.env.example` to `backend/.env` and configure Stripe test credentials. Never use an
`sk_live_` key for this milestone.

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLICK2SHIP_PUBLIC_BASE_URL=http://127.0.0.1:3001
CLICK2SHIP_SUCCESS_URL=http://127.0.0.1:3001/payment/success
CLICK2SHIP_CANCEL_URL=http://127.0.0.1:3001/payment/cancel
DATABASE_URL=postgresql://...
EASYPOST_API_KEY=EZTK...
CLICK2SHIP_DISCOUNT_PERCENT=20
```

Start the backend with `npm --prefix backend run dev`. In another terminal authenticate and forward
Stripe events:

```powershell
stripe login
stripe listen --forward-to 127.0.0.1:3001/api/webhooks/stripe
```

Copy the `whsec_...` value printed by `stripe listen` into `STRIPE_WEBHOOK_SECRET`, then restart the
backend.

## Test checkout

Use Stripe's standard successful test card documented in the Stripe test-mode Checkout page. Do not
put card numbers in source code, tests, logs, or extension storage, and do not use a real card.

1. Select and verify a shipment in Click2Ship.
2. Confirm the final-label policy.
3. Click **Pay [quoted amount] and Create Label**.
4. Complete Stripe-hosted Checkout in test mode.
5. Observe `checkout.session.completed` in Stripe CLI.
6. Return to the side panel; it polls until the verified webhook creates the label.

The success redirect only displays a receipt message. It never fulfills an order.

Stripe Checkout accepts a backend `quoteId`, not a client amount. The backend loads the unexpired
quote and its immutable shipment snapshot, then uses `customerPriceCents` as Stripe's integer-cent
amount. Creating a newer quote for the same selection invalidates the older quote.

EasyPost supplies USPS retail reference rates only. Payment fulfillment never buys an EasyPost
label: the verified Stripe webhook uses the stored ShipAir label type and shipment snapshot to ask
ShipAir to create the final label.

## State and duplicate prevention

Orders progress through `draft`, `checkout_created`, `payment_pending`, `paid`, `label_processing`,
and `label_created`, with `payment_failed` and `label_failed` terminal attention states. One order is
correlated to one selection ID. Active Checkout Sessions are reused. Webhook fulfillment atomically
claims `label_processing`; duplicate events see an existing processing or completed state and cannot
create another ShipAir label.

If payment succeeds but ShipAir fails, the order remains paid as `label_failed`. It must be reviewed
and retried administratively against the same paid order; Click2Ship must not automatically create a
new charge. Production deployment requires a durable transactional database, distributed locking,
authenticated admin recovery, HTTPS public webhook hosting, monitoring, and refund/support tooling.

## Vercel deployment

Set the Vercel project Root Directory to `backend`. Fastify is detected from `src/server.ts`. Connect
a managed Postgres integration (for example Neon) and configure `DATABASE_URL`; production startup
fails instead of falling back to memory when this variable is missing. The Postgres repositories
persist quotes, orders, and label idempotency records and use unique selection IDs plus an atomic
label-processing claim.

Configure Stripe's test webhook endpoint as:

```text
https://YOUR-BACKEND.vercel.app/api/webhooks/stripe
```

Subscribe it to `checkout.session.completed`, copy that endpoint's `whsec_...` signing secret into
Vercel, and set both success/cancel URLs to the public Vercel origin. Stripe signature verification
uses the unmodified raw request body.
