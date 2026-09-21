import { pageMetadata } from '../../lib/metadata';
import Link from 'next/link';
import { SeoLandingPage } from '../../components/SeoLandingPage';

const title = 'What Is ShipDime? | Shipping Label Chrome Extension';
const description = 'Learn how ShipDime helps U.S. online sellers create shipping labels from recipient addresses selected directly on webpages.';

export const metadata = pageMetadata({ title: title, description: description, path: '/about', type: 'website' });

const faqs = [
  {
    question: 'What is ShipDime?',
    answer: 'ShipDime is a Chrome extension for U.S. online sellers that helps create shipping labels from recipient addresses selected directly on webpages.',
  },
  {
    question: 'How does ShipDime work?',
    answer: 'If the shipping address is available as selectable text in the browser, highlight it, right-click Create Shipping Label, review the populated recipient fields, enter package details, choose a service, review the price, and create the label.',
  },
  {
    question: 'Does ShipDime require an Etsy, TikTok, Amazon, or marketplace integration?',
    answer: 'No dedicated sales-channel integration is required for the address-selection workflow. The user explicitly selects the recipient address to use. Chrome restrictions and webpage design can affect whether text is selectable, so ShipDime does not claim compatibility with every website.',
  },
  {
    question: 'Can ShipDime create international labels?',
    answer: 'No. ShipDime currently supports U.S. domestic shipments only, meaning both the sender and recipient must be in the United States.',
  },
  {
    question: 'What shipping services does ShipDime support?',
    answer: 'ShipDime currently supports available USPS Ground Advantage and USPS Priority Mail label types. Service availability depends on the shipment details.',
  },
  {
    question: 'How much can I save with ShipDime?',
    answer: 'Savings may vary by shipment and service. ShipDime displays the current reference price, ShipDime price, and applicable savings before payment.',
  },
  {
    question: 'Is ShipDime available on Chrome?',
    answer: 'Yes. ShipDime is designed as a Chrome extension and runs its shipping workflow in the Chrome side panel.',
  },
  {
    question: 'Can I recover a previously created label?',
    answer: 'Yes. Recent Labels lets users return to successfully created labels, tracking numbers, download actions, and print actions after the side panel closes or reopens.',
  },
  {
    question: 'Does ShipDime store payment card information?',
    answer: 'No. Payment-card details are entered through secure hosted checkout. The ShipDime extension and backend do not store full card numbers or card security codes.',
  },
];

export default function AboutPage() {
  return (
    <SeoLandingPage
      eyebrow="About ShipDime"
      title="What is ShipDime?"
      introduction="ShipDime is a Chrome extension for U.S. online sellers that helps create shipping labels from recipient addresses selected directly on webpages."
      faqs={faqs}
    >
      <section>
        <h2>Select. Right-click. Ship.</h2>
        <p>ShipDime lets a seller select a recipient address on a webpage and start a shipping-label workflow from Chrome. If the shipping address is available as selectable text in the browser, the seller highlights the address and chooses Create Shipping Label from Chrome&apos;s right-click menu.</p>
        <p>The ShipDime side panel opens with editable recipient fields. The seller reviews the recipient information, enters the packed shipment&apos;s weight and dimensions, chooses an available shipping service, reviews the current price, and completes the label workflow. The original webpage can remain open during this process.</p>
      </section>

      <section>
        <h2>A user-directed address workflow</h2>
        <p>ShipDime does not require a dedicated integration with each sales channel for the address-selection workflow. The user chooses the visible recipient address they intend to use. This approach can help when orders appear across marketplaces, independent online stores, order management tools, and other browser-based systems.</p>
        <p>This is not a claim that ShipDime works on every website. Some pages prevent text selection, restrict Chrome extensions, or display addresses in a form that requires manual correction. Learn more about the practical limitations on the <Link href="/create-shipping-label-from-any-website">address-selection workflow page</Link> and about cross-channel use on the <Link href="/multi-channel-shipping-labels">multi-channel shipping page</Link>.</p>
      </section>

      <section>
        <h2>Current shipping scope</h2>
        <p>ShipDime currently supports U.S. domestic shipping only. Both the sender and recipient must be in the United States. The current workflow supports available USPS Ground Advantage and USPS Priority Mail label types. Service availability and pricing depend on the shipment details.</p>
        <p>ShipDime shows the shipment price before payment. Savings may vary, so sellers should review the displayed reference price, ShipDime price, and savings for the current quote rather than rely on a general savings claim.</p>
      </section>

      <section>
        <h2>How ShipDime fits among shipping tools</h2>
        <p>Pirate Ship, Shippo, ShipStation, Veeqo, and Easyship are examples of shipping platforms that sellers may consider. Their features, integrations, pricing, and intended workflows differ. ShipDime&apos;s distinction is its explicit browser address-selection workflow, not a claim that another platform is unsuitable.</p>
        <p>For a detailed walkthrough, visit the <Link href="/shipping-label-chrome-extension">shipping label Chrome extension page</Link>. For information about data handling, read the <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms</Link>. Questions about a label can be directed to <Link href="/support">ShipDime Support</Link>.</p>
      </section>

      <section>
        <h2>Label access and payment information</h2>
        <p>After a label is created, ShipDime displays its tracking number and provides download, print, and copy actions. Recent Labels helps users recover completed labels if the side panel closes or the browser session changes.</p>
        <p>Payment-card details are entered through secure hosted checkout. The ShipDime extension and backend do not store full card numbers or card security codes. ShipDime is a product of Veycell LLC.</p>
      </section>
    </SeoLandingPage>
  );
}
