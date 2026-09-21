import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { pageMetadata, SITE_URL } from '../lib/metadata';
import { serializeJsonLd } from '../lib/jsonLd';
import { CHROME_STORE_URL } from '../lib/chromeStore';

const siteUrl = SITE_URL;

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteUrl}/#organization`,
  name: 'Veycell LLC',
  url: siteUrl,
  logo: `${siteUrl}/icon128.png`,
  brand: {
    '@type': 'Brand',
    name: 'ShipDime',
    slogan: 'Select. Right-click. Ship.',
  },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${siteUrl}/#software`,
  name: 'ShipDime',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Chrome',
  softwareRequirements: 'Google Chrome browser',
  installUrl: CHROME_STORE_URL,
  url: siteUrl,
  description: 'ShipDime is a Chrome extension for U.S. online sellers that helps create shipping labels from recipient addresses selected directly on webpages.',
  publisher: {
    '@id': `${siteUrl}/#organization`,
  },
};

export const metadata: Metadata = {
  ...pageMetadata({ title: 'ShipDime — Select. Right-click. Ship.', description: 'Create U.S. shipping labels directly from addresses on the web with the ShipDime Chrome extension.', path: '/' }),
  metadataBase: new URL(siteUrl),
  icons: { icon: '/icon48.png', apple: '/icon128.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18426517051"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18426517051');`}
        </Script>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareSchema) }} />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
