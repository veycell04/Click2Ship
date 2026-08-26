interface ChromeCtaProps {
  className?: string;
  label?: string;
}

export function ChromeCta({ className = 'button primary', label = 'Add to Chrome' }: ChromeCtaProps) {
  const storeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim();
  return storeUrl ? (
    <a className={className} href={storeUrl} target="_blank" rel="noreferrer">
      {label}
    </a>
  ) : (
    <span className={`${className} disabled`} aria-disabled="true">
      Coming to Chrome
    </span>
  );
}
