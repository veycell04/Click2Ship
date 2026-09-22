export const ESTIMATE_URL = 'https://click2-ship.vercel.app/api/pricing/estimate';
export type ServiceChoice = 'best' | 'ground' | 'priority';
export interface RateInputs {
  originZip: string; destinationZip: string;
  weight: number; length: number; width: number; height: number;
  shipmentCategory: 'standard' | 'book'; service: ServiceChoice;
}
export interface RateEstimate {
  labelTypeId: number; serviceName: string; customerPriceCents: number;
  customerDisplayAmount: string; currency: 'usd'; shipmentCategory: 'standard' | 'book'; isMediaMail: boolean;
}
export const unavailableMessage = "We couldn't find a rate for this shipment. Please check the package details and try again.";
export function validateRateInputs(input: RateInputs): string | null {
  if (![input.originZip, input.destinationZip].every((zip) => /^\d{5}(?:-\d{4})?$/.test(zip.trim()))) return 'Enter a valid U.S. ZIP code.';
  if (!Number.isFinite(input.weight) || input.weight < 0.1 || input.weight > 70) return 'Enter a package weight between 0.1 and 70 lb.';
  if (![input.length, input.width, input.height].every((value) => Number.isFinite(value) && value > 0)) return 'Enter package dimensions greater than zero.';
  return null;
}
export function rateRequest(input: RateInputs) {
  return { ...input, originZip: input.originZip.trim(), destinationZip: input.destinationZip.trim(), originCountry: 'US', destinationCountry: 'US' };
}
function isEstimate(value: unknown): value is RateEstimate {
  if (!value || typeof value !== 'object') return false;
  const quote = value as RateEstimate;
  return Number.isSafeInteger(quote.customerPriceCents) && quote.customerPriceCents > 0 &&
    typeof quote.customerDisplayAmount === 'string' && /^\$\d+\.\d{2}$/.test(quote.customerDisplayAmount) &&
    typeof quote.serviceName === 'string' && quote.serviceName.length > 0 &&
    Number.isInteger(quote.labelTypeId) && quote.labelTypeId > 0 && quote.currency === 'usd';
}
export async function fetchRateEstimate(input: RateInputs, fetcher: typeof fetch = fetch) {
  const invalid = validateRateInputs(input);
  if (invalid) throw new Error(invalid);
  let response: Response;
  try {
    response = await fetcher(ESTIMATE_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify(rateRequest(input)), signal: AbortSignal.timeout(25_000),
    });
  } catch { throw new Error(unavailableMessage); }
  if (response.status === 429) throw new Error('Too many rate checks. Please wait a minute and try again.');
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    if (body?.error === 'DOMESTIC_SHIPPING_ONLY') throw new Error('ShipDime currently supports U.S. domestic shipping.');
    if (body?.error === 'VALIDATION_ERROR') {
      if (['originZip', 'destinationZip'].includes(body.field)) throw new Error('Enter a valid U.S. ZIP code.');
      if (body.field === 'weight') throw new Error('Enter a package weight between 0.1 and 70 lb.');
    }
    throw new Error(unavailableMessage);
  }
  if (!isEstimate(body.estimate) || !Array.isArray(body.options) || !body.options.every(isEstimate)) throw new Error(unavailableMessage);
  return { estimate: body.estimate as RateEstimate, options: body.options as RateEstimate[] };
}
export function shipmentSummary(input: RateInputs, estimate: RateEstimate) {
  return `ShipDime shipment estimate\n${input.originZip} → ${input.destinationZip}\n${input.weight} lb · ${input.length} × ${input.width} × ${input.height} in\nCategory: ${input.shipmentCategory}\nRequested service: ${input.service}\nSelected service: ${estimate.serviceName} (label ${estimate.labelTypeId})\nZIP-only estimate: ${estimate.customerDisplayAmount}\nRe-enter these details in ShipDime. Full addresses and current rates may change the final price.`;
}
export function trackRateEvent(event: 'rate_check_started' | 'rate_check_success' | 'rate_check_failed' | 'get_this_rate_clicked') {
  // Reuse the existing tag. No shipment fields, ZIPs, or quote IDs are sent.
  try { (window as Window & { gtag?: (command: string, event: string) => void }).gtag?.('event', event); } catch { /* Analytics must never block quoting. */ }
}
