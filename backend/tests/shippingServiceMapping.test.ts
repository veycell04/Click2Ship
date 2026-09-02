import { describe, expect, it } from 'vitest';
import {
  getShippingServiceMapping,
  SERVICE_MAPPINGS,
} from '../src/services/shippingServiceMapping.js';

describe('ShipAir label type mappings', () => {
  it('maps the live Priority Mail label type to EasyPost Priority', () => {
    expect(SERVICE_MAPPINGS.PRIORITY.providerLabelTypeId).toBe(87);
    expect(getShippingServiceMapping(87)).toMatchObject({
      referenceRateService: 'Priority',
      displayName: 'USPS Priority Mail',
    });
  });

  it('maps the live Ground Advantage label type to EasyPost GroundAdvantage', () => {
    expect(SERVICE_MAPPINGS.GROUND_ADVANTAGE.providerLabelTypeId).toBe(120);
    expect(getShippingServiceMapping(120)).toMatchObject({
      referenceRateService: 'GroundAdvantage',
      displayName: 'USPS Ground Advantage',
    });
  });

  it('does not recognize the obsolete Ground Advantage label type', () => {
    expect(getShippingServiceMapping(78)).toBeNull();
  });
});
