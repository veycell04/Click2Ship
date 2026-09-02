import type { Metadata } from 'next';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Cheap Shipping Labels Online | Save Up to 20% | ShipDime';
const description = 'Buy shipping labels online from Chrome, review the price before purchase, and save up to 20% on eligible ShipDime shipping rates.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/cheap-shipping-labels' }, openGraph: { title, description, url: '/cheap-shipping-labels', type: 'article' } };

export default function Page() {
  return <SellerQuestionPage eyebrow="Affordable shipping labels" title="Cheap Shipping Labels Online" answer="Looking for cheaper shipping labels? ShipDime helps U.S. sellers create shipping labels directly from Chrome and offers up to 20% savings on eligible shipping rates. Select the recipient address, right-click ShipDime, enter the package details, review the available price, and purchase your label." path="/cheap-shipping-labels"
    faqs={[
      { question: 'What is the cheapest way to buy a shipping label?', answer: 'Use accurate shipment details and compare the final available price for the same route and service. No shipping provider is guaranteed to be cheapest for every shipment.' },
      { question: 'Where can I buy cheap shipping labels online?', answer: 'Online shipping services offer labels using shipment-specific rates. ShipDime lets U.S. sellers buy labels through Chrome and offers up to 20% savings on eligible rates.' },
      { question: 'Are online shipping labels cheaper?', answer: 'They can be, but not universally. Compare equivalent package, route, and service details and review the final price before purchase.' },
      { question: 'How much does ShipDime save?', answer: 'ShipDime offers up to 20% savings on eligible shipping rates. Actual rates and savings vary by shipment.' },
      { question: 'Is ShipDime always the cheapest option?', answer: 'No shipping service is guaranteed to be the cheapest for every shipment. Rates vary by shipment. ShipDime shows the available price before purchase and currently offers up to 20% savings on eligible rates.' },
      { question: 'Can I see the price before paying?', answer: 'Yes. ShipDime displays the available shipping price for the current shipment before label purchase.' },
      { question: 'Does ShipDime support international shipping?', answer: 'No. ShipDime currently supports U.S. domestic shipping only.' },
    ]}
    sections={[
      { heading: 'Is ShipDime the cheapest shipping label option?', paragraphs: ['Shipping rates depend on the package, route, service, and available rates, so no provider is guaranteed to be cheapest for every shipment. ShipDime lets you see the price before purchasing and offers up to 20% savings on eligible rates.', 'The reliable way to find affordable shipping labels is to enter accurate shipment information and compare the final price for the service you intend to buy. ShipDime does not use a guaranteed-cheapest or lowest-price-guarantee claim.'] },
      { heading: 'How can I get cheaper shipping labels?', paragraphs: ['Start with accurate shipment details. Weigh and measure the packed parcel, confirm the origin and destination, and compare services that are actually available for those inputs. A lower price based on incorrect weight or dimensions is not a valid comparison.', 'Evaluate the amount shown immediately before purchase. Shipping rates can differ by service and shipment, and no platform should be assumed to be universally cheapest.'] },
      { heading: 'What determines the price of a shipping label?', paragraphs: ['Package weight and exterior dimensions can affect how a shipment is rated. Origin, destination, and the selected shipping service also matter. Service availability may change based on the shipment’s characteristics.', 'ShipDime currently supports U.S. domestic shipping with available USPS Ground Advantage and USPS Priority Mail label types. The seller enters package details and sees the available price before checkout.'] },
      { heading: 'Are online shipping labels cheaper?', paragraphs: ['Buying a label online may provide different rates or workflow benefits, but “online” alone does not guarantee a lower price. Compare equivalent shipment details, service levels, and applicable terms.', 'ShipDime offers up to 20% savings on eligible shipping rates. Actual rates and savings vary by shipment. This is not a guarantee that every shipment receives the maximum savings.'] },
      { heading: 'How do I compare shipping label prices?', paragraphs: ['Use the same origin, destination, packed weight, dimensions, and service when comparing amounts. Confirm that the displayed rate is current and review the final charge before purchase.', 'Price is only one part of the decision. Verify recipient accuracy, service selection, and whether the label workflow fits the way orders arrive.'] },
      { heading: 'How ShipDime creates affordable shipping labels from Chrome', paragraphs: ['ShipDime is a Chrome extension for U.S. domestic shipping that lets sellers select a recipient address on a webpage, right-click ShipDime, review the populated recipient information, enter package details, review the shipping price, and purchase a label.', 'No dedicated sales-channel integration is required for this address-selection workflow. The selected address must be available as browser text, and every populated field should be reviewed before purchase.'] },
    ]}
    steps={['Select the recipient address in Chrome and open ShipDime.', 'Review the populated address fields and correct any errors.', 'Enter accurate packed weight and dimensions.', 'Choose an available service and view the shipping price.', 'Review the shipment and price, then purchase the label if it meets your needs.']}
    whenShipDimeMakesSense={['You want to see the available price before buying an individual U.S. domestic label.', 'You have accurate packed weight and dimensions ready for comparison.', 'The recipient address is selectable in Chrome.', 'You want up to 20% savings on eligible rates without assuming every shipment receives the maximum.']}
    relatedLinks={[
      { href: '/cheapest-shipping-labels', label: 'How to compare shipping rates', description: 'Evaluate the lowest available price for an individual shipment without relying on guarantees.' },
      { href: '/discount-shipping-labels', label: 'Discount shipping labels', description: 'Understand what discounted shipping rates mean.' },
      { href: '/compare', label: 'Compare ShipDime', description: 'Evaluate workflow differences without unsupported cheapest-service claims.' },
      { href: '/how-to-create-your-own-shipping-label', label: 'Create your own label', description: 'Learn the complete address, package, service, and print process.' },
      { href: '/create-shipping-label-from-customer-address', label: 'Start from a customer address', description: 'Review the recipient and package details needed for pricing.' },
      { href: '/shipping-label-without-marketplace-integration', label: 'Without marketplace integration', description: 'See how a label can begin without connecting a sales channel.' },
    ]}>
      <section className="price-example">
        <p className="eyebrow">Illustrative examples</p>
        <h2>What would 20% savings look like?</h2>
        <p>Illustrative examples based on 20% savings. Actual rates and savings vary by shipment. These are not live carrier quotes.</p>
        <div className="comparison-table-wrap"><table className="comparison-table savings-table"><thead><tr><th scope="col">Regular eligible rate</th><th scope="col">Example ShipDime price</th><th scope="col">Example savings</th></tr></thead><tbody><tr><td>$5.00</td><td>$4.00</td><td>$1.00</td></tr><tr><td>$10.00</td><td>$8.00</td><td>$2.00</td></tr><tr><td>$20.00</td><td>$16.00</td><td>$4.00</td></tr></tbody></table></div>
      </section>
    </SellerQuestionPage>;
}
