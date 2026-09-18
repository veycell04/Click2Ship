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

All Chrome Web Store links use the production URL in `lib/chromeStore.ts`:
https://chromewebstore.google.com/detail/shipdime/efjokppnnolhmjgmdokogmacmcojglek

`NEXT_PUBLIC_CHROME_STORE_URL` is no longer used; stale deployment values cannot override the production listing.

No backend credentials belong in this application. Public browser environment variables must use the `NEXT_PUBLIC_` prefix and must never contain secrets.

## Vercel

Import the repository and configure:

- Root Directory: `website`
- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave unset (Next.js default)

No Chrome Web Store environment variable is required. The site is intended to be served at `https://www.shipdime.com`.

## Legal review

The privacy and terms pages reflect current application behavior observed in the extension and backend. Before launch, counsel or the product owner should decide and document:

- retention and deletion periods for shipment, quote, order, and label records;
- refund or void eligibility for purchased but unused labels;
- handling of duplicate charges and carrier adjustments;
- governing law, legal entity details, liability limits, and dispute terms.
