import { pageMetadata } from '../lib/metadata';
import { ChromeCta } from '../components/ChromeCta';
import { GroundAdvantageSpotChecks } from '../components/GroundAdvantageSpotChecks';
import { RateCalculator } from '../components/RateCalculator';

const title = 'Cheap Shipping Labels & Discount Shipping Rates | ShipDime';
const description = 'Check ShipDime before buying your next shipping label. Access discounted U.S. shipping rates with no monthly subscription and create labels directly from your browser.';
export const metadata = pageMetadata({ title: title, description: description, path: '/', type: 'website' });

const steps = [
  ['01', 'Highlight an address', 'Select the shipping address where you already work.'],
  ['02', 'Right-click and open ShipDime', 'Start a new shipment without leaving the page.'],
  ['03', 'Review shipment details', 'Confirm the recipient, sender, package weight, and dimensions.'],
  ['04', 'Choose and review', 'Select your label type and see the price before checkout.'],
  ['05', 'Pay and create your label', 'Complete secure payment, then access your label and tracking number.'],
];

const values = [
  ['Fast label creation', 'Start a shipment from a selected address. Review the details without copying each field by hand.'],
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
            <p className="eyebrow">ShipDime · Discount shipping labels</p>
            <h1>Before You Buy Your Next Shipping Label, Check ShipDime’s Price.</h1>
            <p className="hero-copy">Get deeply discounted shipping rates with no monthly subscription. Compare your rate before you buy.</p>
            <div className="actions"><a className="button primary" href="#rate-calculator">Check Your Rate</a><ChromeCta className="button secondary" /></div>
            <p className="microcopy"><a href="#how-it-works">See how it works</a>. Actual rates and savings vary by shipment.</p>
          </div>
          <div className="home-price-summary"><p className="eyebrow">Save on shipping labels</p><h2>No monthly subscription.</h2><p>Compare shipping label rates before checkout, including available USPS shipping labels.</p><p className="microcopy">Your shipment. Available rates. Your choice.</p></div>
        </div>
      </section>

      <RateCalculator />

      <section className="section home-savings" aria-labelledby="savings-title">
        <div className="shell">
          <div className="section-heading"><p className="eyebrow">Check before you buy</p><h2 id="savings-title">Why Pay More for the Same Shipment?</h2><p>Shipping rates can vary significantly between providers. Check ShipDime before buying your next label and see what you could save.</p></div>
          <p className="home-savings-claim">Save up to 30% in tested rate comparisons.</p>
          <p className="spot-check-disclosure">Based on selected rate comparisons performed by ShipDime. Actual savings vary by package, route, service, and available rates. ShipDime does not guarantee savings on every shipment.</p>
          <div className="home-rate-examples" aria-labelledby="rate-examples-title">
            <h2 id="rate-examples-title">Real Rate Comparisons</h2>
            <p>Selected examples, not universal rates.</p>
            <div className="home-rate-grid">
              <article className="home-rate-card">
                <h3>Example 1</h3>
                <dl className="home-rate-prices"><div><dt>Pirate Ship</dt><dd>$6.14</dd></div><div className="home-rate-shipdime"><dt>ShipDime</dt><dd>$5.26</dd></div><div className="home-rate-savings"><dt>Savings</dt><dd>14%</dd></div></dl>
                <p className="home-rate-package">3 lb · 14 × 10 × 5 in<br />Addison, IL → Chesterfield, MI</p>
              </article>
              <article className="home-rate-card">
                <h3>Example 2</h3>
                <dl className="home-rate-prices"><div><dt>Compared rate</dt><dd>$9.78</dd></div><div className="home-rate-shipdime"><dt>ShipDime</dt><dd>$6.85</dd></div><div className="home-rate-savings"><dt>Savings</dt><dd>30%</dd></div></dl>
              </article>
            </div>
            <p className="microcopy">Rates change. Check today&apos;s price for your shipment.</p>
            <a className="button primary" href="#rate-calculator">Check Your Rate</a>
          </div>
        </div>
      </section>

      <section className="section home-spot-checks"><div className="shell"><GroundAdvantageSpotChecks heading="More tested shipping rate comparisons" compact /></div></section>

      <section className="section home-about">
        <div className="shell trust-grid">
          <div><p className="eyebrow">What is ShipDime?</p><h2>Create shipping labels directly from any address.</h2></div>
          <div><p>Select a recipient address on a webpage to start a U.S. domestic shipment in Chrome. Review the extracted details before buying a label. You do not need a separate sales-channel integration for this workflow.</p><p>Review <a href="/about">what ShipDime is</a>, learn how to <a href="/create-shipping-label-from-website">create a label from a website</a>, or visit the <a href="/compare">shipping-platform comparison hub</a>.</p></div>
        </div>
      </section>

      <section className="section demo-section" aria-labelledby="demo-title">
        <div className="shell demo-layout">
          <div className="demo-heading">
            <p className="eyebrow">Select. Right-click. Ship.</p>
            <h2 id="demo-title">Save Money. Then Save Time.</h2>
            <p>ShipDime also makes label creation faster. Select a customer&apos;s address on a webpage, right-click, and ShipDime can fill the shipping details for you.</p>
          </div>
          <div className="demo-video-grid">
            <div className="demo-video-card">
              <h3>How ShipDime Works</h3>
              <div className="demo-video-frame">
                <video
                  className="demo-video"
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  aria-label="How ShipDime Works: shipping label workflow demonstration"
                >
                  <source src="/videos/shipdime-demo.mp4" type="video/mp4" />
                  Your browser does not support embedded videos.
                </video>
              </div>
            </div>
            <div className="demo-video-card">
              <h3>ShipDime in Action</h3>
              <div className="demo-video-frame">
                <video
                  className="demo-video"
                  playsInline
                  controls
                  preload="metadata"
                  aria-label="ShipDime in Action: additional product demonstration"
                >
                  <source src="/videos/shipdime-demo-2.mp4" type="video/mp4" />
                  Your browser does not support embedded videos.
                </video>
              </div>
            </div>
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
        <div className="shell product-grid"><div><p className="eyebrow">Inside ShipDime</p><h2>Everything you need to create and recover a label.</h2><p>Review recipient details, choose a shipping service, and see the price before paying. Return to Recent Labels when you need a label or tracking number again.</p></div><ul className="feature-list">{productFeatures.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul></div>
      </section>

      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">Built for everyday shipping</p><h2>Less friction between an order and its label.</h2></div><div className="value-grid">{values.map(([title, copy]) => <article key={title}><span className="value-icon" aria-hidden="true">↗</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

      <section className="section trust-section"><div className="shell trust-grid"><div><p className="eyebrow">Review before purchase</p><h2>Clear shipment details. Clear pricing.</h2></div><div><p>Your price is shown before payment. You review recipient, sender, package, and service information before creating a label.</p><p>Payment is processed securely. Completed labels and tracking information remain accessible through Recent Labels.</p></div></div></section>

      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">Seller questions</p><h2>Practical guides for individual and disconnected orders.</h2><p>Direct answers about label creation, address entry, marketplace connections, and shipping prices.</p></div><div className="comparison-card-grid"><article><h3>Create your own shipping label</h3><p>Learn the sender, recipient, package, service, purchase, and printing steps.</p><a href="/how-to-create-your-own-shipping-label">Read the guide →</a></article><article><h3>Stop copying address fields</h3><p>Compare repeated field transfer with ShipDime&apos;s select, right-click, and review workflow.</p><a href="/stop-copy-pasting-shipping-addresses">See the workflow →</a></article><article><h3>Ship without marketplace integration</h3><p>Understand when selectable recipient text can start a label without a dedicated channel connection.</p><a href="/shipping-label-without-marketplace-integration">Learn how →</a></article><article><h3>Compare shipping-label prices</h3><p>See what affects a rate and how to evaluate conditional savings without cheapest-price guarantees.</p><a href="/cheap-shipping-labels">Review pricing factors →</a></article></div></div></section>

      <section className="section final-cta"><div className="shell"><p className="eyebrow">Select. Right-click. Ship.</p><h2>Start with the address already on your screen.</h2><p>Learn more about the <a href="/shipping-label-chrome-extension">ShipDime Chrome extension</a> or create your next U.S. domestic label.</p><ChromeCta /></div></section>
    </>
  );
}
