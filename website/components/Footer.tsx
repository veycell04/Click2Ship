import Link from 'next/link';

export function Footer() {
  const storeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim();
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div><strong>ShipDime</strong><p>Shipping made simple.</p></div>
        <nav aria-label="Footer navigation">
          {storeUrl && <a href={storeUrl} target="_blank" rel="noreferrer">Chrome Web Store</a>}
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
        <div className="footer-contact"><a href="mailto:info@veycell.org">info@veycell.org</a><span>© 2026 ShipDime. All rights reserved.</span></div>
      </div>
    </footer>
  );
}
