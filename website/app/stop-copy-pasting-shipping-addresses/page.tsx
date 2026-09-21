import { pageMetadata } from '../../lib/metadata';
import { SellerQuestionPage } from '../../components/SellerQuestionPage';

const title = 'Stop Copying and Pasting Shipping Addresses | ShipDime';
const description = 'Reduce repetitive shipping-address entry by selecting a complete recipient address in Chrome and reviewing editable fields in ShipDime.';
export const metadata = pageMetadata({ title: title, description: description, path: '/stop-copy-pasting-shipping-addresses', type: 'article' });

export default function Page() {
  return <SellerQuestionPage eyebrow="Reduce repetitive address entry" title="How can I avoid copying and pasting customer addresses into shipping software?" answer="Instead of copying each address field separately, a U.S. seller can select the complete recipient address in Chrome and open ShipDime from the right-click menu. ShipDime populates editable recipient fields from that selection. The seller then reviews the address, adds package information, checks the service and price, and purchases the label." path="/stop-copy-pasting-shipping-addresses"
    faqs={[
      { question: 'Does ShipDime eliminate all address review?', answer: 'No. It reduces repetitive transfer, but sellers must review the populated fields before purchasing a label.' },
      { question: 'Why should apartment or unit information be checked?', answer: 'Unit details can be placed differently in selected text or omitted from an incomplete selection. Verify that they appear in the correct recipient field.' },
      { question: 'Can I select an address from any website?', answer: 'Not literally every website. The text must be selectable, and Chrome must permit extension access to the page.' },
      { question: 'Does ShipDime require an order integration?', answer: 'No dedicated sales-channel integration is required for its explicit address-selection workflow.' },
    ]}
    sections={[
      { heading: 'The repetitive copy-and-paste workflow', paragraphs: ['A manual transfer can require opening the order page, copying the recipient name, switching tools, copying the street, returning for city, state, and ZIP code, and then checking whether an apartment or unit was missed. Each extra transfer creates another opportunity for omission or placing text in the wrong field.', 'ShipDime changes the handoff, not the seller’s responsibility. It starts from one complete address selection and turns recognizable parts into fields that remain available for correction.'] },
      { heading: 'Select once, then review carefully', paragraphs: ['If the full recipient address is available as selectable text in Chrome, highlight the entire block and open ShipDime. The side panel keeps the source page nearby while recipient fields are populated.', 'Automatic extraction is not a promise of perfect parsing. Compare the populated name, street, apartment or unit, city, state, and ZIP code with the order page before continuing.'] },
      { heading: 'Finish the shipment in one focused workflow', paragraphs: ['After recipient review, confirm the sender, enter the packed weight and dimensions, and select an available U.S. domestic service. ShipDime shows the price before purchase so the seller can make the final decision with the shipment details visible.', 'When the label is created, the tracking number and label actions are shown. Recent Labels provides a path back to completed labels if the side panel closes.'] },
    ]}
    steps={['Traditional: open the order page and copy the name.', 'Traditional: copy the street, then city, state, and ZIP into separate fields.', 'ShipDime: select the complete recipient address and right-click once.', 'Review and edit the extracted address, especially apartment or unit details.', 'Add the package, review the service and price, then purchase the label.']}
    whenShipDimeMakesSense={['You repeatedly transfer address lines from browser-based order pages.', 'The order source does not have a convenient connection to your shipping workflow.', 'You want the source page and editable shipment visible side by side.', 'You handle individual labels and still want control over every recipient field.']}
    relatedLinks={[
      { href: '/create-shipping-label-from-website', label: 'Create from a website', description: 'See the complete select, review, package, and label process.' },
      { href: '/shipping-label-without-marketplace-integration', label: 'Without marketplace integration', description: 'Understand why label creation does not inherently require a channel connection.' },
      { href: '/about', label: 'What is ShipDime?', description: 'Review the current product scope and limitations.' },
    ]} />;
}
