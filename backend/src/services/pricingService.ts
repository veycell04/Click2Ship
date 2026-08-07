import type { CreateLabelInput } from '../types/shipping.js';
import type { RateProvider } from './rateProvider.js';
import { getShippingServiceMapping } from './shippingServiceMapping.js';

export type PricingQuoteInput = Omit<CreateLabelInput, 'reference'>;

export interface PricingQuote {
  quoteId: string;
  carrier: 'USPS';
  serviceCode: string;
  serviceName: string;
  easyPostShipmentId: string;
  easyPostRateId: string;
  shipAirLabelTypeId: number;
  referencePriceType: 'EASYPOST_USPS_RETAIL';
  referencePriceCents: number;
  referenceDisplayAmount: string;
  customerPriceCents: number;
  customerDisplayAmount: string;
  savingsCents: number;
  savingsDisplayAmount: string;
  savingsPercent: number;
  currency: 'usd';
  deliveryDays: number | null;
  pricingMode: 'live';
  expiresAt: string;
}

export interface StoredPricingQuote extends PricingQuote {
  input: PricingQuoteInput;
  shipmentSnapshot: CreateLabelInput;
  shipAirCostCents: number | null;
  grossSpreadCents: number | null;
}

export interface PricingQuoteRepository {
  save(quote: StoredPricingQuote): Promise<void>;
  findById(quoteId: string): Promise<StoredPricingQuote | null>;
}

export class InMemoryPricingQuoteRepository implements PricingQuoteRepository {
  private readonly quotes = new Map<string, StoredPricingQuote>();
  private readonly activeQuoteBySelection = new Map<string, string>();
  async save(quote: StoredPricingQuote) {
    const priorQuoteId = this.activeQuoteBySelection.get(quote.input.selectionId);
    if (priorQuoteId) this.quotes.delete(priorQuoteId);
    this.quotes.set(quote.quoteId, structuredClone(quote));
    this.activeQuoteBySelection.set(quote.input.selectionId, quote.quoteId);
  }
  async findById(quoteId: string) {
    return structuredClone(this.quotes.get(quoteId) ?? null);
  }
}

export interface PricingService {
  getQuote(input: PricingQuoteInput): Promise<PricingQuote>;
  getStoredQuote(quoteId: string): Promise<StoredPricingQuote | null>;
}

export class UnsupportedPricingServiceError extends Error {}
export class PricingRateUnavailableError extends Error {}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export class LiveEasyPostPricingService implements PricingService {
  constructor(
    private readonly rateProvider: RateProvider,
    private readonly repository: PricingQuoteRepository,
    private readonly discountPercent = 20,
  ) {
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent >= 100) {
      throw new Error('CLICK2SHIP_DISCOUNT_PERCENT must be between 0 and 99.');
    }
  }

  async getQuote(input: PricingQuoteInput): Promise<PricingQuote> {
    const mapping = getShippingServiceMapping(input.labelTypeId);
    if (!mapping) {
      throw new UnsupportedPricingServiceError('Pricing is not yet available for this label type.');
    }
    const rates = await this.rateProvider.getRates(input);
    const rate = rates.find(
      (candidate) =>
        candidate.carrier === mapping.carrier &&
        candidate.serviceCode === mapping.easyPostService,
    );
    if (process.env.NODE_ENV !== 'production') {
      console.log({
        selectedShipAirLabelTypeId: input.labelTypeId,
        resolvedMapping: mapping,
        availableEasyPostRates: rates.map((candidate) => ({
          carrier: candidate.carrier,
          service: candidate.serviceCode,
          retail_rate: (candidate.retailPriceCents / 100).toFixed(2),
        })),
        matchedRate: rate ?? null,
      });
    }
    if (!rate) {
      throw new PricingRateUnavailableError(
        `${mapping.displayName} rate is unavailable for this shipment.`,
      );
    }
    const customerPriceCents = Math.round(
      (rate.retailPriceCents * (100 - this.discountPercent)) / 100,
    );
    const savingsCents = rate.retailPriceCents - customerPriceCents;
    const publicQuote: PricingQuote = {
      quoteId: crypto.randomUUID(),
      carrier: 'USPS',
      serviceCode: mapping.easyPostService,
      serviceName: mapping.displayName,
      easyPostShipmentId: rate.providerShipmentId,
      easyPostRateId: rate.providerRateId,
      shipAirLabelTypeId: mapping.shipAirLabelTypeId,
      referencePriceType: 'EASYPOST_USPS_RETAIL',
      referencePriceCents: rate.retailPriceCents,
      referenceDisplayAmount: money(rate.retailPriceCents),
      customerPriceCents,
      customerDisplayAmount: money(customerPriceCents),
      savingsCents,
      savingsDisplayAmount: money(savingsCents),
      savingsPercent: this.discountPercent,
      currency: 'usd',
      deliveryDays: rate.deliveryDays,
      pricingMode: 'live',
      expiresAt: new Date(Date.now() + 10 * 60 * 1_000).toISOString(),
    };
    await this.repository.save({
      ...publicQuote,
      input: structuredClone(input),
      shipmentSnapshot: { ...structuredClone(input), reference: `Click2Ship-${input.selectionId}` },
      shipAirCostCents: null,
      grossSpreadCents: null,
    });
    return publicQuote;
  }

  getStoredQuote(quoteId: string) {
    return this.repository.findById(quoteId);
  }
}
