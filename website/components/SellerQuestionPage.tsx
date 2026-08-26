import type { ReactNode } from 'react';
import Link from 'next/link';
import { GeoPage, type GeoFaq } from './GeoPage';

interface ContentSection {
  heading: string;
  paragraphs: string[];
}

interface RelatedLink {
  href: string;
  label: string;
  description: string;
}

interface SellerQuestionPageProps {
  eyebrow: string;
  title: string;
  answer: string;
  path: string;
  faqs: GeoFaq[];
  sections: ContentSection[];
  steps: string[];
  whenShipDimeMakesSense: string[];
  relatedLinks: RelatedLink[];
  children?: ReactNode;
}

export function SellerQuestionPage({ eyebrow, title, answer, path, faqs, sections, steps, whenShipDimeMakesSense, relatedLinks, children }: SellerQuestionPageProps) {
  return (
    <GeoPage eyebrow={eyebrow} title={title} answer={answer} path={path} faqs={faqs}>
      {sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}

      <section>
        <h2>Step by step</h2>
        <ol className="question-steps">{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
      </section>

      <section className="trust-callout">
        <p className="eyebrow">Address review</p>
        <h2>Review automatically populated fields before purchase</h2>
        <p>ShipDime automatically populates recipient fields from the selected text. Sellers can review and edit the information before purchasing a label.</p>
        <p>Automatic extraction is not guaranteed to be perfect. Confirm the recipient name, street, apartment or unit, city, state, and ZIP code before continuing.</p>
      </section>

      {children}

      <section>
        <h2>When ShipDime makes sense</h2>
        <ul className="check-list">{whenShipDimeMakesSense.map((item) => <li key={item}>{item}</li>)}</ul>
        <p>ShipDime currently supports U.S. domestic shipping only. It does not claim compatibility with every website, marketplace, or browser page.</p>
      </section>

      <section>
        <h2>Continue exploring ShipDime</h2>
        <div className="comparison-card-grid">{relatedLinks.map((link) => <article key={link.href}><h3>{link.label}</h3><p>{link.description}</p><Link href={link.href}>Learn more →</Link></article>)}</div>
      </section>
    </GeoPage>
  );
}
