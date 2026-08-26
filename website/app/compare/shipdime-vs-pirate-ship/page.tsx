import type { Metadata } from 'next';
import { ComparisonPage } from '../../../components/ComparisonPage';
const title = 'ShipDime vs. Pirate Ship: Workflow Comparison';
const description = 'Compare ShipDime’s selectable-address Chrome workflow with considerations for evaluating Pirate Ship’s current shipping workflow.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/compare/shipdime-vs-pirate-ship' }, openGraph: { title, description, url: '/compare/shipdime-vs-pirate-ship', type: 'article' } };
const faqs = [
  { question: 'How does a ShipDime shipment begin?', answer: 'If the recipient address is selectable in Chrome, the seller highlights it, right-clicks ShipDime, and reviews the populated recipient fields before continuing.' },
  { question: 'Does this page claim Pirate Ship lacks an integration?', answer: 'No. It makes no claim about Pirate Ship’s current integrations, carriers, pricing, or limitations. Verify those facts in official Pirate Ship documentation.' },
  { question: 'Is ShipDime guaranteed to save money on every label?', answer: 'No. ShipDime currently advertises savings of up to 20% on eligible rates, and actual savings may vary.' },
  { question: 'Does ShipDime support international shipping?', answer: 'No. ShipDime is currently focused on U.S. domestic shipping.' },
];
export default function Page() { return <ComparisonPage competitor="Pirate Ship" path="/compare/shipdime-vs-pirate-ship" title="ShipDime vs. Pirate Ship: how do the workflows differ?" description={description} answer="ShipDime begins when a U.S. seller selects recipient address text directly in Chrome, reviews the populated fields, adds package information, and reviews pricing before purchase. Pirate Ship provides its own shipping workflow. This comparison focuses on ShipDime’s verified browser-selection approach and leaves Pirate Ship’s current pricing, carriers, integrations, and features to its official documentation." perspective="The useful comparison is the handoff into shipping. ShipDime is designed for sellers who want to begin from address text already visible in Chrome. Any Pirate Ship capability important to the decision should be checked against its current official materials." faqs={faqs} />; }
