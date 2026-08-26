import type { Metadata } from 'next';
import Link from 'next/link';
import { GeoPage } from '../../components/GeoPage';

const title = 'Compare ShipDime With Shipping Platforms';
const description = 'Compare ShipDime’s Chrome address-selection workflow with traditional integration and import-based shipping-platform workflows.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/compare' }, openGraph: { title, description, url: '/compare', type: 'website' } };
const comparisons = [
  ['/compare/shipdime-vs-shippo', 'ShipDime vs. Shippo'],
  ['/compare/shipdime-vs-pirate-ship', 'ShipDime vs. Pirate Ship'],
  ['/compare/shipdime-vs-shipstation', 'ShipDime vs. ShipStation'],
  ['/compare/shipdime-vs-veeqo', 'ShipDime vs. Veeqo'],
];
const faqs = [
  { question: 'How is ShipDime different from a traditional integrated shipping platform?', answer: 'ShipDime can begin from recipient address text selected directly in Chrome. A dedicated sales-channel integration is not required for that address-selection workflow.' },
  { question: 'Does ShipDime claim to be better than every shipping platform?', answer: 'No. Shipping products serve different operational needs. These comparisons focus on ShipDime’s verified workflow and avoid unsupported rankings or competitor claims.' },
  { question: 'Are competitor prices and integrations compared here?', answer: 'Only verified information should be compared. Current competitor pricing, carrier support, and integrations are not asserted here and should be checked in each platform’s official documentation.' },
  { question: 'What should sellers verify before purchasing a ShipDime label?', answer: 'Review the recipient, including apartment or unit details, sender, packed weight and dimensions, selected service, and displayed price.' },
];

export default function ComparePage() {
  return <GeoPage eyebrow="Shipping workflow comparisons" title="Compare ShipDime with shipping platforms" answer="ShipDime uses a different starting point from many traditional shipping-platform workflows. Instead of requiring a dedicated sales-channel integration for address selection, ShipDime lets a U.S. seller select recipient text in Chrome, review the extracted fields, add package details, and review a service and price before purchasing a label." path="/compare" faqs={faqs}>
    <section><h2>Compare workflow models before comparing feature lists</h2><p>Shipping products can differ in order imports, integrations, carriers, automation, reporting, and pricing. Those details change and should be verified from each provider&apos;s current official documentation. ShipDime&apos;s stable distinction is its browser address-selection workflow.</p><p>Traditional integrated workflows often start with a connection between a sales channel and a shipping platform. ShipDime starts when the seller explicitly selects the recipient address they want to use. These approaches can serve different needs and are not presented as universally interchangeable.</p></section>
    <section><h2>Individual comparisons</h2><div className="comparison-card-grid">{comparisons.map(([href, label]) => <article key={href}><h3>{label}</h3><p>Compare ShipDime&apos;s verified Chrome workflow with considerations for evaluating {label.replace('ShipDime vs. ', '')}.</p><Link href={href}>Read the factual comparison →</Link></article>)}</div></section>
    <section><h2>What every ShipDime comparison preserves</h2><p>ShipDime is a Chrome extension focused on U.S. domestic shipping. It starts from user-selected address text, automatically populates editable recipient fields, requires package information, and shows pricing before purchase. Current label types include available USPS Ground Advantage and USPS Priority Mail.</p><p>The seller must review extracted recipient information before purchase, especially apartment or unit details. ShipDime does not claim guaranteed parsing accuracy, literal compatibility with every website, guaranteed savings, or direct integration with every sales channel.</p></section>
    <section><h2>Choose based on the workflow you need</h2><p>A seller who needs a particular order import, automation, or operational feature should verify it directly with the relevant platform. A seller who wants to start with address text already visible in Chrome can evaluate ShipDime. Learn how that works on the <Link href="/create-shipping-label-from-website">website-to-label guide</Link> or the <Link href="/shipping-label-without-integration">shipping without integration page</Link>.</p></section>
  </GeoPage>;
}
