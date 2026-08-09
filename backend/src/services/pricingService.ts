import type { CreateLabelInput } from '../types/shipping.js';
import type { RateProvider, ReferenceRate, SupportedCarrier } from './rateProvider.js';
import { getShippingServiceMapping } from './shippingServiceMapping.js';

export type PricingQuoteInput = Omit<CreateLabelInput, 'reference'>;
export interface ShippingRateOption {
  quoteId: string; rateId: string; shipmentId: string; carrier: SupportedCarrier;
  serviceCode: string; serviceName: string; benchmarkPriceCents: number;
  benchmarkDisplayAmount: string; customerPriceCents: number; customerDisplayAmount: string;
  savingsCents: number; savingsDisplayAmount: string; savingsPercent: number;
  deliveryDays: number | null; deliveryDate: string | null; guaranteed: boolean;
}
export interface PricingQuote {
  quoteId: string; labelTypeId: number; serviceName: string;
  customerPriceCents: number; customerDisplayAmount: string;
  savingsCents: number; savingsDisplayAmount: string; savingsPercent: number;
  currency: 'usd'; pricingMode: 'live'; expiresAt: string;
  referencePriceCents: number; referenceDisplayAmount: string;
}
export interface StoredPricingQuote extends ShippingRateOption {
  input: PricingQuoteInput; shipmentSnapshot: CreateLabelInput;
  providerCarrier: string; carrierRateCents: number; grossSpreadCents: number;
  currency: 'usd'; pricingMode: 'live'; expiresAt: string;
  fulfillmentProvider: 'shipair'; selectedRateSnapshot: ShippingRateOption;
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
    const selectedService = getShippingServiceMapping(input.labelTypeId);
    if (!selectedService) throw new UnsupportedPricingServiceError(`Unsupported label type: ${input.labelTypeId}`);
    const rates = (await this.rateProvider.getRates(input)).sort((a, b) => a.rateCents - b.rateCents);
    if (!rates.length) throw new PricingRateUnavailableError('No eligible shipping rates are available for this shipment.', []);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const cheapestRate = rates[0]!;
    const benchmark = this.option(cheapestRate);
    const quoteId = crypto.randomUUID();
    try {
      await this.repository.save({ ...benchmark, quoteId, serviceName: selectedService.displayName,
        input: structuredClone(input), shipmentSnapshot: { ...structuredClone(input), reference: `ShipDime-${input.selectionId}` },
        providerCarrier: cheapestRate.providerCarrier, carrierRateCents: benchmark.benchmarkPriceCents,
        grossSpreadCents: benchmark.customerPriceCents - benchmark.benchmarkPriceCents,
        currency: 'usd', pricingMode: 'live', expiresAt, fulfillmentProvider: 'shipair',
        selectedRateSnapshot: structuredClone(benchmark), labelTypeId: input.labelTypeId,
        easyPostShipmentId: benchmark.shipmentId, easyPostRateId: benchmark.rateId,
        referencePriceCents: benchmark.benchmarkPriceCents, referenceDisplayAmount: benchmark.benchmarkDisplayAmount });
    } catch (error) { throw new QuotePersistenceError(error); }
    console.log('RATE_BENCHMARK_RESULT', { selectedLabelTypeId: input.labelTypeId, eligibleRateCount: rates.length,
      cheapestCarrier: cheapestRate.carrier, cheapestService: cheapestRate.serviceCode,
      cheapestRateCents: benchmark.benchmarkPriceCents, customerPriceCents: benchmark.customerPriceCents });
    return { quoteId, labelTypeId: input.labelTypeId, serviceName: selectedService.displayName,
      customerPriceCents: benchmark.customerPriceCents, customerDisplayAmount: benchmark.customerDisplayAmount,
      savingsCents: benchmark.savingsCents, savingsDisplayAmount: benchmark.savingsDisplayAmount,
      savingsPercent: benchmark.savingsPercent, currency: 'usd', pricingMode: 'live', expiresAt,
      referencePriceCents: benchmark.benchmarkPriceCents, referenceDisplayAmount: benchmark.benchmarkDisplayAmount };
  }
  getStoredQuote(id: string) { return this.repository.findById(id); }
}
