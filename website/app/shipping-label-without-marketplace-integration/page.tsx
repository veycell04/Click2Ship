import { pageMetadata } from '../../lib/metadata';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Shipping Label Without a Marketplace Integration | ShipDime';
const description = 'Learn how a U.S. seller can create a shipping label without connecting a marketplace when recipient address text is selectable in Chrome.';
export const metadata = pageMetadata({ title: title, description: description, path: '/shipping-label-without-marketplace-integration', type: 'article' });

export default function Page() {
  return <SellerQuestionPage eyebrow="Shipping without marketplace setup" title="Can I create a shipping label without connecting my marketplace?" answer="Yes. A shipping label does not inherently require a marketplace integration. If the recipient address is available as selectable text in Chrome, ShipDime lets a U.S. seller select it, start a shipment from the right-click menu, review the populated fields, add package information, and review the service and price before purchase." path="/shipping-label-without-marketplace-integration"
    faqs={[
      { question: 'Does ShipDime connect directly to my marketplace?', answer: 'ShipDime does not require a dedicated marketplace integration for its address-selection workflow. It does not claim direct integration with every marketplace.' },
      { question: 'Will this work on every marketplace page?', answer: 'No. The address must be selectable on a page where Chrome permits extension access. Page design and browser restrictions can affect capture.' },
      { question: 'Who verifies the shipping address?', answer: 'The seller does. ShipDime populates editable fields, but the recipient information must be reviewed before purchasing a label.' },
      { question: 'Which destinations can ShipDime serve?', answer: 'ShipDime currently supports shipments where both sender and recipient are in the United States.' },
    ]}
    sections={[
      { heading: 'Marketplace connection and label creation are separate concepts', paragraphs: ['A marketplace integration can automate order imports and other tasks, but the underlying label still depends on accurate sender, recipient, package, and service information. A seller can prepare that information without connecting the marketplace when the shipping workflow accepts direct entry.', 'ShipDime provides a browser-based handoff. The seller explicitly chooses recipient address text and starts the shipment, rather than granting ShipDime automatic access to every order in the sales channel.'] },
      { heading: 'The address must be selectable', paragraphs: ['If the recipient address is available as selectable text in the browser, it can be highlighted and passed into ShipDime. This wording matters because extensions cannot read every page. Protected locations, image-based addresses, or interfaces that prevent selection may require another method.', 'ShipDime does not claim compatibility with every marketplace. It also does not create marketplace-specific pages or imply official marketplace relationships.'] },
      { heading: 'Review before payment', paragraphs: ['After address capture, enter accurate package weight and dimensions and choose an available U.S. domestic service. Review the displayed price and shipment details before checkout.', 'ShipDime currently supports available USPS Ground Advantage and USPS Priority Mail label types. Service eligibility and savings can vary by shipment.'] },
    ]}
    steps={['Open the order page and locate the complete recipient shipping address.', 'Select the address text and right-click ShipDime.', 'Review and correct the populated recipient fields.', 'Enter the packed shipment’s weight and dimensions.', 'Choose an available service, review the price, and purchase the label.']}
    whenShipDimeMakesSense={['An occasional marketplace is not connected to your shipping platform.', 'You need to prepare one shipment without setting up an order import.', 'The complete recipient address is selectable in Chrome.', 'You prefer explicit address selection and review over automatic order access.']}
    relatedLinks={[
      { href: '/shipping-label-without-integration', label: 'Shipping without integration', description: 'Compare integration-first and browser-selection approaches.' },
      { href: '/create-shipping-label-from-website', label: 'Website-to-label guide', description: 'Follow the complete address selection workflow.' },
      { href: '/compare', label: 'Comparison hub', description: 'Evaluate ShipDime’s workflow alongside other platform models.' },
      { href: '/cheap-shipping-labels', label: 'Shipping-label pricing', description: 'Review rates and eligible savings before purchase.' },
    ]} />;
}
