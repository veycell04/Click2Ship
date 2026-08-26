import { ChromeCta } from '../components/ChromeCta';

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
            <p className="eyebrow">ShipDime · Shipping made simple.</p>
            <h1>Create shipping labels directly from any address.</h1>
            <p className="hero-copy">Highlight a shipping address on the web, right-click, review your shipment, and create your shipping label with ShipDime.</p>
            <div className="actions"><ChromeCta /><a className="button secondary" href="#how-it-works">See how it works</a></div>
            <p className="microcopy">Review the price and shipment details before you pay.</p>
          </div>
          <div className="hero-mark" aria-hidden="true"><span className="address-line wide" /><span className="address-line" /><span className="address-line short" /><div className="cursor-menu"><b>Create shipping label</b><span>with ShipDime</span></div></div>
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

      <section className="section final-cta"><div className="shell"><p className="eyebrow">Ready when you are</p><h2>Shipping made simple.</h2><p>Create labels directly from addresses on the web.</p><ChromeCta /></div></section>
    </>
  );
}
