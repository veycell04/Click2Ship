import type { Metadata } from 'next';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Manual Shipping Labels vs. Shipping Integrations | ShipDime';
const description = 'Compare manual or address-based shipping with full sales-channel integrations and learn when each workflow may fit a seller.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/manual-shipping-label-vs-shipping-integration' }, openGraph: { title, description, url: '/manual-shipping-label-vs-shipping-integration', type: 'article' } };

export default function Page() {
  return <SellerQuestionPage eyebrow="Balanced workflow guide" title="When should I use manual shipping instead of a full shipping integration?" answer="Manual or address-based shipping can fit individual shipments, occasional channels, and disconnected order sources. Full integrations may fit high-volume sellers who need bulk fulfillment and automatic order or tracking synchronization. ShipDime reduces repetitive manual entry by starting from address text selected in Chrome, while preserving seller review before a U.S. domestic label is purchased." path="/manual-shipping-label-vs-shipping-integration"
    faqs={[
      { question: 'Is manual shipping always less efficient?', answer: 'No. For occasional or disconnected orders, a focused address-based workflow may require less setup than establishing and maintaining another integration.' },
      { question: 'When is a full integration likely to be better?', answer: 'It may be better for high shipment volume, bulk fulfillment, automatic order synchronization, and automatic tracking synchronization.' },
      { question: 'Does ShipDime replace order management?', answer: 'No. ShipDime focuses on individual browser address-to-label workflows and does not claim to replace inventory or order-management platforms.' },
      { question: 'Can ShipDime reduce manual typing?', answer: 'Yes. It can populate editable recipient fields from selected text, but sellers must still review the result.' },
    ]}
    sections={[
      { heading: 'When a full integration may be the better choice', paragraphs: ['High-volume sellers often benefit from systems that automatically synchronize orders, support batch or bulk fulfillment, update tracking across sales channels, and connect with broader inventory or warehouse operations. When those capabilities are central, a verified full integration may justify its setup and maintenance.', 'Integration support varies by platform and channel. Sellers should check current official documentation for the exact automation, carrier, marketplace, and pricing capabilities they need.'] },
      { heading: 'When manual or address-based shipping may fit', paragraphs: ['An individual shipment may come from an occasional sales channel, customer message, independent system, or order source that is not conveniently connected. Establishing a new integration can be disproportionate when the immediate requirement is to prepare one accurate label.', 'ShipDime gives that manual task a more focused handoff. If the recipient address is selectable in Chrome, the seller can move the complete block into editable fields instead of copying each line separately.'] },
      { heading: 'A balanced operating model', paragraphs: ['Integrated and address-based shipping can coexist. A seller might use automatic synchronization for primary high-volume channels and ShipDime for occasional or disconnected orders. The right choice depends on shipment volume, source consistency, automation requirements, and the cost of setup.', 'ShipDime is not presented as a universal replacement for an integrated platform. Its value is the explicit select, right-click, review, package, and label workflow for supported U.S. domestic shipments.'] },
    ]}
    steps={['Estimate shipment volume and identify recurring sales channels.', 'List requirements for bulk fulfillment, order synchronization, tracking updates, and inventory workflows.', 'Use verified integrations where automation provides clear operational value.', 'For disconnected individual orders, select the recipient address in Chrome and open ShipDime.', 'Review the address and package, then choose the service and price before purchase.']}
    whenShipDimeMakesSense={['You handle individual rather than bulk shipments.', 'Orders arrive from occasional or disconnected sources.', 'Customer information is available in a browser-based workflow.', 'You want to reduce repetitive address transfer without adopting another full integration.']}
    relatedLinks={[
      { href: '/shipping-orders-from-multiple-marketplaces', label: 'Multiple marketplace orders', description: 'See how integrated and address-based methods can coexist.' },
      { href: '/shipping-label-without-integration', label: 'Shipping without integration', description: 'Understand the browser-selection alternative in more detail.' },
      { href: '/compare', label: 'Comparison hub', description: 'Review factual workflow comparisons without unsupported rankings.' },
    ]} />;
}
