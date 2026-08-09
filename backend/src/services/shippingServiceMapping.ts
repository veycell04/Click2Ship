export interface ShippingServiceMapping {
  providerLabelTypeId: number;
  carrier: 'USPS';
  referenceRateService: string;
  displayName: string;
}

export const SERVICE_MAPPINGS = {
  PRIORITY: {
    providerLabelTypeId: 87,
    carrier: 'USPS',
    referenceRateService: 'Priority',
    displayName: 'USPS Priority Mail',
  },
  GROUND_ADVANTAGE: {
    providerLabelTypeId: 78,
    carrier: 'USPS',
    referenceRateService: 'GroundAdvantage',
    displayName: 'USPS Ground Advantage',
  },
} as const satisfies Record<string, ShippingServiceMapping>;

const mappings = new Map<number, ShippingServiceMapping>(
  Object.values(SERVICE_MAPPINGS).map((mapping) => [mapping.providerLabelTypeId, mapping]),
);

export const getShippingServiceMapping = (labelTypeId: number) => mappings.get(labelTypeId) ?? null;

export const registerConfirmedServiceMapping = (mapping: ShippingServiceMapping): void => {
  mappings.set(mapping.providerLabelTypeId, mapping);
};
