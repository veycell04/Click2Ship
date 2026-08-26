import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChromeCta } from './ChromeCta';

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoLandingPageProps {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
  faqs: FaqItem[];
}

export function SeoLandingPage({ eyebrow, title, introduction, children, faqs }: SeoLandingPageProps) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="seo-hero">
        <div className="shell seo-hero-inner">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-copy">{introduction}</p>
          <div className="actions">
            <ChromeCta />
            <Link className="button secondary" href="/">
              Explore ShipDime
            </Link>
          </div>
        </div>
      </section>

      <article className="shell seo-article">{children}</article>

      <section className="section faq-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Frequently asked questions</p>
            <h2>Questions about shipping with ShipDime</h2>
          </div>
          <div className="faq-list">
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section final-cta">
        <div className="shell">
          <p className="eyebrow">ShipDime for Chrome</p>
          <h2>Turn the next selected address into a shipping label.</h2>
          <p>Review the shipment and price before you create your label.</p>
          <ChromeCta />
          <nav className="seo-links" aria-label="Related ShipDime pages">
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            <Link href="/shipping-label-chrome-extension">Chrome extension</Link>
            <Link href="/create-shipping-label-from-any-website">Address selection workflow</Link>
            <Link href="/multi-channel-shipping-labels">Multi-channel shipping</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/support">Support</Link>
          </nav>
        </div>
      </section>
    </>
  );
}
