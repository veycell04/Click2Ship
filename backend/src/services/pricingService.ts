import type { CreateLabelInput } from '../types/shipping.js';
import type { RateProvider, ReferenceRate, SupportedCarrier } from './rateProvider.js';

export type PricingQuoteInput = Omit<CreateLabelInput, 'reference'>;
export interface ShippingRateOption {
  quoteId: string; rateId: string; shipmentId: string; carrier: SupportedCarrier;
  serviceCode: string; serviceName: string; benchmarkPriceCents: number;
  benchmarkDisplayAmount: string; customerPriceCents: number; customerDisplayAmount: string;
  savingsCents: number; savingsDisplayAmount: string; savingsPercent: number;
  deliveryDays: number | null; deliveryDate: string | null; guaranteed: boolean;
}
export interface PricingQuote extends ShippingRateOption {
  bestRate: ShippingRateOption;
  alternatives: ShippingRateOption[];
  currency: 'usd'; pricingMode: 'live'; expiresAt: string;
  // Compatibility aliases for the existing PriceCard during rollout.
  referencePriceCents: number; referenceDisplayAmount: string;
}
export interface StoredPricingQuote extends ShippingRateOption {
  input: PricingQuoteInput; shipmentSnapshot: CreateLabelInput;
  providerCarrier: string; carrierRateCents: number; grossSpreadCents: number;
  currency: 'usd'; pricingMode: 'live'; expiresAt: string;
  fulfillmentProvider: 'easypost'; selectedRateSnapshot: ShippingRateOption;
  labelTypeId: number; easyPostShipmentId: string; easyPostRateId: string;
  referencePriceCents: number; referenceDisplayAmount: string;
}
export interface PricingQuoteRepository {
  save(quote: StoredPricingQuote): Promise<void>;
  findById(quoteId: string): Promise<StoredPricingQuote | null>;
}
export class InMemoryPricingQuoteRepository implements PricingQuoteRepository {
  private readonly quotes = new Map<string, StoredPricingQuote>();
  async save(quote: StoredPricingQuote) { this.quotes.set(quote.quoteId, structuredClone(quote)); }
  async findById(id: string) { return structuredClone(this.quotes.get(id) ?? null); }
}
export interface PricingService {
  getQuote(input: PricingQuoteInput): Promise<PricingQuote>;
  getStoredQuote(quoteId: string): Promise<StoredPricingQuote | null>;
}
export class PricingRateUnavailableError extends Error { constructor(message: string, readonly availableServices: string[]) { super(message); } }
export class QuotePersistenceError extends Error { constructor(readonly diagnostic: unknown) { super('The shipping rates were calculated, but the quote could not be saved.'); } }
// Retained exports for route compatibility while clients transition.
export class UnsupportedPricingServiceError extends Error {}
export class RetailRateUnavailableError extends Error {}
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export class LiveEasyPostPricingService implements PricingService {
  constructor(private readonly rateProvider: RateProvider, private readonly repository: PricingQuoteRepository, private readonly discountPercent = 20) {
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent >= 100) throw new Error('CLICK2SHIP_DISCOUNT_PERCENT must be between 0 and 99.');
  }
  private option(rate: ReferenceRate): ShippingRateOption {
    const customer = Math.round(rate.rateCents * (100 - this.discountPercent) / 100);
    const savings = rate.rateCents - customer;
    return { quoteId: crypto.randomUUID(), rateId: rate.providerRateId, shipmentId: rate.providerShipmentId,
      carrier: rate.carrier, serviceCode: rate.serviceCode, serviceName: rate.serviceName,
      benchmarkPriceCents: rate.rateCents, benchmarkDisplayAmount: money(rate.rateCents),
      customerPriceCents: customer, customerDisplayAmount: money(customer), savingsCents: savings,
      savingsDisplayAmount: money(savings), savingsPercent: this.discountPercent,
      deliveryDays: rate.deliveryDays, deliveryDate: rate.deliveryDate, guaranteed: rate.guaranteed };
  }
  async getQuote(input: PricingQuoteInput): Promise<PricingQuote> {
    console.log('PRICING_STAGE_START');
    const rates = (await this.rateProvider.getRates(input)).sort((a, b) => a.rateCents - b.rateCents);
    if (!rates.length) throw new PricingRateUnavailableError('No eligible shipping rates are available for this shipment.', []);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const options = rates.slice(0, 5).map((rate) => this.option(rate));
    try {
      for (let index = 0; index < options.length; index += 1) {
        const option = options[index]!; const rate = rates[index]!;
        await this.repository.save({ ...option, input: structuredClone(input),
          shipmentSnapshot: { ...structuredClone(input), reference: `ShipDime-${input.selectionId}` },
          providerCarrier: rate.providerCarrier, carrierRateCents: option.benchmarkPriceCents,
          grossSpreadCents: option.customerPriceCents - option.benchmarkPriceCents,
          currency: 'usd', pricingMode: 'live', expiresAt, fulfillmentProvider: 'easypost',
          selectedRateSnapshot: structuredClone(option), labelTypeId: input.labelTypeId,
          easyPostShipmentId: option.shipmentId, easyPostRateId: option.rateId,
          referencePriceCents: option.benchmarkPriceCents,
          referenceDisplayAmount: option.benchmarkDisplayAmount });
      }
    } catch (error) { throw new QuotePersistenceError(error); }
    const best = options[0]!;
    console.log('QUOTE_CALCULATION_COMPLETE', { carrier: best.carrier, service: best.serviceCode,
      benchmarkRateCents: best.benchmarkPriceCents, customerPriceCents: best.customerPriceCents,
      savingsCents: best.savingsCents });
    return { ...best, bestRate: best, alternatives: options.slice(1), currency: 'usd', pricingMode: 'live', expiresAt,
      referencePriceCents: best.benchmarkPriceCents, referenceDisplayAmount: best.benchmarkDisplayAmount };
  }
  getStoredQuote(id: string) { return this.repository.findById(id); }
}
