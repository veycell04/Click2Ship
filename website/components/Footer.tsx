import Link from 'next/link';

export function Footer() {
  const storeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim();
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div><strong>ShipDime</strong><p>Select. Right-click. Ship.</p><p>A product of Veycell LLC.</p></div>
        <nav aria-label="Footer navigation">
          {storeUrl && <a href={storeUrl} target="_blank" rel="noreferrer">Chrome Web Store</a>}
          <Link href="/about">What is ShipDime?</Link>
          <Link href="/create-shipping-label-from-website">Create from a website</Link>
          <Link href="/shipping-label-without-integration">Shipping without integration</Link>
          <Link href="/multi-channel-shipping">Multi-channel shipping</Link>
          <Link href="/compare">Compare ShipDime</Link>
          <Link href="/how-to-create-your-own-shipping-label">Shipping label guide</Link>
          <Link href="/stop-copy-pasting-shipping-addresses">Reduce address entry</Link>
          <Link href="/cheap-shipping-labels">Shipping label pricing</Link>
          <Link href="/cheapest-shipping-labels">Compare label prices</Link>
          <Link href="/discount-shipping-labels">Discount shipping labels</Link>
          <Link href="/shipping-label-chrome-extension">Chrome extension</Link>
          <Link href="/create-shipping-label-from-any-website">Address selection workflow</Link>
          <Link href="/multi-channel-shipping-labels">Multi-channel shipping</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
        <div className="footer-contact"><a href="mailto:info@veycell.org">info@veycell.org</a><span>© 2026 Veycell LLC. ShipDime. All rights reserved.</span></div>
      </div>
    </footer>
  );
}
