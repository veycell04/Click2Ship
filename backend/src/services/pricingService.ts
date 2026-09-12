import type { CreateLabelInput } from '../types/shipping.js';
import type { RateProvider, ReferenceRate, SupportedCarrier } from './rateProvider.js';
import { getShippingServiceMapping, getShippingServiceMappingByReferenceService } from './shippingServiceMapping.js';
import { poundsToOunces } from '../providers/easyPostRateProvider.js';
import { eligibleBenchmarkRates } from './benchmarkEligibility.js';
import {
  selectBookRate,
  type BookPricingConfig,
} from './bookPricing.js';

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
  shipmentCategory: 'standard' | 'book'; isMediaMail: boolean; eligibilityNotice: string;
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
  constructor(
    private readonly rateProvider: RateProvider,
    private readonly repository: PricingQuoteRepository,
    private readonly discountPercent: number,
    private readonly bookConfig: BookPricingConfig = {
      enabled: true,
      targetPriceCents: 399,
      minimumMarginCents: 25,
      mediaMailLabelTypeId: null,
    },
  ) {
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent >= 100) throw new Error('SHIPDIME_DISCOUNT_PERCENT must be between 0 and 99.');
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
    const shipmentCategory = input.shipmentCategory ?? 'standard';
    const selectedService = getShippingServiceMapping(input.labelTypeId);
    if (shipmentCategory === 'standard' && !selectedService)
      throw new UnsupportedPricingServiceError(`Unsupported label type: ${input.labelTypeId}`);
    if (shipmentCategory === 'book' && !this.bookConfig.enabled)
      throw new PricingRateUnavailableError('Book shipping is currently unavailable.', []);
    const availableRates = await this.rateProvider.getRates(input);
    let selectedRate: ReferenceRate;
    let resolvedLabelTypeId: number;
    let resolvedServiceName: string;
    let isMediaMail = false;
    let bookCustomerPriceCents: number | undefined;
    let rates: ReferenceRate[];
    if (shipmentCategory === 'book') {
      const mediaMailSupported = this.bookConfig.mediaMailLabelTypeId &&
        (!this.bookConfig.confirmMediaMailSupport || await this.bookConfig.confirmMediaMailSupport().catch(() => false));
      const bookSelection = selectBookRate(availableRates,
        { ...this.bookConfig, mediaMailLabelTypeId: mediaMailSupported ? this.bookConfig.mediaMailLabelTypeId : null },
        this.discountPercent, input.bookService === 'selected' ? input.labelTypeId : undefined);
      console.log('BOOK_RATE_SELECTION', {
        selectionId: input.selectionId, requestedWeightLb: input.weight,
        convertedWeightOz: poundsToOunces(input.weight), shipmentCategory,
        requestedLabelTypeId: input.labelTypeId,
        mediaMailLabelTypeId: this.bookConfig.mediaMailLabelTypeId,
        mediaMailAvailable: availableRates.some((rate) => rate.carrier === 'USPS' && rate.serviceCode === 'MediaMail' && rate.rateCents > 0),
        rates: availableRates.map((rate) => ({ ...rate,
          mappedLabelTypeId: rate.carrier !== 'USPS' ? null : rate.serviceCode === 'MediaMail'
            ? this.bookConfig.mediaMailLabelTypeId
            : getShippingServiceMappingByReferenceService(rate.serviceCode)?.providerLabelTypeId ?? null,
          referenceRateCents: rate.rateCents, shipAirProviderCostCents: null,
        })),
        selectedRate: bookSelection,
        fallbackServiceUsed: bookSelection ? !bookSelection.isMediaMail : null,
        fallbackPricingUsed: false,
        selectionBasis: 'Lowest customer price across existing standard USPS fulfillment options and mapped Media Mail',
      });
      if (!bookSelection) throw new PricingRateUnavailableError(
        input.bookService === 'selected' ? 'The selected service is unavailable for this book shipment.' : 'No valid USPS service is available for this book shipment.',
        availableRates.filter((rate) => rate.carrier === 'USPS').map((rate) => rate.serviceCode),
      );
      selectedRate = bookSelection.rate;
      resolvedLabelTypeId = bookSelection.labelTypeId;
      resolvedServiceName = bookSelection.isMediaMail
        ? 'USPS Media Mail'
        : getShippingServiceMapping(bookSelection.labelTypeId)?.displayName ?? bookSelection.rate.serviceName;
      isMediaMail = bookSelection.isMediaMail;
      bookCustomerPriceCents = bookSelection.customerPriceCents;
      rates = [bookSelection.rate];
    } else {
      const standardService = selectedService!;
      rates = eligibleBenchmarkRates(availableRates, standardService.benchmarkClass)
        .sort((a, b) => a.rateCents - b.rateCents);
      if (!rates.length) throw new PricingRateUnavailableError(
        `No eligible ${standardService.displayName} benchmark rates are available for this shipment.`,
        availableRates.map((rate) => `${rate.carrier} ${rate.serviceCode}`),
      );
      selectedRate = rates[0]!;
      resolvedLabelTypeId = input.labelTypeId;
      resolvedServiceName = standardService.displayName;
    }
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const benchmark = this.option(selectedRate);
    if (shipmentCategory === 'book') {
      const customerPriceCents = bookCustomerPriceCents!;
      console.log('BOOK_PRICE_CALCULATION', {
        selectionId: input.selectionId, providerShipmentId: selectedRate.providerShipmentId,
        providerRateId: selectedRate.providerRateId,
        requestedWeightLb: input.weight, convertedWeightOz: poundsToOunces(input.weight), shipmentCategory,
        selectedService: resolvedServiceName, selectedServiceCode: selectedRate.serviceCode,
        selectedLabelTypeId: resolvedLabelTypeId, providerCarrier: selectedRate.providerCarrier,
        referenceRateCents: selectedRate.rateCents,
        providerCostCentsUsedByFormula: isMediaMail ? selectedRate.rateCents : null,
        shipAirProviderCostCents: null,
        costSource: 'Reference rate; ShipAir cost is not fetched during quoting',
        normalCalculatedPrice: benchmark.customerPriceCents,
        discountPercent: this.discountPercent,
        BOOK_TARGET_PRICE_CENTS: this.bookConfig.targetPriceCents,
        BOOK_MIN_MARGIN_CENTS: this.bookConfig.minimumMarginCents,
        minimumSellPrice: isMediaMail ? selectedRate.rateCents + this.bookConfig.minimumMarginCents : null,
        customerPriceCents, fallbackServiceUsed: !isMediaMail, fallbackPricingUsed: false,
      });
      benchmark.customerPriceCents = customerPriceCents;
      benchmark.customerDisplayAmount = money(customerPriceCents);
      benchmark.savingsCents = Math.max(0, selectedRate.rateCents - customerPriceCents);
      benchmark.savingsDisplayAmount = money(benchmark.savingsCents);
      benchmark.savingsPercent = selectedRate.rateCents > 0
        ? Math.round((benchmark.savingsCents / selectedRate.rateCents) * 100)
        : 0;
    }
    console.log('QUOTE_CALCULATION_COMPLETE', {
      benchmarkRateCents: benchmark.benchmarkPriceCents,
      discountPercent: benchmark.savingsPercent,
      customerPriceCents: benchmark.customerPriceCents,
      savingsCents: benchmark.savingsCents,
    });
    const quoteId = crypto.randomUUID();
    try {
      const normalizedInput = { ...structuredClone(input), labelTypeId: resolvedLabelTypeId, shipmentCategory };
      await this.repository.save({ ...benchmark, quoteId, serviceName: resolvedServiceName,
        input: normalizedInput, shipmentSnapshot: { ...normalizedInput, reference: `ShipDime-${input.selectionId}` },
        providerCarrier: selectedRate.providerCarrier, carrierRateCents: benchmark.benchmarkPriceCents,
        grossSpreadCents: benchmark.customerPriceCents - benchmark.benchmarkPriceCents,
        currency: 'usd', pricingMode: 'live', expiresAt, fulfillmentProvider: 'shipair',
        selectedRateSnapshot: structuredClone(benchmark), labelTypeId: resolvedLabelTypeId,
        easyPostShipmentId: benchmark.shipmentId, easyPostRateId: benchmark.rateId,
        referencePriceCents: benchmark.benchmarkPriceCents, referenceDisplayAmount: benchmark.benchmarkDisplayAmount });
    } catch (error) { throw new QuotePersistenceError(error); }
    console.log('PRICING_BENCHMARK_RESULT', {
      selectedLabelTypeId: resolvedLabelTypeId,
      benchmarkClass: shipmentCategory === 'book' ? 'BOOK' : selectedService!.benchmarkClass,
      eligibleRates: rates.map((rate) => ({ carrier: rate.carrier, service: rate.serviceCode,
        rateCents: rate.rateCents, deliveryDays: rate.deliveryDays })),
      selectedBenchmark: { carrier: selectedRate.carrier, service: selectedRate.serviceCode,
        rateCents: selectedRate.rateCents },
      customerPriceCents: benchmark.customerPriceCents,
    });
    return { quoteId, labelTypeId: resolvedLabelTypeId, serviceName: resolvedServiceName,
      customerPriceCents: benchmark.customerPriceCents, customerDisplayAmount: benchmark.customerDisplayAmount,
      savingsCents: benchmark.savingsCents, savingsDisplayAmount: benchmark.savingsDisplayAmount,
      savingsPercent: benchmark.savingsPercent, currency: 'usd', pricingMode: 'live', expiresAt,
      referencePriceCents: benchmark.benchmarkPriceCents, referenceDisplayAmount: benchmark.benchmarkDisplayAmount,
      shipmentCategory, isMediaMail,
      eligibilityNotice: shipmentCategory === 'book'
        ? 'Media Mail is intended for eligible media contents such as books.'
        : '' };
  }
  getStoredQuote(id: string) { return this.repository.findById(id); }
}
