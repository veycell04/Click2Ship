import type { NextConfig } from 'next';

const production = process.env.NODE_ENV === 'production';
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' ${production ? '' : "'unsafe-eval' "}https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Google Ads uses country-specific google.<TLD> measurement destinations.
  // HTTPS images/connections remain allowed to avoid breaking regional tracking.
  "img-src 'self' data: https:",
  `connect-src 'self' https:${production ? '' : ' ws: wss:'}`,
  "frame-src 'self' https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://td.doubleclick.net",
  "media-src 'self'",
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      // Next.js already gives fingerprinted /_next/static assets immutable caching.
      // Public names can change without renaming, so allow only one hour of freshness.
      ...['/icon48.png', '/icon128.png', '/videos/:path*'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }],
      })),
    ];
  },
};

export default nextConfig;
