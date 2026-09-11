export interface ShippingServiceMapping {
  providerLabelTypeId: number;
  carrier: 'USPS';
  referenceRateService: string;
  displayName: string;
  benchmarkClass: 'ECONOMY_GROUND' | 'PRIORITY';
}

export const SERVICE_MAPPINGS = {
  PRIORITY: {
    providerLabelTypeId: 87,
    carrier: 'USPS',
    referenceRateService: 'Priority',
    displayName: 'USPS Priority Mail',
    benchmarkClass: 'PRIORITY',
  },
  GROUND_ADVANTAGE: {
    providerLabelTypeId: 120,
    carrier: 'USPS',
    referenceRateService: 'GroundAdvantage',
    displayName: 'USPS Ground Advantage',
    benchmarkClass: 'ECONOMY_GROUND',
  },
} as const satisfies Record<string, ShippingServiceMapping>;

const mappings = new Map<number, ShippingServiceMapping>(
  Object.values(SERVICE_MAPPINGS).map((mapping) => [mapping.providerLabelTypeId, mapping]),
);

export const getShippingServiceMapping = (labelTypeId: number) => mappings.get(labelTypeId) ?? null;

export const getShippingServiceMappingByReferenceService = (service: string) =>
  [...mappings.values()].find((mapping) => mapping.referenceRateService === service) ?? null;

export const registerConfirmedServiceMapping = (mapping: ShippingServiceMapping): void => {
  mappings.set(mapping.providerLabelTypeId, mapping);
};
