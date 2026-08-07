export function getQuoteTimeLabel(expiresAt: string, now = Date.now()): string {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) return 'Quote expired';
  const minutes = Math.max(1, Math.ceil((expiresAtMs - now) / 60_000));
  return `Quote valid for ${minutes} min`;
}
