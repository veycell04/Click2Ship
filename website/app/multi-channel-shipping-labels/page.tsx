import { pageMetadata } from '../../lib/metadata';
import Link from 'next/link';
import { SeoLandingPage } from '../../components/SeoLandingPage';

const title = 'Multi-Channel Shipping Labels Without Extra Integrations | ShipDime';
const description =
  'Use one browser-based ShipDime workflow to prepare shipping labels from selectable recipient addresses across your sales channels.';

export const metadata = pageMetadata({ title: title, description: description, path: '/multi-channel-shipping-labels', type: 'website' });

const faqs = [
  {
    question: 'What does multi-channel shipping mean in ShipDime?',
    answer:
      'It means using the same user-directed browser workflow when recipient addresses appear across marketplaces, online-store dashboards, order management tools, and other supported browser-based systems.',
  },
  {
    question: 'Does ShipDime automatically import every order?',
    answer:
      'No. ShipDime uses an explicit selection workflow. You choose the recipient address on the page and start the shipment from Chrome rather than granting ShipDime an automatic order import from every channel.',
  },
  {
    question: 'Does ShipDime replace full shipping management platforms?',
    answer:
      'ShipDime focuses on a streamlined browser-to-label workflow. Businesses that need inventory synchronization, warehouse automation, extensive reporting, or complex batch operations may still need a broader shipping platform.',
  },
  {
    question: 'Are savings identical for every sales channel and shipment?',
    answer:
      'No. Shipment eligibility, service availability, reference rates, and displayed savings can vary. ShipDime shows the applicable price before payment so you can review the current shipment rather than rely on a blanket savings claim.',
  },
];

export default function MultiChannelShippingLabelsPage() {
  return (
    <SeoLandingPage
      eyebrow="Multi-channel shipping labels"
      title="A simpler shipping workflow across your sales channels"
      introduction="ShipDime helps sellers move from a recipient address to a ready-to-review shipment using the same Chrome workflow across marketplaces, independent stores, order tools, and other browser-based systems."
      faqs={faqs}
    >
      <section>
        <h2>One shipping task, many possible order sources</h2>
        <p>
          A growing seller may work across several kinds of sales channels. Orders can arrive through marketplaces, independent online stores, order management tools, wholesale portals, social commerce dashboards, or other browser-based systems. Each channel may organize customer information differently, and the seller may not want to adopt a completely separate label process for every source.
        </p>
        <p>
          Multi-channel shipping becomes especially repetitive when the essential information is already visible but must be transferred field by field. ShipDime provides a consistent starting action: select the recipient shipping address, right-click, and open the shipment in a Chrome side panel. Rather than requiring ShipDime to maintain a dedicated integration with each sales channel, the user explicitly selects the recipient address they want to use.
        </p>
      </section>

      <section>
        <h2>A focused alternative to integration-first workflows</h2>
        <p>
          Shipping products such as Shippo, Veeqo, Pirate Ship, ShipStation, and Easyship are examples of tools businesses may evaluate when organizing fulfillment. Their features, integrations, pricing, and intended workflows differ, and sellers should choose products based on their actual operational requirements. ShipDime&apos;s distinction is not a claim that those platforms are unsuitable. It is a deliberately focused browser interaction for a common shipping handoff.
        </p>
        <p>
          The ShipDime workflow can be useful when an order source is outside a seller&apos;s established integration set, when shipment volume does not justify configuring another channel connection, or when the seller simply wants to prepare one shipment from the information currently on screen. Compatibility still depends on the recipient address being available as selectable text on a normal page where Chrome permits extension access.
        </p>
      </section>

      <section className="seo-feature-panel">
        <div>
          <span>01</span>
          <h3>Marketplaces</h3>
          <p>Select the visible shipping address for the order you intend to fulfill.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Independent stores</h3>
          <p>Use the same review flow without requiring a new direct store integration.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Browser-based tools</h3>
          <p>Start from selectable recipient text in an order or customer workflow.</p>
        </div>
      </section>

      <section>
        <h2>Consistent review across channels</h2>
        <p>
          The source of an order can change, but the details that need verification remain familiar. ShipDime places the recipient into editable fields and preserves the raw selected text for comparison. Saved sender information stays separate from the temporary recipient session. You then confirm the packed shipment&apos;s weight and dimensions, choose an available USPS Ground Advantage or USPS Priority Mail option, and request a current price.
        </p>
        <p>
          This creates a consistent checkpoint regardless of where the address began. The seller reviews the recipient and package rather than allowing the selected page to silently become the final shipping record. If the text is incomplete or extraction is unavailable, the fields remain editable. ShipDime does not promise that every website layout can be read automatically, and it does not remove the need to confirm address accuracy.
        </p>
      </section>

      <section>
        <h2>Pricing and payment remain shipment-specific</h2>
        <p>
          ShipDime displays the available service and quote for the shipment information currently entered. The pricing view can compare a regular reference price with the ShipDime price and show the applicable savings. It does not rely on an unsupported promise that every shipment is the cheapest or that every shipment receives identical savings. The price shown before checkout is the relevant amount for that shipment.
        </p>
        <p>
          Payment is completed securely after review. Label creation begins only after payment confirmation, and the order remains correlated with its saved shipment details. This backend-backed flow means the label process is not dependent on keeping the original marketplace tab or the extension panel open continuously.
        </p>
      </section>

      <section>
        <h2>Keep access after the original order page is gone</h2>
        <p>
          Once created, the label and tracking number can be recovered through Recent Labels. Sellers can download or print the label again, copy tracking information, and report a problem without exposing a provider identifier. If payment was received but label creation encounters a recoverable issue, ShipDime warns the user not to pay again and uses the existing paid order for recovery.
        </p>
        <p>
          ShipDime is designed for sellers who value a clear, user-directed bridge between the order source and the shipping label. Learn more on the <Link href="/">ShipDime homepage</Link>, review how shipment information is processed in the <Link href="/privacy">Privacy Policy</Link>, or contact <Link href="/support">Support</Link> if you need help accessing a completed label.
        </p>
      </section>
    </SeoLandingPage>
  );
}
