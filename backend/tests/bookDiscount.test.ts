import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { LiveEasyPostPricingService, InMemoryPricingQuoteRepository } from '../src/services/pricingService.js';
import type { ReferenceRate } from '../src/services/rateProvider.js';

const rate = (serviceCode: string, rateCents: number): ReferenceRate => ({ providerShipmentId: 'fixture', providerRateId: serviceCode, carrier: 'USPS', providerCarrier: 'USPS', serviceCode, serviceName: serviceCode, rateCents, currency: 'USD', deliveryDays: 2, deliveryDate: null, guaranteed: false });
const address = { fullName: 'Test', address1: '1 Main', city: 'Addison', state: 'IL', zip: '60101', country: 'US' };
const input = { selectionId: crypto.randomUUID(), labelTypeId: 120, weight: 3, length: 14, width: 10, height: 5, sender: address, recipient: address, shipmentCategory: 'book' as const };
function service(discount: string | undefined, rates = [rate('GroundAdvantage', 600), rate('Priority', 900)], standardDiscount = 20, supported = true, target = 399) {
  const config = loadConfig(discount === undefined ? {} : { BOOK_DISCOUNT_PERCENT: discount });
  return new LiveEasyPostPricingService({ getRates: async () => rates }, new InMemoryPricingQuoteRepository(), standardDiscount, {
    enabled: true, discountPercent: config.bookDiscountPercent, targetPriceCents: target, minimumMarginCents: 25,
    mediaMailLabelTypeId: 321, confirmMediaMailSupport: async () => supported,
  });
}
describe('opt-in Book discount', () => {
  it.each([[0, 600], [20, 480], [30, 420], [40, 360], [50, 300], [100, 0], [12.5, 525]])('applies %s percent once to a 600-cent reference', async (discount, expected) => {
    const quote = await service(String(discount), [rate('GroundAdvantage', 600)]).getQuote(input);
    expect(quote).toMatchObject({ customerPriceCents: expected, referencePriceCents: 600, labelTypeId: 120, shipmentCategory: 'book' });
  });
  it('does not stack the standard discount and preserves cent rounding', async () => {
    for (const standard of [20, 30, 50]) {
      expect((await service('40', [rate('GroundAdvantage', 601)], standard).getQuote(input)).customerPriceCents).toBe(361);
    }
  });
  it.each([undefined, '0', '20', '40', '50', '100'])('does not change standard Ground/Priority with Book override %s', async (discount) => {
    const engine = service(discount);
    for (const [labelTypeId, expected] of [[120, 480], [87, 720]]) {
      const quote = await engine.getQuote({ ...input, labelTypeId: labelTypeId!, shipmentCategory: 'standard' });
      expect(quote.customerPriceCents).toBe(expected);
      expect(quote.customerPriceCents).toBe((await service(undefined).getQuote({ ...input, labelTypeId: labelTypeId!, shipmentCategory: 'standard' })).customerPriceCents);
    }
  });
  it('retains legacy Media Mail pricing when unset and ignores target only when opted in', async () => {
    const rates = [rate('GroundAdvantage', 600), rate('MediaMail', 374)];
    expect((await service(undefined, rates).getQuote(input)).customerPriceCents).toBe(399);
    expect((await service(undefined).getQuote(input)).customerPriceCents).toBe(480);
    for (const target of [100, 399, 999]) {
      const quote = await service('40', rates, 20, true, target).getQuote(input);
      expect(quote).toMatchObject({ customerPriceCents: 224, isMediaMail: true, labelTypeId: 321 });
    }
  });
  it('keeps explicit selections and refuses unconfirmed Media Mail', async () => {
    const rates = [rate('GroundAdvantage', 600), rate('Priority', 900), rate('MediaMail', 374)];
    expect(await service('40', rates).getQuote({ ...input, bookService: 'selected', labelTypeId: 87 })).toMatchObject({ labelTypeId: 87, customerPriceCents: 540 });
    expect(await service('40', rates, 20, false).getQuote(input)).toMatchObject({ labelTypeId: 120, customerPriceCents: 360 });
    await expect(service('40', rates, 20, false).getQuote({ ...input, bookService: 'selected', labelTypeId: 321 })).rejects.toThrow('unavailable');
  });
  it('logs the percentage candidate without pretending the reference is an actual cost floor', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await service('40', [rate('MediaMail', 600)]).getQuote(input);
      expect(log).toHaveBeenCalledWith('BOOK_PRICE_CALCULATION', expect.objectContaining({
        shipmentCategory: 'book', selectedServiceCode: 'MediaMail', referenceRateCents: 600,
        BOOK_DISCOUNT_PERCENT: 40, bookPricingMode: 'percentage', discountedBookCandidateCents: 360,
        actualProviderCostFloorCents: null, shipAirProviderCostCents: null, marginFloorGuaranteed: false,
        minimumSellPrice: null, customerPriceCents: 360, selectedService: 'USPS Media Mail',
      }));
    } finally { log.mockRestore(); }
  });
});
