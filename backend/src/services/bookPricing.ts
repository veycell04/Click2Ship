import type { ReferenceRate } from './rateProvider.js';
import { getShippingServiceMappingByReferenceService } from './shippingServiceMapping.js';

export interface BookPricingConfig {
  enabled: boolean;
  targetPriceCents: number;
  minimumMarginCents: number;
  mediaMailLabelTypeId: number | null;
}

export interface BookRateSelection {
  rate: ReferenceRate;
  labelTypeId: number;
  isMediaMail: boolean;
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
  mediaMailLabelTypeId: number | null,
): BookRateSelection | null {
  const uspsRates = rates.filter((rate) => rate.carrier === 'USPS' && rate.rateCents > 0);
  if (mediaMailLabelTypeId) {
    const mediaMail = uspsRates
      .filter((rate) => rate.serviceCode === 'MediaMail')
      .sort((a, b) => a.rateCents - b.rateCents)[0];
    if (mediaMail) return { rate: mediaMail, labelTypeId: mediaMailLabelTypeId, isMediaMail: true };
  }
  const supported = uspsRates.flatMap((rate): BookRateSelection[] => {
    const mapping = getShippingServiceMappingByReferenceService(rate.serviceCode);
    return mapping ? [{ rate, labelTypeId: mapping.providerLabelTypeId, isMediaMail: false }] : [];
  });
  return supported.sort((a, b) => a.rate.rateCents - b.rate.rateCents)[0] ?? null;
}
