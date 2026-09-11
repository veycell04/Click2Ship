import { describe, expect, it } from 'vitest';
import { InMemoryPricingQuoteRepository, LiveEasyPostPricingService } from '../src/services/pricingService.js';
import type { RateProvider, ReferenceRate, SupportedCarrier } from '../src/services/rateProvider.js';
import { calculateBookCustomerPrice } from '../src/services/bookPricing.js';

const address = { fullName: 'Test User', company: '', phone: '', address1: '1 Main St', address2: '', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' };
const input = { selectionId: '123e4567-e89b-42d3-a456-426614174000', labelTypeId: 87, weight: 2, length: 14, width: 10, height: 6, sender: address, recipient: address };
const rate = (carrier: SupportedCarrier, serviceCode: string, rateCents: number, deliveryDays: number | null = 2): ReferenceRate => ({
  providerShipmentId: 'shp_1', providerRateId: `rate_${carrier}_${serviceCode}`, carrier,
  providerCarrier: carrier, serviceCode, serviceName: `${carrier} ${serviceCode}`, rateCents,
  currency: 'USD', deliveryDays, deliveryDate: null, guaranteed: false,
});
const serviceFor = (
  rates: ReferenceRate[],
  repository = new InMemoryPricingQuoteRepository(),
  discountPercent = 20,
  bookConfig = { enabled: true, targetPriceCents: 399, minimumMarginCents: 25, mediaMailLabelTypeId: null as number | null },
) => new LiveEasyPostPricingService(
  { getRates: async () => rates } satisfies RateProvider,
  repository,
  discountPercent,
  bookConfig,
);

const commonRates = [
  rate('USPS', 'GroundAdvantage', 818, 5),
  rate('USPS', 'Priority', 1206, 2),
  rate('FedEx', 'SMART_POST', 855, 6),
  rate('FedEx', 'FEDEX_GROUND', 920, 4),
  rate('FedEx', 'FEDEX_EXPRESS_SAVER', 1150, 3),
  rate('UPS', 'Ground', 900, 4),
  rate('UPS', 'UPS_3_DAY_SELECT', 1175, 3),
];

describe('service-class benchmark pricing', () => {
  it.each([
    [20, 1_000, 800],
    [30, 1_000, 700],
    [30, 855, 599],
  ])('applies a %d percent discount to %d cents', async (discount, benchmark, expected) => {
    const quote = await serviceFor(
      [rate('USPS', 'Priority', benchmark)],
      new InMemoryPricingQuoteRepository(),
      discount,
    ).getQuote(input);
    expect(quote).toMatchObject({
      customerPriceCents: expected,
      savingsCents: benchmark - expected,
      savingsPercent: discount,
    });
  });

  it('creates a differently priced quote after the configured discount changes', async () => {
    const rates = [rate('USPS', 'Priority', 1_000)];
    const twenty = await serviceFor(rates, new InMemoryPricingQuoteRepository(), 20).getQuote(input);
    const thirty = await serviceFor(rates, new InMemoryPricingQuoteRepository(), 30).getQuote(input);
    expect(thirty.quoteId).not.toBe(twenty.quoteId);
    expect(twenty.customerPriceCents).toBe(800);
    expect(thirty.customerPriceCents).toBe(700);
  });

  it('uses only economy services for Ground Advantage and prices $8.18 at $6.54', async () => {
    const quote = await serviceFor(commonRates).getQuote({ ...input, labelTypeId: 120 });
    expect(quote).toMatchObject({ labelTypeId: 120, serviceName: 'USPS Ground Advantage', referencePriceCents: 818, customerPriceCents: 654, savingsCents: 164 });
  });

  it('uses only comparable expedited services for Priority and prices $11.50 at $9.20', async () => {
    const quote = await serviceFor(commonRates).getQuote(input);
    expect(quote).toMatchObject({ labelTypeId: 87, serviceName: 'USPS Priority Mail', referencePriceCents: 1150, customerPriceCents: 920, savingsCents: 230 });
  });

  it('produces different benchmark pools from the same EasyPost response', async () => {
    const ground = await serviceFor(commonRates).getQuote({ ...input, labelTypeId: 120 });
    const priority = await serviceFor(commonRates).getQuote(input);
    expect(ground.referencePriceCents).toBe(818);
    expect(priority.referencePriceCents).toBe(1150);
    expect(ground.customerPriceCents).not.toBe(priority.customerPriceCents);
  });

  it('persists only the chosen internal benchmark while retaining ShipAir fulfillment', async () => {
    const repository = new InMemoryPricingQuoteRepository();
    const quote = await serviceFor(commonRates, repository).getQuote(input);
    const stored = await serviceFor(commonRates, repository).getStoredQuote(quote.quoteId);
    expect(stored).toMatchObject({ labelTypeId: 87, easyPostRateId: 'rate_FedEx_FEDEX_EXPRESS_SAVER', carrierRateCents: 1150, customerPriceCents: 920, grossSpreadCents: -230, fulfillmentProvider: 'shipair' });
  });

  it('does not allow slow economy rates into Priority through delivery metadata', async () => {
    const quote = await serviceFor([
      rate('USPS', 'Priority', 1206, 2),
      rate('FedEx', 'FEDEX_EXPRESS_SAVER', 900, 5),
      rate('UPS', 'Ground', 700, 2),
    ]).getQuote(input);
    expect(quote.referencePriceCents).toBe(1206);
  });
});

describe('book shipment pricing', () => {
  const bookInput = { ...input, shipmentCategory: 'book' as const };

  it('prefers Media Mail when a verified ShipAir label type ID is configured', async () => {
    const quote = await serviceFor(
      [rate('USPS', 'GroundAdvantage', 500), rate('USPS', 'MediaMail', 374)],
      undefined,
      20,
      { enabled: true, targetPriceCents: 399, minimumMarginCents: 25, mediaMailLabelTypeId: 321 },
    ).getQuote(bookInput);
    expect(quote).toMatchObject({
      labelTypeId: 321,
      serviceName: 'USPS Media Mail',
      customerPriceCents: 399,
      isMediaMail: true,
    });
  });

  it('falls back to the cheapest supported USPS service when Media Mail is unavailable', async () => {
    const quote = await serviceFor([
      rate('USPS', 'Priority', 650),
      rate('USPS', 'GroundAdvantage', 500),
      rate('UPS', 'Ground', 450),
    ]).getQuote(bookInput);
    expect(quote).toMatchObject({
      labelTypeId: 120,
      serviceName: 'USPS Ground Advantage',
      isMediaMail: false,
    });
  });

  it('raises the price above the target when provider cost plus margin requires it', async () => {
    const quote = await serviceFor([rate('USPS', 'GroundAdvantage', 400)]).getQuote(bookInput);
    expect(quote.customerPriceCents).toBe(425);
  });

  it('never prices below provider cost plus the configured minimum margin', () => {
    expect(calculateBookCustomerPrice(500, 400, {
      targetPriceCents: 399,
      minimumMarginCents: 25,
    })).toBe(525);
  });

  it('fails cleanly when no supported USPS book rate exists', async () => {
    await expect(serviceFor([
      rate('UPS', 'Ground', 400),
      rate('USPS', 'First', 450),
    ]).getQuote(bookInput)).rejects.toMatchObject({
      message: 'No valid USPS service is available for this book shipment.',
    });
  });
});
