import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChromeCta } from './ChromeCta';

export interface GeoFaq {
  question: string;
  answer: string;
}

interface GeoPageProps {
  eyebrow: string;
  title: string;
  answer: string;
  path: string;
  faqs: GeoFaq[];
  children: ReactNode;
  parent?: { label: string; href: string };
}

const siteUrl = 'https://www.shipdime.com';

export function GeoPage({ eyebrow, title, answer, path, faqs, children, parent }: GeoPageProps) {
  const breadcrumbs = [
    { name: 'Home', item: `${siteUrl}/` },
    ...(parent ? [{ name: parent.label, item: `${siteUrl}${parent.href}` }] : []),
    { name: title, item: `${siteUrl}${path}` },
  ];
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section className="seo-hero">
        <div className="shell seo-hero-inner">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            {parent && <><span aria-hidden="true">/</span><Link href={parent.href}>{parent.label}</Link></>}
            <span aria-hidden="true">/</span><span aria-current="page">{title}</span>
          </nav>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="answer-first">{answer}</p>
          <div className="actions"><ChromeCta /><Link className="button secondary" href="/about">What is ShipDime?</Link></div>
        </div>
      </section>
      <article className="shell seo-article geo-article">{children}</article>
      <section className="section faq-section">
        <div className="shell">
          <div className="section-heading"><p className="eyebrow">Frequently asked questions</p><h2>Direct answers about this workflow</h2></div>
          <div className="faq-list">
            {faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
          </div>
        </div>
      </section>
      <section className="section final-cta">
        <div className="shell"><p className="eyebrow">Select. Right-click. Ship.</p><h2>Start from the address already on your screen.</h2><p>Review the recipient, package, service, and price before purchasing a label.</p><ChromeCta />
          <nav className="seo-links" aria-label="Related pages"><Link href="/">Home</Link><Link href="/about">About</Link><Link href="/compare">Compare</Link><Link href="/support">Support</Link></nav>
        </div>
      </section>
    </>
  );
}
