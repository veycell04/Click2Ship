import { describe, expect, it, vi } from 'vitest';
import { EasyPostRateProvider, normalizeCarrier, poundsToOunces } from '../src/providers/easyPostRateProvider.js';
const input = { sender: { fullName: 'A', address1: '1 Main', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' }, recipient: { fullName: 'B', address1: '2 Main', city: 'New York', state: 'NY', zip: '10001', country: 'US' }, weight: 2, length: 10, width: 8, height: 4 };
const response = { id: 'shp_test', rates: [
  { id: 'rate_usps', carrier: 'USPS', service: 'GroundAdvantage', rate: '8.82', retail_rate: null, currency: 'USD', delivery_days: 3 },
  { id: 'rate_fedex', carrier: 'FedExDefault', service: 'SMART_POST', rate: '8.55', currency: 'USD', delivery_days: 4 },
  { id: 'rate_ups', carrier: 'UPSDAP', service: 'Ground', rate: '9.15', currency: 'USD', delivery_days: 3 },
  { id: 'bad', carrier: 'USPS', service: 'Priority', rate: '', currency: 'USD' },
] } as never;
describe('EasyPostRateProvider multi-carrier normalization', () => {
  it.each([['NO_PROVIDER_RATE', []], ['NO_ELIGIBLE_RATE', [{ id: 'bad', carrier: 'USPS', service: 'GroundAdvantage', rate: 'invalid', currency: 'USD' }]]] as const)(
    'distinguishes %s without changing rate filtering', async (reason, rates) => {
      const log = vi.spyOn(console, 'info').mockImplementation(() => {});
      try {
        expect(await new EasyPostRateProvider('test', { create: async () => ({ id: 'fixture', rates }) as never }).getRates(input)).toEqual([]);
        expect(log).toHaveBeenCalledWith('REFERENCE_RATE_DIAGNOSTIC', expect.objectContaining({ reason, acceptedRates: 0 }));
      } finally { log.mockRestore(); }
    },
  );
  it('classifies provider address errors without logging or returning raw error content', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const provider = new EasyPostRateProvider('test', { create: async () => { throw Object.assign(new Error('address error: private street and secret credential'), { statusCode: 422 }); } });
      await expect(provider.getRates(input)).rejects.toMatchObject({ message: 'Unable to retrieve shipping rates.', diagnostic: { reason: 'INVALID_ADDRESS' } });
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
      expect(JSON.stringify(log.mock.calls)).not.toContain('private street');
    } finally { log.mockRestore(); }
  });
  it('keeps supported purchasable rate.rate values even with null retail_rate', async () => {
    const rates = await new EasyPostRateProvider('test', { create: async () => response }).getRates(input);
    expect(rates).toHaveLength(3);
    expect(rates.map(({ carrier, rateCents }) => ({ carrier, rateCents }))).toEqual([
      { carrier: 'USPS', rateCents: 882 }, { carrier: 'FedEx', rateCents: 855 }, { carrier: 'UPS', rateCents: 915 },
    ]);
  });
  it('normalizes provider carrier aliases', () => {
    expect(normalizeCarrier('FedExDefault')).toBe('FedEx');
    expect(normalizeCarrier('UPSDAP')).toBe('UPS');
  });
  it.each([[0.1, 1.6], [0.5, 8], [1, 16], [2.5, 40], [70, 1120]])(
    'converts %s lb to %s oz without rounding',
    (pounds, ounces) => expect(poundsToOunces(pounds)).toBe(ounces),
  );
});
