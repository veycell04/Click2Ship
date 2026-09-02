import type { Metadata } from 'next';
import { ChromeCta } from '../components/ChromeCta';
import { GroundAdvantageSpotChecks } from '../components/GroundAdvantageSpotChecks';

const title = 'Cheap Shipping Labels From Chrome | ShipDime';
const description = 'Create U.S. shipping labels directly from Chrome, check discounted shipping rates, and skip repetitive address copy and paste with ShipDime.';
export const metadata: Metadata = { title, description, alternates: { canonical: '/' }, openGraph: { title, description, url: '/', type: 'website' } };

const steps = [
  ['01', 'Highlight an address', 'Select the shipping address where you already work.'],
  ['02', 'Right-click and open ShipDime', 'Start a new shipment without leaving the page.'],
  ['03', 'Review shipment details', 'Confirm the recipient, sender, package weight, and dimensions.'],
  ['04', 'Choose and review', 'Select your label type and see the price before checkout.'],
  ['05', 'Pay and create your label', 'Complete secure payment, then access your label and tracking number.'],
];

const values = [
  ['Fast label creation', 'Turn a selected address into a ready-to-review shipment without repeatedly copying individual address fields.'],
  ['Simple pricing', 'See your ShipDime price before you pay and compare it with the regular rate. Save on eligible shipments.'],
  ['Recent Labels', 'Access recent labels and tracking information if the extension closes or you need the label again.'],
  ['Support when you need it', 'Get help if you have a problem accessing a label or tracking number.'],
];

const productFeatures = ['Automatic address extraction', 'Saved sender information', 'Package weight and dimensions', 'Label type selection', 'Price and savings comparison', 'Recent Labels and tracking recovery'];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">ShipDime · Select. Right-click. Ship.</p>
            <h1>Fast shipping labels. Seriously low prices.</h1>
            <p className="hero-copy">Create U.S. shipping labels directly from Chrome and get discounted shipping rates without the copy-and-paste workflow. Select. Right-click. Ship.</p>
            <div className="actions"><ChromeCta /><a className="button secondary" href="/cheap-shipping-labels">Check Your Rate</a></div>
            <p className="microcopy"><a href="#how-it-works">See how it works</a>. Actual rates and savings vary by shipment.</p>
          </div>
          <div className="hero-mark" aria-hidden="true"><span className="address-line wide" /><span className="address-line" /><span className="address-line short" /><div className="cursor-menu"><b>Create shipping label</b><span>with ShipDime</span></div></div>
        </div>
      </section>

      <section className="section home-spot-checks"><div className="shell"><GroundAdvantageSpotChecks heading="How low are ShipDime rates?" compact /></div></section>

      <section className="section commercial-callout">
        <div className="shell commercial-callout-inner"><div><p className="eyebrow">Shipping label pricing</p><h2>Looking for cheaper shipping labels?</h2><p>Shipping costs add up. ShipDime lets you review your shipping price before purchasing and offers up to 20% savings on eligible rates.</p><small>Actual rates and savings vary by shipment. No provider is guaranteed to be cheapest for every label.</small></div><a className="button primary" href="/cheap-shipping-labels">Check Your Shipping Price</a></div>
      </section>

      <section className="section home-about">
        <div className="shell trust-grid">
          <div><p className="eyebrow">What is ShipDime?</p><h2>A browser-based shipping-label workflow for U.S. online sellers.</h2></div>
          <div><p>ShipDime lets a seller select a recipient address on a webpage and start a shipping-label workflow from Chrome. It does not require a dedicated integration with each sales channel for the address-selection workflow.</p><p>Review <a href="/about">what ShipDime is</a>, learn how to <a href="/create-shipping-label-from-website">create a label from a website</a>, or visit the <a href="/compare">shipping-platform comparison hub</a>.</p></div>
        </div>
      </section>

      <section className="section demo-section" aria-labelledby="demo-title">
        <div className="shell demo-layout">
          <div className="demo-heading">
            <p className="eyebrow">Product demo</p>
            <h2 id="demo-title">See ShipDime in action</h2>
            <p>Highlight a shipping address, right-click ShipDime, review your shipment, and create your label in seconds.</p>
          </div>
          <div className="demo-video-frame">
            <video
              className="demo-video"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="metadata"
              aria-label="ShipDime Chrome extension product demonstration"
            >
              <source src="/videos/shipdime-demo.mp4" type="video/mp4" />
              Your browser does not support embedded videos.
            </video>
          </div>
          <div className="demo-actions">
            <ChromeCta label="Add ShipDime to Chrome" />
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="shell"><div className="section-heading"><p className="eyebrow">How it works</p><h2>From highlighted address to shipping label.</h2><p>Five clear steps. No tab-hopping or repetitive entry.</p></div><ol className="steps">{steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></div>
      </section>

      <section className="section product-section" id="product">
        <div className="shell product-grid"><div><p className="eyebrow">Inside ShipDime</p><h2>Everything you need to create and recover a label.</h2><p>The product showcase is ready for real Chrome extension screenshots when they become available. No simulated product interface is shown here.</p></div><ul className="feature-list">{productFeatures.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul></div>
      </section>

      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">Built for everyday shipping</p><h2>Less friction between an order and its label.</h2></div><div className="value-grid">{values.map(([title, copy]) => <article key={title}><span className="value-icon" aria-hidden="true">↗</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

      <section className="section trust-section"><div className="shell trust-grid"><div><p className="eyebrow">Review before purchase</p><h2>Clear shipment details. Clear pricing.</h2></div><div><p>Your price is shown before payment. You review recipient, sender, package, and service information before creating a label.</p><p>Payment is processed securely. Completed labels and tracking information remain accessible through Recent Labels.</p></div></div></section>

      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">Seller questions</p><h2>Practical guides for individual and disconnected orders.</h2><p>Direct answers about label creation, address entry, marketplace connections, and shipping prices.</p></div><div className="comparison-card-grid"><article><h3>Create your own shipping label</h3><p>Learn the sender, recipient, package, service, purchase, and printing steps.</p><a href="/how-to-create-your-own-shipping-label">Read the guide →</a></article><article><h3>Stop copying address fields</h3><p>Compare repeated field transfer with ShipDime&apos;s select, right-click, and review workflow.</p><a href="/stop-copy-pasting-shipping-addresses">See the workflow →</a></article><article><h3>Ship without marketplace integration</h3><p>Understand when selectable recipient text can start a label without a dedicated channel connection.</p><a href="/shipping-label-without-marketplace-integration">Learn how →</a></article><article><h3>Compare shipping-label prices</h3><p>See what affects a rate and how to evaluate conditional savings without cheapest-price guarantees.</p><a href="/cheap-shipping-labels">Review pricing factors →</a></article></div></div></section>

      <section className="section final-cta"><div className="shell"><p className="eyebrow">Select. Right-click. Ship.</p><h2>Start with the address already on your screen.</h2><p>Learn more about the <a href="/shipping-label-chrome-extension">ShipDime Chrome extension</a> or create your next U.S. domestic label.</p><ChromeCta /></div></section>
    </>
  );
}
