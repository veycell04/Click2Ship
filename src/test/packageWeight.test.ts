import { describe, expect, it } from 'vitest';
import {
  InvalidShipmentRequestError,
  validateShipmentRequestForBackend,
} from '../backend/shipmentRequestValidation';
import type { PackageDetails } from '../domain/models';
import { validatePackageWeight } from '../domain/packageWeight';

const parcel = (weight: string): PackageDetails => ({
  weight,
  length: '12',
  width: '9',
  height: '1',
  preset: 'poly-mailer',
});

describe('minimum package weight', () => {
  it.each(['1', '1.99'])('rejects %s lb', (weight) => {
    expect(validatePackageWeight(weight)).toMatchObject({
      valid: false,
      message: 'Minimum package weight is 2 lb.',
    });
  });

  it.each(['2', '2.5', '3.25'])('accepts %s lb', (weight) => {
    expect(validatePackageWeight(weight)).toMatchObject({ valid: true, weight: Number(weight) });
  });

  it('rejects a manually modified API request below 2 lb at the backend boundary', () => {
    expect(() => validateShipmentRequestForBackend(parcel('1.99'))).toThrow(
      InvalidShipmentRequestError,
    );
    expect(() => validateShipmentRequestForBackend(parcel('1.99'))).toThrow(
      'Minimum package weight is 2 lb.',
    );
  });
});
