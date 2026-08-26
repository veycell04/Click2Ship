# ShipDime Website

Official public website for ShipDime, implemented as an independent Next.js application.

## Local development

```powershell
cd website
npm install
npm run dev
```

The site is available at `http://localhost:3000` by default.

## Production verification

```powershell
npm run lint
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local` when a Chrome Web Store listing is available:

```text
NEXT_PUBLIC_CHROME_STORE_URL=https://chromewebstore.google.com/detail/...
```

If the variable is missing or blank, the primary call to action displays “Coming to Chrome” and does not create a dead store link.

No backend credentials belong in this application. Public browser environment variables must use the `NEXT_PUBLIC_` prefix and must never contain secrets.

## Vercel

Import the repository and configure:

- Root Directory: `website`
- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave unset (Next.js default)

Add `NEXT_PUBLIC_CHROME_STORE_URL` only when the public listing is ready. The site is intended to be served at `https://www.shipdime.com`.

## Legal review

The privacy and terms pages reflect current application behavior observed in the extension and backend. Before launch, counsel or the product owner should decide and document:

- retention and deletion periods for shipment, quote, order, and label records;
- refund or void eligibility for purchased but unused labels;
- handling of duplicate charges and carrier adjustments;
- governing law, legal entity details, liability limits, and dispute terms.
