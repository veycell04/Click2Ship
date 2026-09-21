import type { Metadata } from 'next';

export const SITE_URL = 'https://www.shipdime.com';
export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: 'ShipDime — Select. Right-click. Ship.',
};

// Next.js replaces nested metadata objects rather than deeply merging them.
// Each page includes the complete social metadata to preserve its image.
export function pageMetadata({ title, description, path, type = 'website' }: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'ShipDime', type, images: [SOCIAL_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [SOCIAL_IMAGE.url] },
  };
}
