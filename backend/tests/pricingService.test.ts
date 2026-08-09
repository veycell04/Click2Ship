import { describe, expect, it } from 'vitest';
import { InMemoryPricingQuoteRepository, LiveEasyPostPricingService } from '../src/services/pricingService.js';
import type { RateProvider, ReferenceRate, SupportedCarrier } from '../src/services/rateProvider.js';

const address = { fullName: 'Test User', company: '', phone: '', address1: '1 Main St', address2: '', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' };
const input = { selectionId: '123e4567-e89b-42d3-a456-426614174000', labelTypeId: 87, weight: 2, length: 14, width: 10, height: 6, sender: address, recipient: address };
const rate = (carrier: SupportedCarrier, serviceCode: string, rateCents: number): ReferenceRate => ({
  providerShipmentId: 'shp_1', providerRateId: `rate_${carrier}_${serviceCode}`, carrier,
  providerCarrier: carrier, serviceCode, serviceName: `${carrier} ${serviceCode}`, rateCents,
  currency: 'USD', deliveryDays: 2, deliveryDate: null, guaranteed: false,
});
const serviceFor = (rates: ReferenceRate[]) => new LiveEasyPostPricingService(
  { getRates: async () => rates } satisfies RateProvider, new InMemoryPricingQuoteRepository(), 20,
);

describe('multi-carrier cheapest-rate pricing', () => {
  it.each([[855, 684, 171], [818, 654, 164], [1206, 965, 241]])(
    'prices %s cents at exactly 20%% off', async (benchmark, customer, savings) => {
      const quote = await serviceFor([rate('FedEx', 'SMART_POST', benchmark)]).getQuote(input);
      expect(quote.bestRate).toMatchObject({ benchmarkPriceCents: benchmark, customerPriceCents: customer, savingsCents: savings });
    },
  );
  it('sorts USPS, FedEx, and UPS and selects the cheapest eligible rate', async () => {
    const quote = await serviceFor([
      rate('USPS', 'GroundAdvantage', 882), rate('UPS', 'Ground', 915), rate('FedEx', 'SMART_POST', 855),
    ]).getQuote(input);
    expect(quote.bestRate).toMatchObject({ carrier: 'FedEx', rateId: 'rate_FedEx_SMART_POST', benchmarkPriceCents: 855, customerPriceCents: 684 });
    expect(quote.alternatives.map((option) => option.carrier)).toEqual(['USPS', 'UPS']);
  });
  it('persists every selectable option with internal subsidy analytics', async () => {
    const repository = new InMemoryPricingQuoteRepository();
    const service = new LiveEasyPostPricingService({ getRates: async () => [rate('FedEx', 'SMART_POST', 855), rate('USPS', 'Priority', 1206)] }, repository);
    const quote = await service.getQuote(input);
    const selected = await service.getStoredQuote(quote.alternatives[0]!.quoteId);
    expect(selected).toMatchObject({ easyPostRateId: 'rate_USPS_Priority', carrierRateCents: 1206, customerPriceCents: 965, grossSpreadCents: -241, fulfillmentProvider: 'easypost' });
  });
});
