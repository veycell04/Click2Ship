import type { Metadata } from 'next';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Create a Shipping Label From a Customer Address | ShipDime';
const description = 'Learn what recipient and package information is needed to create a U.S. shipping label from a customer address with ShipDime.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/create-shipping-label-from-customer-address' }, openGraph: { title, description, url: '/create-shipping-label-from-customer-address', type: 'article' } };

export default function Page() {
  return <SellerQuestionPage eyebrow="Customer address to label" title="Can I create a shipping label from a customer's address?" answer="Yes. To create a label from a customer address, you need the recipient name, street, apartment or unit when applicable, city, state, and ZIP code, plus accurate package weight and dimensions. ShipDime can populate editable recipient fields from address text selected in Chrome before the seller chooses a service and reviews the price." path="/create-shipping-label-from-customer-address"
    faqs={[
      { question: 'Which customer address fields are required?', answer: 'A usable U.S. recipient normally needs a name, street address, city, state, and ZIP code. Include apartment or unit information when applicable.' },
      { question: 'Why are package measurements needed?', answer: 'Weight and dimensions help determine service availability and shipping price. Measure the packed shipment rather than the unpacked item.' },
      { question: 'Can I correct the customer address in ShipDime?', answer: 'Yes. Every automatically populated recipient field is editable before purchase.' },
      { question: 'Does ShipDime validate international customer addresses?', answer: 'ShipDime currently supports U.S. domestic shipping only, so both sender and recipient must be in the United States.' },
    ]}
    sections={[
      { heading: 'Information needed for the recipient', paragraphs: ['Begin with the customer’s full name and complete delivery address. The street line should include the house number and street name. Add an apartment, suite, or unit when applicable, then confirm the city, two-letter state, and five-digit ZIP or ZIP+4.', 'A missing unit or incorrect ZIP code can affect delivery. The source address should be treated as information to verify, not automatically assumed to be ready for purchase.'] },
      { heading: 'Information needed for the package', paragraphs: ['Pack the item before measuring it. Record the actual weight and the exterior length, width, and height. Shipping eligibility and price can depend on these values as well as the origin, destination, and selected service.', 'ShipDime requires a minimum billable package weight of two pounds and currently focuses on U.S. domestic shipments. Enter truthful package information rather than estimating downward.'] },
      { heading: 'How ShipDime uses selected address text', paragraphs: ['If the customer address is available as selectable text on a supported webpage, highlight the complete block and right-click ShipDime. Recognizable fields are populated in the side panel, where they remain editable.', 'No dedicated sales-channel integration is required for this address-selection workflow. The page must still allow text selection and Chrome extension access, so compatibility cannot be guaranteed everywhere.'] },
    ]}
    steps={['Collect the customer’s complete U.S. delivery address.', 'Select the address in Chrome and open ShipDime.', 'Review the name, street, apartment or unit, city, state, and ZIP code.', 'Pack, weigh, and measure the shipment.', 'Choose a service, review the price, and purchase the label.']}
    whenShipDimeMakesSense={['A customer address is already displayed as selectable browser text.', 'You are creating an individual U.S. domestic label.', 'The order source is not directly connected to your shipping workflow.', 'You want editable address fields without copying each line separately.']}
    relatedLinks={[
      { href: '/how-to-create-your-own-shipping-label', label: 'Create your own label', description: 'Review the complete general process from address to print.' },
      { href: '/stop-copy-pasting-shipping-addresses', label: 'Reduce copy and paste', description: 'See how one complete selection replaces repeated transfers.' },
      { href: '/shipping-label-chrome-extension', label: 'ShipDime for Chrome', description: 'Explore the current extension workflow and label recovery.' },
      { href: '/cheap-shipping-labels', label: 'See shipping-label pricing', description: 'Understand the inputs that affect the price shown before purchase.' },
    ]} />;
}
