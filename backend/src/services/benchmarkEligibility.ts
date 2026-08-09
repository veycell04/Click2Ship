import type { ReferenceRate, SupportedCarrier } from './rateProvider.js';

export type BenchmarkClass = 'ECONOMY_GROUND' | 'PRIORITY';

const serviceKey = (service: string) => service.replace(/[^a-z0-9]/gi, '').toUpperCase();

const ELIGIBLE_SERVICE_CODES: Record<BenchmarkClass, Record<SupportedCarrier, ReadonlySet<string>>> = {
  ECONOMY_GROUND: {
    USPS: new Set(['GROUNDADVANTAGE']),
    UPS: new Set(['GROUND', 'UPSGROUND', 'GROUNDSAVER', 'UPSGROUNDSAVER']),
    FedEx: new Set(['FEDEXGROUND', 'GROUNDHOMEDELIVERY', 'SMARTPOST', 'FEDEXGROUNDECONOMY']),
  },
  PRIORITY: {
    USPS: new Set(['PRIORITY']),
    UPS: new Set(['3DAYSELECT', 'UPS3DAYSELECT', '2NDDAYAIR', 'UPS2NDDAYAIR']),
    FedEx: new Set(['EXPRESSSAVER', 'FEDEXEXPRESSSAVER', 'FEDEX2DAY', 'FEDEX2DAYAM']),
  },
};

export function isEligibleBenchmarkRate(rate: ReferenceRate, benchmarkClass: BenchmarkClass): boolean {
  if (!ELIGIBLE_SERVICE_CODES[benchmarkClass][rate.carrier].has(serviceKey(rate.serviceCode))) {
    return false;
  }
  if (benchmarkClass === 'PRIORITY' && rate.deliveryDays !== null) {
    return rate.deliveryDays >= 1 && rate.deliveryDays <= 3;
  }
  return true;
}

export function eligibleBenchmarkRates(rates: ReferenceRate[], benchmarkClass: BenchmarkClass) {
  return rates.filter((rate) => isEligibleBenchmarkRate(rate, benchmarkClass));
}
