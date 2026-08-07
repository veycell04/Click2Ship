import { describe, expect, it } from 'vitest';
import {
  InMemoryPricingQuoteRepository,
  LiveEasyPostPricingService,
  UnsupportedPricingServiceError,
} from '../src/services/pricingService.js';
import type { RateProvider, ReferenceRate } from '../src/services/rateProvider.js';
import { getShippingServiceMapping } from '../src/services/shippingServiceMapping.js';

const address = {
  fullName: 'Test User', company: '', phone: '', address1: '1 Main St', address2: '',
  city: 'Chicago', state: 'IL', zip: '60601', country: 'US',
};
const input = {
  selectionId: '123e4567-e89b-42d3-a456-426614174000', labelTypeId: 87,
  weight: 2, length: 14, width: 10, height: 6, sender: address, recipient: address,
};
const rate = (serviceCode: string, retailPriceCents: number): ReferenceRate => ({
  providerShipmentId: 'shp_1', providerRateId: `rate_${serviceCode}`, carrier: 'USPS',
  serviceCode, serviceName: serviceCode, retailPriceCents, deliveryDays: 2,
  deliveryDate: null, guaranteed: false,
});
const serviceFor = (rates: ReferenceRate[]) => {
  const calls: unknown[] = [];
  const provider: RateProvider = {
    async getRates(request) { calls.push(request); return rates; },
  };
  return {
    service: new LiveEasyPostPricingService(provider, new InMemoryPricingQuoteRepository(), 20),
    provider,
    calls,
  };
};

describe('EasyPost USPS retail pricing', () => {
  it.each([[800, 640, 160], [500, 400, 100], [1525, 1220, 305]])(
    'discounts retail %s cents by exactly 20%%',
    async (retail, customer, savings) => {
      const quote = await serviceFor([rate('Priority', retail)]).service.getQuote(input);
      expect(quote).toMatchObject({
        carrier: 'USPS', serviceCode: 'Priority', serviceName: 'USPS Priority Mail',
        shipAirLabelTypeId: 87, referencePriceCents: retail,
        customerPriceCents: customer, savingsCents: savings, savingsPercent: 20,
      });
    },
  );

  it('maps the real ShipAir IDs to exact EasyPost service codes', () => {
    expect(getShippingServiceMapping(87)).toMatchObject({ easyPostService: 'Priority' });
    expect(getShippingServiceMapping(78)).toMatchObject({ easyPostService: 'GroundAdvantage' });
  });

  it('finds GroundAdvantage retail and prices $5.00 at $4.00', async () => {
    const quote = await serviceFor([
      rate('Priority', 800),
      rate('GroundAdvantage', 500),
    ]).service.getQuote({ ...input, labelTypeId: 78 });
    expect(quote).toMatchObject({
      serviceCode: 'GroundAdvantage', serviceName: 'USPS Ground Advantage',
      shipAirLabelTypeId: 78, referencePriceCents: 500,
      customerPriceCents: 400, savingsCents: 100,
    });
  });

  it('returns a service-specific error when GroundAdvantage is absent', async () => {
    await expect(
      serviceFor([rate('Priority', 800)]).service.getQuote({ ...input, labelTypeId: 78 }),
    ).rejects.toThrow('USPS Ground Advantage rate is unavailable for this shipment.');
  });

  it('recalculates Priority -> Ground Advantage -> Priority and clears each previous quote', async () => {
    const repository = new InMemoryPricingQuoteRepository();
    const configured = serviceFor([rate('Priority', 800), rate('GroundAdvantage', 500)]);
    const service = new LiveEasyPostPricingService(configured.provider, repository);
    const priority = await service.getQuote(input);
    const ground = await service.getQuote({ ...input, labelTypeId: 78 });
    const priorityAgain = await service.getQuote(input);
    expect(configured.calls).toHaveLength(3);
    expect(await service.getStoredQuote(priority.quoteId)).toBeNull();
    expect(await service.getStoredQuote(ground.quoteId)).toBeNull();
    expect(await service.getStoredQuote(priorityAgain.quoteId)).toMatchObject({ serviceCode: 'Priority' });
  });

  it('rejects an unknown ShipAir label type before rating', async () => {
    await expect(
      serviceFor([rate('Priority', 800)]).service.getQuote({ ...input, labelTypeId: 999 }),
    ).rejects.toBeInstanceOf(UnsupportedPricingServiceError);
  });
});
