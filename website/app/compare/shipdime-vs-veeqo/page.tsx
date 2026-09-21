import { pageMetadata } from '../../../lib/metadata';
import { ComparisonPage } from '../../../components/ComparisonPage';
const title = 'ShipDime vs. Veeqo: Workflow Comparison';
const description = 'Compare ShipDime’s selectable-address Chrome workflow with considerations for evaluating Veeqo’s current shipping workflow and integrations.';
export const metadata = pageMetadata({ title: title, description: description, path: '/compare/shipdime-vs-veeqo', type: 'article' });
const faqs = [
  { question: 'What does ShipDime require from the order source?', answer: 'For automatic selection capture, the recipient address must be available as selectable text on a page where Chrome permits extension access.' },
  { question: 'Does this page claim Veeqo does not support a marketplace?', answer: 'No. It does not assert current Veeqo integrations, limitations, carriers, or pricing. Verify those details through official Veeqo documentation.' },
  { question: 'Does ShipDime require a Veeqo connection?', answer: 'No dedicated Veeqo or other sales-channel integration is required for ShipDime’s address-selection workflow.' },
  { question: 'What shipping scope does ShipDime have?', answer: 'ShipDime currently supports U.S. domestic shipping with available USPS Ground Advantage and USPS Priority Mail label types.' },
];
export default function Page() { return <ComparisonPage competitor="Veeqo" path="/compare/shipdime-vs-veeqo" title="ShipDime vs. Veeqo: how do the workflows differ?" description={description} answer="ShipDime lets a U.S. seller begin a label workflow from recipient address text selected directly in Chrome, without requiring a dedicated sales-channel integration for that selection. Veeqo provides its own shipping workflow and integrations. This page documents ShipDime’s verified behavior while directing readers to official Veeqo documentation for current features, pricing, carriers, and integrations." perspective="ShipDime’s known distinction is that the seller explicitly selects the recipient address to begin. Sellers evaluating Veeqo should confirm its current workflow and integrations from Veeqo itself rather than relying on unsupported assumptions in a comparison page." faqs={faqs} />; }
