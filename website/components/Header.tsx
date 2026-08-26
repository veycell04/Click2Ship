import Image from 'next/image';
import Link from 'next/link';
import { ChromeCta } from './ChromeCta';

export function Header() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="ShipDime home">
          <Image src="/icon48.png" width={40} height={40} alt="ShipDime shipping package icon" priority />
          <span><strong>ShipDime</strong><small>Select. Right-click. Ship.</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/about">About</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/support">Support</Link>
          <ChromeCta className="button small primary" />
        </nav>
      </div>
    </header>
  );
}
