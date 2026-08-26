import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

const siteUrl = 'https://www.shipdime.com';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Veycell LLC',
  url: siteUrl,
  brand: {
    '@type': 'Brand',
    name: 'ShipDime',
    slogan: 'Select. Right-click. Ship.',
  },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ShipDime',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Chrome',
  url: siteUrl,
  description: 'ShipDime is a Chrome extension for U.S. online sellers that helps create shipping labels from recipient addresses selected directly on webpages.',
  publisher: {
    '@type': 'Organization',
    name: 'Veycell LLC',
    url: siteUrl,
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ShipDime — Select. Right-click. Ship.',
  description: 'Create shipping labels directly from addresses on the web with the ShipDime Chrome extension.',
  alternates: { canonical: '/' },
  icons: { icon: '/icon48.png', apple: '/icon128.png' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'ShipDime',
    title: 'ShipDime — Select. Right-click. Ship.',
    description: 'Create shipping labels directly from addresses on the web with the ShipDime Chrome extension.',
    images: [{ url: '/icon128.png', width: 128, height: 128, alt: 'ShipDime shipping package icon' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
