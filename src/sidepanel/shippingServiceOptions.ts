import type {
  BackendPriceQuote,
  BackendRateOption,
} from '../services/click2ShipBackendClient';

export function findShippingServiceOption(options: BackendRateOption[], rateId: string) {
  return options.find((candidate) => candidate.rateId === rateId);
}

export function selectShippingService(
  quote: BackendPriceQuote,
  option: BackendRateOption,
): BackendPriceQuote {
  return {
    ...quote,
    ...option,
    referencePriceCents: option.benchmarkPriceCents,
    referenceDisplayAmount: option.benchmarkDisplayAmount,
  };
}
