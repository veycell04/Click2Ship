import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/shipping-label-chrome-extension',
    '/create-shipping-label-from-any-website',
    '/multi-channel-shipping-labels',
    '/privacy',
    '/terms',
    '/support',
  ].map((path) => ({
    url: `https://shipdime.com${path}`,
    lastModified: new Date('2026-08-17'),
    changeFrequency: path ? 'monthly' : 'weekly',
    priority: path.startsWith('/privacy') || path.startsWith('/terms') || path.startsWith('/support') ? 0.7 : path ? 0.9 : 1,
  }));
}
