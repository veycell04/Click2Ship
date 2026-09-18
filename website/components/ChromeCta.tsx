import { CHROME_STORE_URL } from '../lib/chromeStore';

interface ChromeCtaProps {
  className?: string;
  label?: string;
}

export function ChromeCta({ className = 'button primary', label = 'Add to Chrome' }: ChromeCtaProps) {
  return (
    <a className={className} href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}
