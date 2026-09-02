import type { Metadata } from 'next';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Discount Shipping Labels for U.S. Sellers | ShipDime';
const description = 'Learn what discounted shipping labels are, what affects final postage prices, and how ShipDime displays eligible savings before purchase.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/discount-shipping-labels' }, openGraph: { title, description, url: '/discount-shipping-labels', type: 'article' } };

export default function Page() {
  return <SellerQuestionPage eyebrow="Discounted shipping rates" title="What are discount shipping labels?" answer="Discount shipping labels are labels offered at a price below an applicable reference rate. The final amount still depends on the package, route, service, and discount eligibility. ShipDime shows U.S. sellers the shipping price before purchase and offers up to 20% savings on eligible shipping rates; actual rates and savings vary by shipment." path="/discount-shipping-labels"
    faqs={[
      { question: 'What does a discounted shipping label mean?', answer: 'It means the purchase price is below an applicable reference rate for that eligible shipment. It is not a promise that the label is the cheapest available everywhere.' },
      { question: 'Why can online shipping rates differ?', answer: 'Rates can reflect the package, route, service, eligibility, and pricing available through a particular workflow at that time.' },
      { question: 'Can I see the ShipDime price before paying?', answer: 'Yes. ShipDime displays the available shipping price for review before label purchase.' },
      { question: 'Is every ShipDime label discounted by 20%?', answer: 'No. ShipDime offers up to 20% savings on eligible rates. Actual rates and savings vary by shipment.' },
      { question: 'Can I buy an international discount label with ShipDime?', answer: 'No. ShipDime currently supports U.S. domestic shipping only.' },
    ]}
    sections={[
      { heading: 'Discounted does not mean universally cheapest', paragraphs: ['A discount describes a relationship between an eligible reference rate and the price offered for a shipment. It does not prove that one provider has the lowest price across every package, route, service, or competing workflow.', 'Sellers should review the specific shipment price immediately before purchase and avoid treating a general discount statement as a guaranteed rate.'] },
      { heading: 'Why online label prices can differ', paragraphs: ['Package weight, dimensions, origin, destination, and service all help determine the applicable price. Available discounts and eligibility can also affect the amount presented in an online label workflow.', 'Accurate package data matters. Comparing a price produced from incomplete or understated measurements can lead to an invalid conclusion and an inaccurate shipment.'] },
      { heading: 'How ShipDime presents eligible savings', paragraphs: ['ShipDime shows the available price before the seller purchases a label. ShipDime offers up to 20% savings on eligible shipping rates. Actual rates and savings vary by shipment.', 'The seller can review the recipient, sender, package, service, and price together before continuing. ShipDime does not use guaranteed-cheapest or lowest-price-guarantee claims.'] },
      { heading: 'A browser-based path to the quote', paragraphs: ['ShipDime lets a U.S. seller begin with recipient address text selected directly on a webpage. After right-clicking ShipDime, the seller reviews editable recipient fields, adds package information, and views the available shipping price.', 'This address-selection workflow does not require a dedicated sales-channel integration, although the source text must be selectable on a page where Chrome permits extension access.'] },
    ]}
    steps={['Select the complete recipient address in Chrome.', 'Open ShipDime and review the populated address fields.', 'Enter accurate packed weight and dimensions.', 'Choose an available U.S. domestic shipping service.', 'Review the displayed price and eligible savings before purchase.']}
    whenShipDimeMakesSense={['You want transparent pricing before buying an individual label.', 'You are shipping between U.S. addresses.', 'You want to evaluate eligible savings without a guaranteed-cheapest claim.', 'The recipient address is already available as selectable browser text.']}
    relatedLinks={[
      { href: '/cheap-shipping-labels', label: 'Cheap shipping labels', description: 'Review the primary pricing page and illustrative savings examples.' },
      { href: '/cheapest-shipping-labels', label: 'How to compare rates', description: 'Learn how to evaluate the final price for a specific shipment.' },
      { href: '/how-to-create-your-own-shipping-label', label: 'Create your own label', description: 'Follow the full address, package, service, and purchase process.' },
    ]} />;
}
