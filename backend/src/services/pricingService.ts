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
export class PricingRateUnavailableError extends Error {
  constructor(message: string, readonly availableServices: string[]) {
    super(message);
  }
}
export class RetailRateUnavailableError extends Error {}
export class QuotePersistenceError extends Error {
  constructor(readonly diagnostic: unknown) {
    super('The shipping rate was calculated, but the quote could not be saved.');
  }
}

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
    console.log('PRICING_STAGE_START', { selectedLabelTypeId: input.labelTypeId });
    const mapping = getShippingServiceMapping(input.labelTypeId);
    if (!mapping) {
      throw new UnsupportedPricingServiceError('Pricing is not yet available for this label type.');
    }
    const rates = await this.rateProvider.getRates(input);
    console.log('SERVICE_MATCH_START', {
      selectedLabelTypeId: input.labelTypeId,
      mapping,
    });
    const uspsRates = rates.filter((candidate) => candidate.carrier === 'USPS');
    const rate = uspsRates.find(
      (candidate) => candidate.serviceCode === mapping.easyPostService,
    );
    console.log('SERVICE_MATCH_RESULT', {
      selectedShipAirLabelTypeId: input.labelTypeId,
      resolvedMapping: mapping,
      availableEasyPostRates: uspsRates.map((candidate) => ({
        carrier: candidate.carrier,
        service: candidate.serviceCode,
        retail_rate: candidate.retailRate,
      })),
      matchedRate: rate ?? null,
    });
    if (!rate) {
      throw new PricingRateUnavailableError(
        'The selected USPS service is unavailable for this shipment.',
        uspsRates.map((candidate) => candidate.serviceCode),
      );
    }
    if (rate.retailPriceCents === null || !Number.isFinite(rate.retailPriceCents)) {
      throw new RetailRateUnavailableError(
        'EasyPost did not return a USPS retail reference rate for this service.',
      );
    }
    const customerPriceCents = Math.round(
      (rate.retailPriceCents * (100 - this.discountPercent)) / 100,
    );
    const savingsCents = rate.retailPriceCents - customerPriceCents;
    console.log('QUOTE_CALCULATION_COMPLETE', {
      retailRate: rate.retailRate ?? money(rate.retailPriceCents),
      referencePriceCents: rate.retailPriceCents,
      customerPriceCents,
      savingsCents,
    });
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
    try {
      console.log('QUOTE_DATABASE_INSERT_START', { quoteId: publicQuote.quoteId });
      await this.repository.save({
        ...publicQuote,
        input: structuredClone(input),
        shipmentSnapshot: { ...structuredClone(input), reference: `Click2Ship-${input.selectionId}` },
        shipAirCostCents: null,
        grossSpreadCents: null,
      });
      console.log('QUOTE_DATABASE_INSERT_COMPLETE', { quoteId: publicQuote.quoteId });
    } catch (error) {
      const candidate = error as Error & { code?: string; detail?: string };
      const diagnostic = {
        name: candidate?.name,
        message: candidate?.message,
        code: candidate?.code,
        detail: candidate?.detail,
        stack: candidate?.stack,
      };
      console.error('QUOTE_DATABASE_INSERT_FAILED', diagnostic);
      throw new QuotePersistenceError(diagnostic);
    }
    return publicQuote;
  }

  getStoredQuote(quoteId: string) {
    return this.repository.findById(quoteId);
  }
}
