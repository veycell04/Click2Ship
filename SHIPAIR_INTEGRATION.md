# ShipAir integration

## Configure

1. Build and load `dist/` through `chrome://extensions`.
2. Copy the extension ID shown by Chrome.
3. Copy `backend/.env.example` to `backend/.env`.
4. Put the ShipAir key only in `SHIPAIR_API_KEY` and the Chrome ID in `CLICK2SHIP_EXTENSION_ID`.
5. Keep `SHIPAIR_BASE_URL=https://shipair.site/api/v1` unless ShipAir supplies another environment.

The extension's public `.env` value is `VITE_CLICK2SHIP_API_BASE_URL=http://127.0.0.1:3001`. Never put a secret in a `VITE_` variable.

## Start and inspect

```bash
cd backend
npm install
npm run dev
```

Health:

```bash
curl http://127.0.0.1:3001/api/health
```

Development balance and label types:

```bash
curl http://127.0.0.1:3001/api/shipping/balance
curl http://127.0.0.1:3001/api/shipping/label-types
```

## One controlled real-label test

1. Confirm the ShipAir account balance and select the intended label type.
2. Use a real deliverable sender and recipient address that you are authorized to process.
3. Select the recipient on the marketplace page and open Click2Ship.
4. Review every parsed field, use at least 2 lb, and enter positive dimensions.
5. Check both confirmations only after the package is packed and the data is final.
6. Click **Create Real Test Label** once. Do not repeat the action if a timeout reports unknown status.
7. Record the selection ID and inspect ShipAir label history before resolving any unknown request.
8. Download the PDF through Click2Ship and verify the tracking number.

## Duplicate prevention

`selectionId` is the idempotency key. Completed requests return the stored label. Processing and unknown requests return HTTP 202 and never call ShipAir again. The in-memory repository resets when the backend restarts; it is suitable only for controlled development. Production requires PostgreSQL persistence and atomic locking.

## ShipAir response assumptions

The supplied requirements documented endpoints but not exact response schemas. The provider currently accepts either a top-level payload or `data`, and common snake_case/camelCase label fields: `id`/`label_id`, `trackingNumber`/`tracking_number`, `labelType`/`label_type`, `downloadUrl`/`download_url`, and `createdAt`/`created_at`. Label types accept an array or `labelTypes`/`label_types`. Balance accepts `balance` or `amount`.

Compare these assumptions with actual non-creating balance and label-type responses before the first label. If ShipAir differs, update only `ShipAirShippingProvider`; extension UI types should remain unchanged.
