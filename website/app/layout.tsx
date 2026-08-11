import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

const siteUrl = 'https://shipdime.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ShipDime — Shipping Made Simple',
  description: 'Create shipping labels directly from addresses on the web with the ShipDime Chrome extension.',
  alternates: { canonical: '/' },
  icons: { icon: '/icon48.png', apple: '/icon128.png' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'ShipDime',
    title: 'ShipDime — Shipping Made Simple',
    description: 'Create shipping labels directly from addresses on the web with the ShipDime Chrome extension.',
    images: [{ url: '/icon128.png', width: 128, height: 128, alt: 'ShipDime shipping package icon' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
