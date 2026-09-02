import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/about',
    '/create-shipping-label-from-website',
    '/shipping-label-without-integration',
    '/multi-channel-shipping',
    '/chrome-extension-shipping-labels',
    '/compare',
    '/compare/shipdime-vs-shippo',
    '/compare/shipdime-vs-pirate-ship',
    '/compare/shipdime-vs-shipstation',
    '/compare/shipdime-vs-veeqo',
    '/how-to-create-your-own-shipping-label',
    '/shipping-label-without-marketplace-integration',
    '/stop-copy-pasting-shipping-addresses',
    '/shipping-orders-from-multiple-marketplaces',
    '/create-shipping-label-from-customer-address',
    '/manual-shipping-label-vs-shipping-integration',
    '/cheap-shipping-labels',
    '/cheapest-shipping-labels',
    '/discount-shipping-labels',
    '/shipping-label-chrome-extension',
    '/create-shipping-label-from-any-website',
    '/multi-channel-shipping-labels',
    '/privacy',
    '/terms',
    '/support',
  ].map((path) => ({
    url: `https://www.shipdime.com${path}`,
    lastModified: new Date('2026-09-02'),
    changeFrequency: path ? 'monthly' : 'weekly',
    priority: path.startsWith('/privacy') || path.startsWith('/terms') || path.startsWith('/support') ? 0.7 : path ? 0.9 : 1,
  }));
}
