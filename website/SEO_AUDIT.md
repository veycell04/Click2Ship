# ShipDime website remediation report

Scope: website only. Backend shipping/pricing/payment logic, CORS, and the Chrome
extension were not modified. No commit, push, or deployment was performed.

| Issue | Fix / decision | Main files | Verification |
| --- | --- | --- | --- |
| Missing social image | Share complete page metadata; generate branded 1200×630 PNG | `lib/metadata.ts`, `app/opengraph-image.tsx`, layout and page metadata | Both image tags and large Twitter card on all 27 pages; PNG dimensions checked and image visually inspected |
| JSON-LD scanner warning | Live homepage warning not reproduced; add safe serialization and linked organization/software IDs | `lib/jsonLd.ts`, layout, `GeoPage.tsx`, `SeoLandingPage.tsx` | 94 JSON-LD blocks parse; 101 FAQ questions/answers match visible text; no invented reviews or ratings |
| Security headers | Centralized policy that retains Google Ads and static Next.js scripts | `next.config.ts` | Headers checked against local production HTTP responses |
| Weak stable-asset caching | One-hour freshness with revalidation for icons/video | `next.config.ts` | Header checks pass; hashed Next assets retain one-year immutable caching |
| AI context | Update concise file; add expanded file and informational ai.txt | `public/llms.txt`, `public/llms-full.txt`, `public/ai.txt` | Plain text, working URLs, current extension listing, domestic/price/Media Mail limitations |
| Tracking disclosure | Accurate policy, privacy cross-link, footer link, sitemap entry | cookie-policy page, privacy page, footer, sitemap | Routes resolve; disclosure reflects existing tag/no consent gate |
| Readability | Shorten selected homepage sentences; replace development-placeholder copy | `app/page.tsx` | Brand phrases retained; layout and CSS unchanged |
| Canonicals | Shared complete metadata; fix legal/support pages inheriting homepage canonical | all page metadata, `lib/metadata.ts` | All 27 canonical URLs checked; no accidental noindex |

## Validation results

- `npm run build`: passed (Next.js production compilation, lint/types, page generation).
- `npm run lint`: passed.
- `npm run verify:production`: passed. Starts a temporary local production server,
  verifies 27 pages, 94 JSON-LD blocks, 101 visible FAQs, 63 internal links/assets,
  social PNG, canonical metadata, sitemap, robots, AI text files, cache headers,
  security headers, and one unchanged Google tag loader/configuration.
- JSON-LD syntax/content checks are not a guarantee of Google rich-result eligibility.
- Local production browser check: homepage layout visually inspected; demo video
  reached readyState 4 without media errors; the gtag loader and Google Ads
  view-through script were present; no captured console errors/warnings or CSP
  violations. This does not establish production conversion attribution.

