export interface ShippingServiceMapping {
  shipAirLabelTypeId: number;
  carrier: 'USPS';
  easyPostService: string;
  displayName: string;
}

export const SERVICE_MAPPINGS = {
  PRIORITY: {
    shipAirLabelTypeId: 87,
    carrier: 'USPS',
    easyPostService: 'Priority',
    displayName: 'USPS Priority Mail',
  },
  GROUND_ADVANTAGE: {
    shipAirLabelTypeId: 78,
    carrier: 'USPS',
    easyPostService: 'GroundAdvantage',
    displayName: 'USPS Ground Advantage',
  },
} as const satisfies Record<string, ShippingServiceMapping>;

const mappings = new Map<number, ShippingServiceMapping>(
  Object.values(SERVICE_MAPPINGS).map((mapping) => [mapping.shipAirLabelTypeId, mapping]),
);

export const getShippingServiceMapping = (labelTypeId: number) => mappings.get(labelTypeId) ?? null;

export const registerConfirmedServiceMapping = (mapping: ShippingServiceMapping): void => {
  mappings.set(mapping.shipAirLabelTypeId, mapping);
};
