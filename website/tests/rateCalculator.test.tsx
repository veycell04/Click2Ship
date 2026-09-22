import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RateCalculator } from '../components/RateCalculator';
import { ESTIMATE_URL, fetchRateEstimate, rateRequest, shipmentSummary, trackRateEvent, validateRateInputs, type RateInputs } from '../lib/rateCalculator';

const input: RateInputs = { originZip: '60101', destinationZip: '48047', weight: 3, length: 14, width: 10, height: 5, shipmentCategory: 'standard', service: 'best' };
const estimate = { labelTypeId: 120, serviceName: 'USPS Ground Advantage', customerPriceCents: 527, customerDisplayAmount: '$5.27', currency: 'usd' as const, shipmentCategory: 'standard' as const, isMediaMail: false };
afterEach(() => vi.unstubAllGlobals());
describe('public calculator', () => {
  it('displays a valid zero-dollar backend Book estimate without applying client-side pricing', async () => {
    const zero = { ...estimate, shipmentCategory: 'book', customerPriceCents: 0, customerDisplayAmount: '$0.00' };
    const result = await fetchRateEstimate({ ...input, shipmentCategory: 'book' }, async () => new Response(JSON.stringify({ success: true, estimate: zero, options: [zero] })));
    expect(result.estimate.customerPriceCents).toBe(0);
    expect(result.estimate.customerDisplayAmount).toBe('$0.00');
  });
  it('renders an indexable form, default Best Rate, disclosures, and no invented Media Mail option without fetching', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const html = renderToStaticMarkup(<RateCalculator />);
    expect(html).toContain('Find Your Shipping Deal');
    expect(html).toContain('Check My Rate');
    expect(html).toContain('value="best" selected=""');
    expect(html).toContain('USPS Ground Advantage');
    expect(html).toContain('USPS Priority Mail');
    expect(html).not.toContain('<option value="media');
    expect(html).toContain('may produce a different rate');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('posts unchanged measurements and displays the backend price without a frontend formula', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, estimate, options: [estimate] }), { status: 200 }));
    const result = await fetchRateEstimate(input, fetch);
    expect(result.estimate.customerPriceCents).toBe(527);
    expect(result.estimate.customerDisplayAmount).toBe('$5.27');
    expect(fetch).toHaveBeenCalledWith(ESTIMATE_URL, expect.objectContaining({ method: 'POST', credentials: 'omit', body: JSON.stringify(rateRequest(input)) }));
  });
  it.each([0.1, 0.5, 0.75, 1.5, 70])('accepts supported decimal weight %s', (weight) => expect(validateRateInputs({ ...input, weight })).toBeNull());
  it.each([{ originZip: 'abc' }, { weight: 0 }, { weight: 71 }, { length: 0 }])('blocks invalid input before requesting rates: %j', async (changes) => {
    const fetch = vi.fn();
    await expect(fetchRateEstimate({ ...input, ...changes }, fetch)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [429, { error: 'RATE_LIMITED' }, 'wait a minute'],
    [422, { error: 'DOMESTIC_SHIPPING_ONLY' }, 'U.S. domestic'],
    [422, { error: 'VALIDATION_ERROR', field: 'originZip' }, 'valid U.S. ZIP'],
    [503, { message: 'secret raw provider response' }, "couldn't find a rate"],
  ] as const)('handles HTTP %s safely', async (status, body, message) => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    await expect(fetchRateEstimate(input, fetch)).rejects.toThrow(message);
  });
  it('handles malformed success responses and network failures safely', async () => {
    await expect(fetchRateEstimate(input, async () => new Response('{broken', { status: 200 }))).rejects.toThrow("couldn't find a rate");
    await expect(fetchRateEstimate(input, async () => { throw new Error('provider secret'); })).rejects.toThrow("couldn't find a rate");
  });
  it('preserves shipment inputs and resolved service in the manual handoff', () => {
    const summary = shipmentSummary(input, estimate);
    for (const text of ['60101', '48047', '3 lb', '14 × 10 × 5', 'standard', 'best', 'USPS Ground Advantage', '120']) expect(summary).toContain(text);
  });
  it('sends only event names to the existing analytics tag and tolerates blocking', () => {
    const gtag = vi.fn(); vi.stubGlobal('window', { gtag });
    for (const name of ['rate_check_started', 'rate_check_success', 'rate_check_failed', 'get_this_rate_clicked'] as const) trackRateEvent(name);
    expect(gtag.mock.calls.every((call) => call.length === 2 && call[0] === 'event')).toBe(true);
    vi.stubGlobal('window', {});
    expect(() => trackRateEvent('rate_check_started')).not.toThrow();
  });
});
