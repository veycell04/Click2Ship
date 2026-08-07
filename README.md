# Click2Ship

Click2Ship is a Chrome Manifest V3 extension and local TypeScript backend for creating ShipAir labels without leaving the seller's current page. ShipAir credentials stay exclusively in the backend. Customer payment is not implemented.

## Setup

Requirements: Node.js 20 or newer and a Chrome version supporting the Side Panel API (Chrome 116+ recommended).

```bash
npm install
npm run lint
npm test
npm run build
```

Install and configure the backend separately:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set `SHIPAIR_API_KEY` and `CLICK2SHIP_EXTENSION_ID` only in `backend/.env`. See `SHIPAIR_INTEGRATION.md` before performing a controlled real-label test.

## Install locally in Chrome

1. Build the project with `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist` folder at the project root.

To use it, select a multiline US shipping address on a webpage, right-click, and choose **Create Shipping Label**. The side panel opens with the original selection and editable parsed fields. The toolbar action can also open an empty workflow.

After changing source files, rebuild and click the extension's reload button on `chrome://extensions`.

## Development notes

- `npm run dev` is useful for side-panel UI development in a normal tab, but extension APIs are unavailable there.
- `npm run format` formats source and documentation.
- The development button creates a real, final ShipAir label and can deduct from the configured account balance.
- Sender information and the most recent selected text are stored in `chrome.storage.local` on the user's device.

## Backend boundary

ShipAir credentials must never be embedded in this extension. All ShipAir calls go through the Click2Ship backend, which validates requests, enforces selection-ID idempotency, proxies PDFs, and returns normalized data. The current repository is in-memory and development-only; production requires authenticated users, PostgreSQL persistence, distributed locking, rate limiting, and HTTPS.
