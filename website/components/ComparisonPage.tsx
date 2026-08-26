import Link from 'next/link';
import { GeoPage, type GeoFaq } from './GeoPage';

interface ComparisonPageProps {
  competitor: string;
  path: string;
  title: string;
  description: string;
  answer: string;
  perspective: string;
  faqs: GeoFaq[];
}

export function ComparisonPage({ competitor, path, title, answer, perspective, faqs }: ComparisonPageProps) {
  return (
    <GeoPage eyebrow={`ShipDime compared with ${competitor}`} title={title} answer={answer} path={path} faqs={faqs} parent={{ label: 'Compare', href: '/compare' }}>
      <section>
        <h2>The main difference is where the workflow starts</h2>
        <p>Platforms such as {competitor} provide their own shipping workflows and integrations. ShipDime approaches the task differently: a U.S. seller selects recipient address text directly in Chrome, right-clicks to open ShipDime, reviews the extracted information, adds package details, reviews a service and price, and creates the label.</p>
        <div className="workflow-comparison" aria-label="Workflow comparison">
          <div><strong>Traditional integrated workflow</strong><span>Sales channel → integration or import → shipping platform</span></div>
          <div><strong>ShipDime workflow</strong><span>Selectable address → right-click → review → label workflow</span></div>
        </div>
        <p>{perspective}</p>
      </section>

      <section>
        <h2>Factual workflow comparison</h2>
        <p>This table documents ShipDime&apos;s known behavior. It intentionally avoids claims about {competitor}&apos;s current pricing, carriers, integrations, or feature availability when those facts have not been independently verified for this page.</p>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead><tr><th scope="col">Consideration</th><th scope="col">ShipDime</th><th scope="col">{competitor}</th></tr></thead>
            <tbody>
              <tr><th scope="row">Workflow starting point</th><td>User-selected recipient address text in Chrome</td><td>Varies by workflow or integration; verify current documentation</td></tr>
              <tr><th scope="row">Chrome address-selection workflow</th><td>Yes</td><td>Not asserted on this page</td></tr>
              <tr><th scope="row">Recipient review and editing</th><td>Yes, before label purchase</td><td>Varies by workflow; verify current documentation</td></tr>
              <tr><th scope="row">Dedicated sales-channel integration required</th><td>No, not for ShipDime&apos;s address-selection workflow</td><td>Varies by chosen workflow or integration</td></tr>
              <tr><th scope="row">Current ShipDime shipping scope</th><td>U.S. domestic only</td><td>Not evaluated on this page</td></tr>
              <tr><th scope="row">Pricing review</th><td>Shown before purchase; savings may vary</td><td>Verify current {competitor} pricing and terms</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Address review remains essential</h2>
        <p>ShipDime automatically populates recipient fields from the selected text, but the seller can review and edit the recipient information before purchasing the label. Sellers should confirm the name, street, apartment or unit, city, state, and ZIP code. Automatic extraction is a starting point, not a guarantee of address accuracy.</p>
        <p>If the recipient address is not selectable, appears on a Chrome-restricted page, or is extracted incompletely, the seller may need to correct or enter fields manually. ShipDime does not claim to work on literally every website.</p>
      </section>

      <section>
        <h2>Which workflow should a seller evaluate?</h2>
        <p>A seller who needs automated order imports, broad operational tooling, or a particular platform integration should verify {competitor}&apos;s current official documentation against those requirements. A seller who wants to begin from an address already visible as selectable browser text may prefer to evaluate ShipDime&apos;s focused Chrome workflow.</p>
        <p>These approaches can serve different needs. This comparison does not rank either product as universally better. Explore the <Link href="/compare">comparison hub</Link>, read <Link href="/shipping-label-without-integration">how labels can start without a dedicated channel integration</Link>, or review <Link href="/about">current ShipDime capabilities</Link>.</p>
      </section>
    </GeoPage>
  );
}