## Security policy and tracking

Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`,
`Cross-Origin-Opener-Policy: same-origin-allow-popups`, and an enforced CSP.

CSP restricts scripts to self and Google tag/Ads origins, disallows objects and
framing, restricts form actions/base URLs, and retains same-origin media/fonts.
Inline scripts/styles are allowed for the existing statically generated Next.js
hydration and gtag initialization. Production does not allow `unsafe-eval`.
HTTPS images/connections are intentionally allowed because Google Ads can use
country-specific measurement endpoints; this avoids breaking regional tracking.
This is a compatibility-focused policy, not a nonce-based strict CSP. Tightening
it requires captured production traffic and potentially dynamic rendering.
Ordinary Chrome Web Store navigation is not restricted.

CORP `same-site` was not added: public/social images are intended for external
consumers, and a blanket restriction can interfere with cross-origin embedding.
Vercel already supplied HSTS during the live audit; transport compression stays
with Next.js/Vercel.

The site has one Google Ads tag (`AW-18426517051`), loaded after interaction-ready
rendering with no site consent gate. No first-party website localStorage/cookie
implementation was found. The extension's Chrome storage is a separate scope.
The policy discloses potential Google cookies/identifiers and browser controls.
No consent banner was added; jurisdiction, ad-account settings, and any required
consent handling need the owner's policy/legal review, not an assumed scanner fix.

## Live cache/compression findings before changes

The scanner did not supply asset URLs. These are directly observed responses,
not an assertion that every scanner item was identified:

| Resource | Observed before | Decision |
| --- | --- | --- |
| `/icon48.png` (3,120 bytes) | `public, max-age=0, must-revalidate` | 1-hour cache |
| `/icon128.png` (13,421 bytes) | Same | 1-hour cache |
| `/videos/shipdime-demo.mp4` (32,475,804 bytes) | Same | 1-hour cache; playback unchanged |
| `/_next/image?url=%2Ficon48.png&w=96&q=75` (778 bytes in sampled response) | Revalidation | Existing Next Image optimization retained; source now has 1-hour freshness |
| Fingerprinted CSS and larger JS | `max-age=31536000,immutable`, Brotli | Already correct |
| `main-app-16427ca283eaaae6.js` (553 bytes), `app/layout-b0b7adc0eda34872.js` (335 bytes) | Immutable, no Content-Encoding | Tiny payloads; no custom compression layer |
| Homepage / llms.txt | Brotli on GET / text response | CDN compression already active |
| robots.txt (70 bytes) | No encoding | Too small to justify application compression |

No photographic/JPEG assets, CSS image backgrounds, or video posters were found.
The only existing raster images are the two small icons; the header already uses
Next Image. No existing images were converted, so conversion savings are **0
bytes**. No originals were deleted. The social image is generated from code.
The demo video is comparatively large, but re-encoding or changing autoplay was
not required for the image audit and could change visual/playback behavior.
There are no downloaded fonts or duplicate analytics loaders to remove.

## AI files

- https://www.shipdime.com/llms.txt — concise context, current listing, factual limitations.
- https://www.shipdime.com/llms-full.txt — expanded context, including 0.5 lb support and Book / Poly Mailer; no assertion of production Media Mail availability.
- https://www.shipdime.com/ai.txt — informational only; does not grant technical crawler permission or override robots.txt.

robots.txt remains unchanged and authoritative for crawler preferences.
The cookie policy is included in the sitemap. The fixed historical sitemap
`lastModified` date was removed rather than publishing false modification dates.

## Extension IDs

No old Web Store links remain in website source or generated website pages.
The old ID remains in `backend/src/createApp.ts:61` and its generated copy
`backend/dist/src/createApp.js:35`. Both are CORS allowlist entries and were left
unchanged. The current production origin should be assessed separately without
removing legacy/development origins; this website-only task does not alter CORS.

## After deployment

1. Recheck live response headers, caching, and all five crawler/context routes.
2. Refresh social previews in the sharing platforms' debuggers; cached previews
   may lag. Confirm the social image is publicly fetchable.
3. Use Google Tag Assistant to confirm Ads requests/conversions and watch for
   CSP violations, including regional Google destinations and popups. No paid
   transaction or manually dispatched conversion event was triggered for this audit.
4. Review consent obligations and Google Ads account settings with the owner;
   a disclosure page alone does not establish regulatory compliance.
5. Confirm production backend support for the current extension origin in a
   separate backend task. Website link correctness does not establish CORS support.

## Primary references

- Google tag CSP requirements: https://developers.google.com/tag-platform/security/guides/csp
- Google cookies/user identification: https://developers.google.com/tag-platform/security/concepts/cookies
- Next.js metadata images: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
- Next.js response headers/caching: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- llms.txt proposal (informational context, not crawler control): https://llmstxt.org/

## Files changed

- website/app/about/page.tsx
- website/app/cheap-shipping-labels/page.tsx
- website/app/cheapest-shipping-labels/page.tsx
- website/app/chrome-extension-shipping-labels/page.tsx
- website/app/compare/page.tsx
- website/app/compare/shipdime-vs-pirate-ship/page.tsx
- website/app/compare/shipdime-vs-shippo/page.tsx
- website/app/compare/shipdime-vs-shipstation/page.tsx
- website/app/compare/shipdime-vs-veeqo/page.tsx
- website/app/cookie-policy/page.tsx
- website/app/create-shipping-label-from-any-website/page.tsx
- website/app/create-shipping-label-from-customer-address/page.tsx
- website/app/create-shipping-label-from-website/page.tsx
- website/app/discount-shipping-labels/page.tsx
- website/app/how-to-create-your-own-shipping-label/page.tsx
- website/app/layout.tsx
- website/app/manual-shipping-label-vs-shipping-integration/page.tsx
- website/app/multi-channel-shipping-labels/page.tsx
- website/app/multi-channel-shipping/page.tsx
- website/app/opengraph-image.tsx
- website/app/page.tsx
- website/app/privacy/page.tsx
- website/app/shipping-label-chrome-extension/page.tsx
- website/app/shipping-label-without-integration/page.tsx
- website/app/shipping-label-without-marketplace-integration/page.tsx
- website/app/shipping-orders-from-multiple-marketplaces/page.tsx
- website/app/sitemap.ts
- website/app/stop-copy-pasting-shipping-addresses/page.tsx
- website/app/support/page.tsx
- website/app/terms/page.tsx
- website/components/Footer.tsx
- website/components/GeoPage.tsx
- website/components/SeoLandingPage.tsx
- website/lib/jsonLd.ts
- website/lib/metadata.ts
- website/next.config.ts
- website/package.json
- website/public/ai.txt
- website/public/llms-full.txt
- website/public/llms.txt
- website/scripts/verify-production.mjs
- website/SEO_AUDIT.md
