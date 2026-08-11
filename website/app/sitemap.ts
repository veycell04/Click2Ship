import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/privacy', '/terms', '/support'].map((path) => ({
    url: `https://shipdime.com${path}`,
    lastModified: new Date('2026-08-11'),
    changeFrequency: path ? 'monthly' : 'weekly',
    priority: path ? 0.7 : 1,
  }));
}
