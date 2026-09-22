import { pageMetadata } from '../lib/metadata';
import { ChromeCta } from '../components/ChromeCta';
import { GroundAdvantageSpotChecks } from '../components/GroundAdvantageSpotChecks';
import { RateCalculator } from '../components/RateCalculator';

const title = 'Find Shipping Deals & Discount Shipping Rates | ShipDime';
const description = 'Search available shipping options in one place with ShipDime. Check your shipping rate, find a better deal for your shipment, and create your label without manually shopping around.';
export const metadata = pageMetadata({ title: title, description: description, path: '/', type: 'website' });

const steps = [
  ['01', 'Enter Your Shipment', 'Add the ZIP codes, package size, and weight.'],
  ['02', 'ShipDime Searches', 'ShipDime checks the available shipping options for your shipment.'],
  ['03', 'Get Your Deal', 'Review the best available option and create your shipping label.'],
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
            <p className="eyebrow">ShipDime · Find your shipping deal</p>
            <h1>Stop Searching for Shipping Deals.<br />ShipDime Does It for You.</h1>
            <p className="hero-copy">Enter your shipment once. ShipDime searches available shipping options and helps you find the best deal for your shipment.</p>
            <div className="actions"><a className="button primary" href="#rate-calculator">Check My Rate</a><ChromeCta className="button secondary" label="Get ShipDime for Chrome" /></div>
            <p className="microcopy"><a href="#how-it-works">See how it works</a>. Actual rates and savings vary by shipment.</p>
          </div>
          <div className="home-price-summary"><p className="eyebrow">Save on shipping labels</p><h2>No monthly subscription.</h2><p>Compare shipping label rates before checkout, including available USPS shipping labels.</p><p className="microcopy">Your shipment. Available rates. Your choice.</p></div>
        </div>
      </section>

      <RateCalculator />

      <section className="section" id="how-it-works">
        <div className="shell"><div className="section-heading"><p className="eyebrow">How ShipDime finds your deal</p><h2>One Search. One Place. A Better Way to Find Your Shipping Rate.</h2><p>Compare the shipping options available through ShipDime, then review your rate before you buy.</p></div><ol className="steps">{steps.map(([number, title, copy]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></div>
      </section>

      <section className="section home-savings" aria-labelledby="savings-title">
        <div className="shell">
          <div className="section-heading"><p className="eyebrow">Check before you buy</p><h2 id="savings-title">Why Shop Around?</h2><p>Shipping prices can vary. Instead of repeatedly entering the same shipment on different websites, check ShipDime first and see what rate is available for your package.</p></div>
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
            <a className="button primary" href="#rate-calculator">Check My Rate</a>
          </div>
        </div>
      </section>

      <section className="section home-spot-checks"><div className="shell"><GroundAdvantageSpotChecks heading="More tested shipping rate comparisons" compact /></div></section>

      <section className="section trust-section" aria-labelledby="book-title">
        <div className="shell trust-grid"><div><p className="eyebrow">For books and media</p><h2 id="book-title">Shipping Books or Media? Check ShipDime First.</h2></div><div><p>ShipDime offers special pricing for Books &amp; Media shipments. Check the available rate before buying your next label.</p><p>Choose Books &amp; Media in the calculator for books and other eligible media shipments.</p><a className="button primary" href="#rate-calculator">Check Books &amp; Media Rate</a></div></div>
      </section>

      <section className="section demo-section" aria-labelledby="demo-title">
        <div className="shell demo-layout">
          <div className="demo-heading">
            <p className="eyebrow">Select. Right-click. Ship.</p>
            <h2 id="demo-title">Found Your Rate? Ship Even Faster.</h2>
            <p>The ShipDime Chrome extension can make label creation faster too. When a recipient address is available as selectable text in your browser, select it, right-click, and ShipDime can help fill the shipping details for you.</p>
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



      <section className="section home-about">
        <div className="shell trust-grid">
          <div><p className="eyebrow">What is ShipDime?</p><h2>Create labels from selectable addresses in your browser.</h2></div>
          <div><p>Select a recipient address on a webpage to start a U.S. domestic shipment in Chrome. Review the extracted details before buying a label. You do not need a separate sales-channel integration for this workflow.</p><p>Review <a href="/about">what ShipDime is</a>, learn how to <a href="/create-shipping-label-from-website">create a label from a website</a>, or visit the <a href="/compare">shipping-platform comparison hub</a>.</p></div>
        </div>
      </section>

      <section className="section product-section" id="product">
        <div className="shell product-grid"><div><p className="eyebrow">Inside ShipDime</p><h2>Everything you need to create and recover a label.</h2><p>Review recipient details, choose a shipping service, and see the price before paying. Return to Recent Labels when you need a label or tracking number again.</p></div><ul className="feature-list">{productFeatures.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul></div>
      </section>

      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">Built for everyday shipping</p><h2>Less friction between an order and its label.</h2></div><div className="value-grid">{values.map(([title, copy]) => <article key={title}><span className="value-icon" aria-hidden="true">↗</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

      <section className="section trust-section"><div className="shell trust-grid"><div><p className="eyebrow">Review before purchase</p><h2>Clear shipment details. Clear pricing.</h2></div><div><p>Your price is shown before payment. You review recipient, sender, package, and service information before creating a label.</p><p>Payment is processed securely. Completed labels and tracking information remain accessible through Recent Labels.</p></div></div></section>

      <section className="section"><div className="shell"><div className="section-heading"><p className="eyebrow">Seller questions</p><h2>Practical guides for individual and disconnected orders.</h2><p>Direct answers about label creation, address entry, marketplace connections, and shipping prices.</p></div><div className="comparison-card-grid"><article><h3>Create your own shipping label</h3><p>Learn the sender, recipient, package, service, purchase, and printing steps.</p><a href="/how-to-create-your-own-shipping-label">Read the guide →</a></article><article><h3>Stop copying address fields</h3><p>Compare repeated field transfer with ShipDime&apos;s select, right-click, and review workflow.</p><a href="/stop-copy-pasting-shipping-addresses">See the workflow →</a></article><article><h3>Ship without marketplace integration</h3><p>Understand when selectable recipient text can start a label without a dedicated channel connection.</p><a href="/shipping-label-without-marketplace-integration">Learn how →</a></article><article><h3>Compare shipping-label prices</h3><p>See what affects a rate and how to evaluate conditional savings without cheapest-price guarantees.</p><a href="/cheap-shipping-labels">Review pricing factors →</a></article></div></div></section>

      <section className="section final-cta"><div className="shell"><p className="eyebrow">Find your shipping deal</p><h2>Check your next shipment in one place.</h2><p>Start with a rate check, then use the <a href="/shipping-label-chrome-extension">ShipDime Chrome extension</a> to create and purchase your label.</p><a className="button primary" href="#rate-calculator">Check My Rate</a></div></section>
    </>
  );
}
