import type { ReferenceRate } from './rateProvider.js';
import { SERVICE_MAPPINGS } from './shippingServiceMapping.js';
import { eligibleBenchmarkRates } from './benchmarkEligibility.js';

export interface BookPricingConfig {
  enabled: boolean;
  /** null/undefined retains legacy pricing, including its Media Mail target. */
  discountPercent?: number | null;
  targetPriceCents: number;
  minimumMarginCents: number;
  mediaMailLabelTypeId: number | null;
  confirmMediaMailSupport?: () => Promise<boolean>;
}

export interface BookRateSelection {
  rate: ReferenceRate;
  labelTypeId: number;
  isMediaMail: boolean;
  customerPriceCents: number;
}

export const calculateBookCustomerPrice = (
  providerCostCents: number,
  normalCalculatedPriceCents: number,
  config: Pick<BookPricingConfig, 'targetPriceCents' | 'minimumMarginCents'>,
): number => Math.max(
  providerCostCents + config.minimumMarginCents,
  Math.min(normalCalculatedPriceCents, config.targetPriceCents),
);

export function selectBookRate(
  rates: ReferenceRate[],
  config: BookPricingConfig,
  discountPercent: number,
  selectedLabelTypeId?: number,
): BookRateSelection | null {
  const valid = rates.filter((rate) => Number.isSafeInteger(rate.rateCents) && rate.rateCents > 0 && rate.currency === 'USD');
  const normalPrice = (rate: ReferenceRate) => Math.round(rate.rateCents * (100 - (config.discountPercent ?? discountPercent)) / 100);
  // These are USPS fulfillment options using the SAME cross-carrier benchmark
  // pools as standard quotes. Restricting benchmarks to USPS would raise prices.
  const candidates = Object.values(SERVICE_MAPPINGS).flatMap((mapping): BookRateSelection[] => {
    const rate = eligibleBenchmarkRates(valid, mapping.benchmarkClass).sort((a, b) => a.rateCents - b.rateCents)[0];
    return rate ? [{ rate, labelTypeId: mapping.providerLabelTypeId, isMediaMail: false,
      customerPriceCents: normalPrice(rate) }] : [];
  });
  if (config.mediaMailLabelTypeId) {
    for (const rate of valid.filter((rate) => rate.carrier === 'USPS' && rate.serviceCode === 'MediaMail')) {
      candidates.push({ rate, labelTypeId: config.mediaMailLabelTypeId, isMediaMail: true,
        // Preserve the existing conservative Media Mail reference-plus-margin
        // calculation. The reference is NOT a verified ShipAir fulfillment cost.
        // Opt-in percentage mode uses the reference once, without the legacy
        // target or reference-as-cost floor. Actual ShipAir cost is unknown.
        customerPriceCents: config.discountPercent == null
          ? calculateBookCustomerPrice(rate.rateCents, normalPrice(rate), config)
          : normalPrice(rate) });
    }
  }
  return candidates.filter((candidate) => selectedLabelTypeId === undefined || candidate.labelTypeId === selectedLabelTypeId)
    .sort((a, b) => a.customerPriceCents - b.customerPriceCents)[0] ?? null;
}
