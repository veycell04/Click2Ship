import { pageMetadata } from '../../lib/metadata';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'How to Create Your Own Shipping Label | ShipDime';
const description = 'Learn the information and steps needed to create your own U.S. shipping label, including how ShipDime reduces repetitive address entry in Chrome.';
export const metadata = pageMetadata({ title: title, description: description, path: '/how-to-create-your-own-shipping-label', type: 'article' });

export default function Page() {
  return <SellerQuestionPage eyebrow="Shipping label basics" title="How do I create my own shipping label?" answer="To create your own shipping label, gather the sender and recipient addresses, measure the packed shipment, choose a shipping service, review the price, purchase the label, and print it. ShipDime simplifies recipient entry by letting U.S. sellers select address text in Chrome, right-click, and review editable fields before purchase." path="/how-to-create-your-own-shipping-label"
    faqs={[
      { question: 'What information do I need to create a shipping label?', answer: 'You generally need sender and recipient details, package weight and dimensions, and a shipping service. Apartment or unit information should be included when applicable.' },
      { question: 'Can I create a label without a marketplace order import?', answer: 'Yes. A label can be prepared from accurate address and package information. ShipDime can begin from selectable recipient address text without a dedicated sales-channel integration.' },
      { question: 'Can I change the address after ShipDime reads it?', answer: 'Yes. Recipient fields remain editable and should be reviewed before purchase.' },
      { question: 'Can ShipDime create an international label?', answer: 'No. ShipDime currently supports U.S. domestic shipping only.' },
    ]}
    sections={[
      { heading: 'The general shipping-label process', paragraphs: ['A shipping label connects an accurately described package with a sender, recipient, and selected shipping service. Before buying one, confirm both addresses, pack the item, weigh and measure the package, and choose a service that is available for the shipment.', 'The price can depend on package weight, dimensions, origin, destination, and service. Review the final shipment details and displayed amount before purchase, then download and print the resulting label.'] },
      { heading: 'How ShipDime reduces address entry', paragraphs: ['When a recipient address is available as selectable text on a supported webpage, highlight it and open ShipDime from Chrome’s right-click menu. ShipDime places recognizable recipient information into editable fields so the seller does not need to transfer every line separately.', 'This selection workflow does not require a dedicated integration with that sales channel. It also does not guarantee support for every webpage: restricted pages and nonselectable interfaces may prevent capture.'] },
      { heading: 'Choose and review the shipment', paragraphs: ['Enter the packed weight and dimensions, choose an available service, and review the quote. ShipDime currently supports U.S. domestic shipments with available USPS Ground Advantage and USPS Priority Mail label types.', 'ShipDime may offer up to 20% savings on eligible rates, but savings are not guaranteed and can vary by shipment. The amount displayed before purchase is the amount to evaluate.'] },
    ]}
    steps={['Gather accurate sender and recipient information.', 'Pack the item, then weigh and measure the package.', 'Select the recipient address in Chrome and open ShipDime, or enter the information manually when needed.', 'Review every recipient field and correct incomplete details.', 'Choose an available service, review the price, purchase the label, and print it.']}
    whenShipDimeMakesSense={['You are preparing an individual U.S. domestic shipment.', 'The recipient address is already visible as selectable browser text.', 'The order source is not connected to your preferred shipping workflow.', 'You want to reduce repetitive copying while retaining final address review.']}
    relatedLinks={[
      { href: '/create-shipping-label-from-customer-address', label: 'Create from a customer address', description: 'See the recipient and package information needed for a label.' },
      { href: '/chrome-extension-shipping-labels', label: 'Chrome extension workflow', description: 'Understand how address selection starts a ShipDime shipment.' },
      { href: '/compare', label: 'Compare workflows', description: 'Compare ShipDime’s workflow model with shipping platforms.' },
      { href: '/cheap-shipping-labels', label: 'Review shipping-label pricing', description: 'Learn what affects prices and how eligible ShipDime savings work.' },
    ]} />;
}
