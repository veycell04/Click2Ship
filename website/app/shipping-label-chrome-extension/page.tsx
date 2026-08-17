import type { Metadata } from 'next';
import Link from 'next/link';
import { SeoLandingPage } from '../../components/SeoLandingPage';

const title = 'Shipping Label Chrome Extension | ShipDime';
const description =
  'Use the ShipDime shipping label Chrome extension to turn selected recipient addresses into ready-to-review shipments from your browser.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/shipping-label-chrome-extension' },
  openGraph: {
    title,
    description,
    url: '/shipping-label-chrome-extension',
    type: 'website',
  },
};

const faqs = [
  {
    question: 'How does the ShipDime Chrome extension start a shipment?',
    answer:
      'Select a recipient shipping address on a webpage, right-click the selection, and choose Create Shipping Label. ShipDime opens in the Chrome side panel with the selected address ready for review.',
  },
  {
    question: 'Can I edit an address after ShipDime reads it?',
    answer:
      'Yes. Recipient fields remain editable, and ShipDime keeps the original selected text visible so you can compare it with the extracted address before purchasing a label.',
  },
  {
    question: 'Which USPS label types can I choose?',
    answer:
      'The current workflow supports available USPS Ground Advantage and USPS Priority Mail label types. Availability and pricing can depend on the shipment details.',
  },
  {
    question: 'Can I retrieve a label after closing the side panel?',
    answer:
      'Yes. Recent Labels provides access to completed labels and tracking information so closing the side panel does not remove access to a successfully created label.',
  },
];

export default function ShippingLabelChromeExtensionPage() {
  return (
    <SeoLandingPage
      eyebrow="Shipping label Chrome extension"
      title="Create shipping labels directly from your browser"
      introduction="ShipDime brings address review, package details, pricing, checkout, and label access into a focused Chrome side panel. Start with the recipient address already visible in your browser instead of rebuilding the shipment one field at a time."
      faqs={faqs}
    >
      <section>
        <h2>A shorter path from address to label</h2>
        <p>
          Shipping work often begins on a webpage: an order screen, a customer record, an order management tool, or another browser-based system. A conventional workflow can require copying the recipient name, street, apartment or suite, city, state, and ZIP code into a separate shipping tool. A shipping label Chrome extension can reduce that repetitive movement while keeping the seller in control of the final shipment details.
        </p>
        <p>
          With ShipDime, you highlight the recipient shipping address, right-click, and choose <strong>Create Shipping Label</strong>. The ShipDime side panel opens beside the current page. It reads the selected text, separates recognizable address fields, and presents the result as an editable shipment. The webpage remains available for reference, and the original selected text remains visible for comparison.
        </p>
      </section>

      <section>
        <h2>Review the details before anything is purchased</h2>
        <p>
          Automatic extraction is a starting point, not a replacement for review. Before checkout, you can confirm the recipient name, company, street address, unit, city, state, ZIP code, country, and phone number when one is available. Sender details can remain saved locally in Chrome, helping avoid repeated entry while recipient information starts fresh for each new shipment selection.
        </p>
        <p>
          You also enter the packed shipment&apos;s weight and dimensions. Accurate package information matters because shipping services use those measurements when evaluating a shipment. ShipDime requires a minimum package weight of two pounds, accepts decimal weights above that minimum, and keeps the package fields editable until you continue.
        </p>
      </section>

      <section className="seo-feature-panel">
        <div>
          <span>1</span>
          <h3>Highlight and open</h3>
          <p>Select the recipient address and launch ShipDime from Chrome&apos;s right-click menu.</p>
        </div>
        <div>
          <span>2</span>
          <h3>Review the shipment</h3>
          <p>Confirm the editable address, sender details, weight, and package dimensions.</p>
        </div>
        <div>
          <span>3</span>
          <h3>Choose and create</h3>
          <p>Select an available service, review the price, pay securely, and access the label.</p>
        </div>
      </section>

      <section>
        <h2>Choose a USPS service and see the price</h2>
        <p>
          ShipDime lets you select an available USPS Ground Advantage or USPS Priority Mail label type for the shipment. Changing the service requests a fresh price using the current package and destination information. The pricing card shows the regular reference price, your ShipDime price, and the displayed savings for that quote. Actual availability and savings can vary by shipment, so the amount shown before payment is the amount that matters for the current label.
        </p>
        <p>
          ShipDime does not ask the extension to determine the final charge. Pricing is calculated securely by the ShipDime service, and payment is completed through a secure checkout flow. After payment is confirmed, the label is created and the side panel reports its tracking number and provides download, print, and copy actions.
        </p>
      </section>

      <section>
        <h2>Return to completed labels when you need them</h2>
        <p>
          A browser panel should not be the only place where a paid label can be found. ShipDime preserves the current order reference and can recover its status when the extension reopens. Once a label is ready, Recent Labels gives you a practical path back to its tracking number and label document. You can download or print the label again and copy tracking information without creating another shipment.
        </p>
        <p>
          If fulfillment takes longer than expected, ShipDime can resume status checking rather than asking you to pay again. If a paid label encounters a problem, the extension presents recovery and support options tied to the existing order. For more detail about the data used in this process, read the <Link href="/privacy">ShipDime Privacy Policy</Link>, or visit <Link href="/support">Support</Link> if you need help with a label.
        </p>
      </section>
    </SeoLandingPage>
  );
}
