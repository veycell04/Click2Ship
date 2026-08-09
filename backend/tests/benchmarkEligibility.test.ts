import { describe, expect, it } from 'vitest';
import { eligibleBenchmarkRates } from '../src/services/benchmarkEligibility.js';
import type { ReferenceRate, SupportedCarrier } from '../src/services/rateProvider.js';

const rate = (carrier: SupportedCarrier, serviceCode: string, deliveryDays: number | null = 2): ReferenceRate => ({
  providerShipmentId: 'shp', providerRateId: `rate-${serviceCode}`, carrier, providerCarrier: carrier,
  serviceCode, serviceName: serviceCode, rateCents: 1000, currency: 'USD', deliveryDays,
  deliveryDate: null, guaranteed: false,
});

const services = [
  rate('USPS', 'GroundAdvantage', 5), rate('USPS', 'Priority', 2),
  rate('UPS', 'Ground', 4), rate('UPS', 'UPS_3_DAY_SELECT', 3),
  rate('FedEx', 'SMART_POST', 6), rate('FedEx', 'FEDEX_GROUND', 4),
  rate('FedEx', 'FEDEX_EXPRESS_SAVER', 3), rate('FedEx', 'FEDEX_2_DAY', 2),
];

describe('benchmark eligibility', () => {
  it('includes ground equivalents and excludes expedited services', () => {
    expect(eligibleBenchmarkRates(services, 'ECONOMY_GROUND').map((item) => item.serviceCode)).toEqual([
      'GroundAdvantage', 'Ground', 'SMART_POST', 'FEDEX_GROUND',
    ]);
  });

  it('includes Priority equivalents and excludes all ground services', () => {
    expect(eligibleBenchmarkRates(services, 'PRIORITY').map((item) => item.serviceCode)).toEqual([
      'Priority', 'UPS_3_DAY_SELECT', 'FEDEX_EXPRESS_SAVER', 'FEDEX_2_DAY',
    ]);
  });
});
