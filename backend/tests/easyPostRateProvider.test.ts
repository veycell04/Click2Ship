import { describe, expect, it } from 'vitest';
import { EasyPostRateProvider, normalizeCarrier } from '../src/providers/easyPostRateProvider.js';
const input = { sender: { fullName: 'A', address1: '1 Main', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' }, recipient: { fullName: 'B', address1: '2 Main', city: 'New York', state: 'NY', zip: '10001', country: 'US' }, weight: 2, length: 10, width: 8, height: 4 };
const response = { id: 'shp_test', rates: [
  { id: 'rate_usps', carrier: 'USPS', service: 'GroundAdvantage', rate: '8.82', retail_rate: null, currency: 'USD', delivery_days: 3 },
  { id: 'rate_fedex', carrier: 'FedExDefault', service: 'SMART_POST', rate: '8.55', currency: 'USD', delivery_days: 4 },
  { id: 'rate_ups', carrier: 'UPSDAP', service: 'Ground', rate: '9.15', currency: 'USD', delivery_days: 3 },
  { id: 'bad', carrier: 'USPS', service: 'Priority', rate: '', currency: 'USD' },
] } as never;
describe('EasyPostRateProvider multi-carrier normalization', () => {
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
});
