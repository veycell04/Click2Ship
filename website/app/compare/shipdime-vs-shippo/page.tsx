import { pageMetadata } from '../../../lib/metadata';
import { ComparisonPage } from '../../../components/ComparisonPage';
const title = 'ShipDime vs. Shippo: Workflow Comparison';
const description = 'Compare ShipDime’s selectable-address Chrome workflow with considerations for evaluating Shippo’s current shipping workflow and integrations.';
export const metadata = pageMetadata({ title: title, description: description, path: '/compare/shipdime-vs-shippo', type: 'article' });
const faqs = [
  { question: 'What is the verified ShipDime workflow difference?', answer: 'ShipDime begins with recipient address text selected directly in Chrome and does not require a dedicated sales-channel integration for that address-selection workflow.' },
  { question: 'Does this page compare Shippo pricing or carrier support?', answer: 'No. Current Shippo pricing, carriers, integrations, and product features should be verified through Shippo’s official documentation.' },
  { question: 'Can ShipDime import every Shippo-connected order?', answer: 'No such claim is made. ShipDime uses an explicit address-selection workflow rather than claiming automatic import from every source.' },
  { question: 'Can the selected address be corrected?', answer: 'Yes. ShipDime recipient fields remain editable, and sellers should verify apartment or unit details before purchase.' },
];
export default function Page() { return <ComparisonPage competitor="Shippo" path="/compare/shipdime-vs-shippo" title="ShipDime vs. Shippo: how do the workflows differ?" description={description} answer="ShipDime and Shippo should be evaluated as different workflow choices. ShipDime lets a U.S. seller begin with recipient address text selected directly in Chrome, then review the extracted fields and shipment before purchase. Shippo provides its own shipping workflow and integrations; its current features, carrier support, and pricing should be verified through official Shippo documentation." perspective="A seller comparing ShipDime and Shippo should first decide whether the task begins with a selected address in Chrome or with a configured platform workflow. This page does not infer Shippo’s current integrations from its brand or past product behavior." faqs={faqs} />; }
