import { describe, expect, it } from 'vitest';
import { EasyPostRateProvider } from '../src/providers/easyPostRateProvider.js';
import { RateProviderError } from '../src/services/rateProvider.js';

const address = { fullName: 'Test User', company: '', phone: '', address1: '1 Main St', address2: '', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' };
const input = { sender: address, recipient: address, weight: 2, length: 14, width: 10, height: 6 };

const shipment = (rates: Array<Record<string, unknown>>) => ({ id: 'shp_test', rates }) as never;

describe('EasyPostRateProvider', () => {
  it('creates a rating-only shipment and converts 2 lb to 32 oz', async () => {
    let request: unknown;
    const provider = new EasyPostRateProvider('test-key', { create: async (value) => { request = value; return shipment([]); } });
    await provider.getRates(input);
    expect(request).toMatchObject({
      from_address: { street1: '1 Main St', country: 'US' },
      to_address: { street1: '1 Main St', country: 'US' },
      parcel: { weight: 32, length: 14, width: 10, height: 6 },
    });
    expect(request).not.toHaveProperty('rate');
  });

  it('keeps USPS services visible while never substituting rate or list_rate for retail_rate', async () => {
    const provider = new EasyPostRateProvider('test-key', { create: async () => shipment([
      { id: 'rate_priority', carrier: 'USPS', service: 'Priority', retail_rate: '8.00', rate: '4.00', list_rate: '5.00', delivery_days: 2, delivery_date: null, delivery_date_guaranteed: false },
      { id: 'rate_missing', carrier: 'USPS', service: 'Express', retail_rate: null, rate: '3.00', list_rate: '4.00' },
      { id: 'rate_ups', carrier: 'UPS', service: 'Ground', retail_rate: '9.00' },
    ]) });
    expect(await provider.getRates(input)).toEqual([
      { providerShipmentId: 'shp_test', providerRateId: 'rate_priority', carrier: 'USPS', serviceCode: 'Priority', serviceName: 'Priority', retailPriceCents: 800, retailRate: '8.00', deliveryDays: 2, deliveryDate: null, guaranteed: false },
      { providerShipmentId: 'shp_test', providerRateId: 'rate_missing', carrier: 'USPS', serviceCode: 'Express', serviceName: 'Express', retailPriceCents: null, retailRate: null, deliveryDays: null, deliveryDate: null, guaranteed: false },
    ]);
  });

  it.each([[401, 'EasyPost API key is invalid.'], [422, 'EasyPost rejected the address or parcel.']])('normalizes EasyPost %s errors', async (statusCode, message) => {
    const provider = new EasyPostRateProvider('bad-key', { create: async () => { throw Object.assign(new Error('sensitive provider detail'), { statusCode }); } });
    await expect(provider.getRates(input)).rejects.toMatchObject<RateProviderError>({ statusCode, message });
  });

  it('normalizes EasyPost timeouts', async () => {
    const provider = new EasyPostRateProvider('test-key', { create: async () => { throw new Error('Request timed out'); } });
    await expect(provider.getRates(input)).rejects.toMatchObject({ statusCode: 504, code: 'EASYPOST_TIMEOUT' });
  });
});
