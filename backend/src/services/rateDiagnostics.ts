export type RateFailureReason = 'NO_PROVIDER_RATE' | 'INVALID_ADDRESS' | 'UNSUPPORTED_SERVICE' | 'PROVIDER_ERROR' | 'INVALID_PACKAGE' | 'NO_ELIGIBLE_RATE';

// Inspect provider text only to classify it. Never return/log raw messages:
// upstream errors can echo addresses, request bodies, or credentials.
export function classifyProviderFailure(value: unknown): RateFailureReason {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const parts = [item.code, item.message, item.field];
  if (Array.isArray(item.errors)) for (const error of item.errors) {
    if (error && typeof error === 'object') {
      const entry = error as Record<string, unknown>;
      parts.push(entry.code, entry.message, entry.field);
    }
  }
  const text = parts.filter((part) => typeof part === 'string').join(' ').toLowerCase();
  if (text === 'unsupported_service') return 'UNSUPPORTED_SERVICE';
  if (/address|postal|zip|street|city|country/.test(text)) return 'INVALID_ADDRESS';
  if (/parcel|weight|dimension|length|width|height|package/.test(text)) return 'INVALID_PACKAGE';
  if (/service.*(?:unsupported|not supported|unavailable)|unsupported.*service/.test(text)) return 'UNSUPPORTED_SERVICE';
  return 'PROVIDER_ERROR';
}

export function safeDatabaseCode(error: unknown): string | null {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : null;
}
