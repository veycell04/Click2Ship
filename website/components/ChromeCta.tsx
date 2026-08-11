export function ChromeCta({ className = 'button primary' }: { className?: string }) {
  const storeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL?.trim();
  return storeUrl ? (
    <a className={className} href={storeUrl} target="_blank" rel="noreferrer">
      Add to Chrome
    </a>
  ) : (
    <span className={`${className} disabled`} aria-disabled="true">
      Coming to Chrome
    </span>
  );
}
