import type { Metadata } from 'next';
import { ComparisonPage } from '../../../components/ComparisonPage';
const title = 'ShipDime vs. ShipStation: Workflow Comparison';
const description = 'Compare ShipDime’s focused Chrome address-selection workflow with considerations for evaluating ShipStation’s current platform workflow.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/compare/shipdime-vs-shipstation' }, openGraph: { title, description, url: '/compare/shipdime-vs-shipstation', type: 'article' } };
const faqs = [
  { question: 'Is ShipDime a full warehouse or order-management platform?', answer: 'No such claim is made. ShipDime focuses on a user-directed Chrome address-to-label workflow.' },
  { question: 'Does this comparison list ShipStation features?', answer: 'No. ShipStation’s current automation, integrations, carriers, pricing, and operational features should be verified from official ShipStation documentation.' },
  { question: 'When might ShipDime’s workflow be relevant?', answer: 'It may be relevant when a U.S. seller wants to start from recipient address text already visible and selectable in Chrome without configuring a dedicated integration for that source.' },
  { question: 'Must ShipDime’s extracted address be reviewed?', answer: 'Yes. Recipient fields are editable, and sellers should verify all details before purchasing a label.' },
];
export default function Page() { return <ComparisonPage competitor="ShipStation" path="/compare/shipdime-vs-shipstation" title="ShipDime vs. ShipStation: how do the workflows differ?" description={description} answer="ShipDime is a focused Chrome workflow that starts with recipient address text explicitly selected by a U.S. seller. The seller reviews the extracted address, package, service, and price before purchase. ShipStation provides its own platform workflow; current automation, integrations, carriers, pricing, and operational features should be verified directly in ShipStation’s official documentation." perspective="ShipDime should be evaluated as a focused browser handoff, not assumed to provide the operational breadth of any platform category. Sellers considering ShipStation should verify its current capabilities directly and compare them with the narrower task they need to complete." faqs={faqs} />; }
