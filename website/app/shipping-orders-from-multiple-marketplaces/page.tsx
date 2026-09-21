import { pageMetadata } from '../../lib/metadata';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Shipping Orders From Multiple Marketplaces | ShipDime';
const description = 'Compare integrated multi-channel shipping with ShipDime’s browser address-selection workflow for disconnected or occasional order sources.';
export const metadata = pageMetadata({ title: title, description: description, path: '/shipping-orders-from-multiple-marketplaces', type: 'article' });

export default function Page() {
  return <SellerQuestionPage eyebrow="Multi-source order shipping" title="How do I handle shipping when I sell on multiple marketplaces?" answer="Sellers can use an integrated multi-channel platform to synchronize supported order sources, or use an address-based workflow for individual shipments. ShipDime supports the second approach: when recipient text is selectable in Chrome, a U.S. seller can start a label without establishing a dedicated integration for every occasional or disconnected source." path="/shipping-orders-from-multiple-marketplaces"
    faqs={[
      { question: 'Does ShipDime replace inventory or order-management software?', answer: 'No. ShipDime focuses on a browser address-to-label workflow and does not claim to replace inventory management, bulk fulfillment, or automatic order synchronization.' },
      { question: 'When is an integrated shipping platform useful?', answer: 'It may be better when a seller needs high-volume processing, bulk fulfillment, automatic order synchronization, or automatic tracking synchronization.' },
      { question: 'When is an address-based workflow useful?', answer: 'It can help with individual shipments, occasional channels, or sources that are not conveniently connected to the seller’s established shipping workflow.' },
      { question: 'Can ShipDime read every marketplace address?', answer: 'No. The recipient address must be selectable and Chrome must allow extension access.' },
    ]}
    sections={[
      { heading: 'Approach A: integrated multi-channel shipping', paragraphs: ['An integrated platform can connect supported sales channels and bring orders into a central workflow. This approach may fit high-volume sellers who need bulk fulfillment, automatic order synchronization, inventory-related processes, or automatic tracking updates.', 'Integration coverage and capabilities vary by platform and change over time. Sellers should verify current official documentation instead of assuming that any platform supports a particular marketplace or workflow.'] },
      { heading: 'Approach B: browser and address-based shipping', paragraphs: ['ShipDime begins with recipient address text explicitly selected by the seller. No dedicated sales-channel integration is required for that selection workflow. This can be useful for an occasional source, an individual order, or a customer address outside a conveniently connected system.', 'ShipDime does not replace a complete order-management platform. It provides a focused handoff from selectable address text to an editable U.S. domestic shipment.'] },
      { heading: 'Use both approaches according to the task', paragraphs: ['A business does not need to treat integrated and address-based workflows as mutually exclusive. Core channels may justify a full integration, while occasional or disconnected orders may need a flexible manual path.', 'The important distinction is operational fit. Choose the integrated route for automation at scale and the selection route when the address is visible in Chrome and the seller wants to prepare an individual label without repetitive entry.'] },
    ]}
    steps={['Identify which high-volume channels benefit from automatic synchronization.', 'Identify occasional or disconnected sources that need an individual label workflow.', 'For selectable addresses, highlight the complete recipient information and open ShipDime.', 'Review the populated recipient details and add package measurements.', 'Choose an available service, review the price, and complete the U.S. domestic label.']}
    whenShipDimeMakesSense={['An order source is not conveniently connected to your primary shipping workflow.', 'You need an individual label rather than bulk fulfillment.', 'The customer address is visible and selectable in a browser-based system.', 'You want to avoid repetitive field-by-field transfer while preserving human review.']}
    relatedLinks={[
      { href: '/multi-channel-shipping', label: 'Multi-channel use case', description: 'Learn how one selection workflow can serve multiple browser-based sources.' },
      { href: '/manual-shipping-label-vs-shipping-integration', label: 'Manual vs. integrated shipping', description: 'Compare when each operating model makes sense.' },
      { href: '/compare', label: 'Compare shipping workflows', description: 'Review balanced ShipDime workflow comparisons.' },
    ]} />;
}
