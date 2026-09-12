import { describe, expect, it, vi } from 'vitest';
import { EasyPostRateProvider } from '../src/providers/easyPostRateProvider.js';
import { InMemoryPricingQuoteRepository, LiveEasyPostPricingService } from '../src/services/pricingService.js';
import type { RateProvider, ReferenceRate, SupportedCarrier } from '../src/services/rateProvider.js';
import { calculateBookCustomerPrice } from '../src/services/bookPricing.js';
import { parsePricingQuoteInput } from '../src/schemas/pricingQuote.js';

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
  it.each(['book', 'standard', undefined] as const)('preserves or defaults parsed category %s', (shipmentCategory) => {
    const parsed = parsePricingQuoteInput({ ...input, ...(shipmentCategory === undefined ? {} : { shipmentCategory }) });
    expect(parsed.shipmentCategory).toBe(shipmentCategory ?? 'standard');
  });

  it.each([
    [1, 702, 1031, 2088, 562],
    [2, 593, 1098, 2220, 474],
  ])('replays the logged %d lb economy quote without applying book pricing', async (weight, usps, smartPost, ground, customer) => {
    const rates = [rate('USPS', 'GroundAdvantage', usps), rate('FedEx', 'SMART_POST', smartPost), rate('FedEx', 'FEDEX_GROUND', ground)];
    const payload = { ...input, labelTypeId: 120, weight, length: 12, width: 9, height: 1 };
    const request = parsePricingQuoteInput(payload);
    expect(request.shipmentCategory).toBe('standard');
    const quote = await serviceFor(rates).getQuote(request);
    expect(quote).toMatchObject({ labelTypeId: 120, serviceName: 'USPS Ground Advantage',
      shipmentCategory: 'standard', referencePriceCents: usps, customerPriceCents: customer });
    const bookQuote = await serviceFor(rates).getQuote(parsePricingQuoteInput({ ...payload, shipmentCategory: 'book' }));
    expect(bookQuote).toMatchObject({ shipmentCategory: 'book', labelTypeId: 120,
      referencePriceCents: usps, customerPriceCents: customer });
  });

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
    const quote = await serviceFor(commonRates).getQuote(parsePricingQuoteInput({ ...input, labelTypeId: 120, shipmentCategory: 'standard' }));
    expect(quote).toMatchObject({ labelTypeId: 120, serviceName: 'USPS Ground Advantage', referencePriceCents: 818, customerPriceCents: 654, savingsCents: 164 });
  });

  it('uses only comparable expedited services for Priority and prices $11.50 at $9.20', async () => {
    const quote = await serviceFor(commonRates).getQuote(parsePricingQuoteInput({ ...input, shipmentCategory: 'standard' }));
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

  it.each([[575, 450, false], [374, 399, true]])(
    'compares standard $4.50 with Media Mail reference %d plus margin', async (mediaCost, expected, isMediaMail) => {
      const repository = new InMemoryPricingQuoteRepository();
      const service = serviceFor([rate('USPS', 'GroundAdvantage', 563), rate('USPS', 'MediaMail', mediaCost)],
        repository, 20, { enabled: true, targetPriceCents: 399, minimumMarginCents: 25, mediaMailLabelTypeId: 321 });
      const standard = await service.getQuote({ ...input, labelTypeId: 120 });
      const book = await service.getQuote(parsePricingQuoteInput(bookInput));
      expect(standard.customerPriceCents).toBe(450);
      expect(book).toMatchObject({ customerPriceCents: expected, isMediaMail, labelTypeId: isMediaMail ? 321 : 120 });
      expect(await service.getStoredQuote(book.quoteId)).toMatchObject({
        customerPriceCents: expected, labelTypeId: isMediaMail ? 321 : 120,
        input: { shipmentCategory: 'book', labelTypeId: isMediaMail ? 321 : 120 },
      });
    },
  );

  it.each([120, 87])('never increases standard service %d pricing across benchmark pools', async (labelTypeId) => {
    for (const rates of [commonRates, [rate('USPS', 'GroundAdvantage', 800), rate('UPS', 'Ground', 400), rate('USPS', 'Priority', 900)],
      [rate('USPS', 'GroundAdvantage', 900), rate('USPS', 'Priority', 500), rate('USPS', 'MediaMail', 800)]]) {
      const service = serviceFor(rates);
      const standard = await service.getQuote(parsePricingQuoteInput({ ...input, labelTypeId, shipmentCategory: 'standard' }));
      const book = await service.getQuote(parsePricingQuoteInput({ ...input, labelTypeId, shipmentCategory: 'book' }));
      expect(book.customerPriceCents).toBeLessThanOrEqual(standard.customerPriceCents);
    }
  });

  it('ignores unmapped Media Mail and invalid rates', async () => {
    const quote = await serviceFor([rate('USPS', 'MediaMail', 1), rate('USPS', 'GroundAdvantage', 563),
      rate('USPS', 'Priority', Number.NaN), rate('USPS', 'Priority', -1)]).getQuote(bookInput);
    expect(quote).toMatchObject({ customerPriceCents: 450, labelTypeId: 120, isMediaMail: false });
  });

  it('traces a synthetic 1 lb / 2 lb inversion through actual conversion and reference-rate pricing', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const weights: number[] = [];
    const provider = new EasyPostRateProvider('test', { create: async (parameters) => {
      const weight = Number(parameters.parcel?.weight);
      weights.push(weight);
      return { id: `shp_${weight}`, rates: [
        { id: `ground_${weight}`, carrier: 'USPS', service: 'GroundAdvantage', rate: weight === 16 ? '5.41' : '4.49', currency: 'USD' },
        { id: `media_${weight}`, carrier: 'USPS', service: 'MediaMail', rate: '4.00', currency: 'USD' },
        { id: `priority_${weight}`, carrier: 'USPS', service: 'Priority', rate: '8.00', currency: 'USD' },
      ] } as never;
    } });
    try {
      const service = new LiveEasyPostPricingService(provider, new InMemoryPricingQuoteRepository(), 20);
      const one = await service.getQuote({ ...bookInput, weight: 1 });
      const two = await service.getQuote({ ...bookInput, weight: 2 });
      expect(weights).toEqual([16, 32]);
      expect(one).toMatchObject({ labelTypeId: 120, referencePriceCents: 541, customerPriceCents: 433, isMediaMail: false });
      expect(two).toMatchObject({ labelTypeId: 120, referencePriceCents: 449, customerPriceCents: 359, isMediaMail: false });
      for (const [weight, cost, normal, final] of [[1, 541, 433, 433], [2, 449, 359, 359]]) {
        expect(log).toHaveBeenCalledWith('BOOK_PRICE_CALCULATION', expect.objectContaining({
          requestedWeightLb: weight, convertedWeightOz: weight! * 16,
          referenceRateCents: cost, normalCalculatedPrice: normal,
          BOOK_TARGET_PRICE_CENTS: 399, BOOK_MIN_MARGIN_CENTS: 25,
          minimumSellPrice: null, customerPriceCents: final, shipAirProviderCostCents: null,
        }));
      }
      expect(log).toHaveBeenCalledWith('BOOK_RATE_SELECTION', expect.objectContaining({
        mediaMailAvailable: true, mediaMailLabelTypeId: null, fallbackServiceUsed: true,
        rates: expect.arrayContaining([expect.objectContaining({ serviceCode: 'MediaMail', mappedLabelTypeId: null })]),
      }));
      expect(log).toHaveBeenCalledWith('BOOK_PROVIDER_RATES', expect.objectContaining({ rates: expect.any(Array) }));
      expect(JSON.stringify(log.mock.calls)).not.toContain(address.address1);
    } finally { log.mockRestore(); }
  });

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

  it('does not force the book target onto a cheaper standard option', async () => {
    const quote = await serviceFor([rate('USPS', 'GroundAdvantage', 400)]).getQuote(bookInput);
    expect(quote.customerPriceCents).toBe(320);
  });

  it('never prices below provider cost plus the configured minimum margin', () => {
    expect(calculateBookCustomerPrice(500, 400, {
      targetPriceCents: 399,
      minimumMarginCents: 25,
    })).toBe(525);
  });

  it('fails cleanly when no supported USPS book rate exists', async () => {
    await expect(serviceFor([
      rate('UPS', 'UnsupportedService', 400),
      rate('USPS', 'First', 450),
    ]).getQuote(bookInput)).rejects.toMatchObject({
      message: 'No valid USPS service is available for this book shipment.',
    });
  });
});
