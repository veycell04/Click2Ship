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

describe('package weight range', () => {
  it.each(['0', '0.09', '70.01', '71'])('rejects %s lb', (weight) => {
    expect(validatePackageWeight(weight)).toMatchObject({
      valid: false,
      message: 'Weight must be between 0.1 and 70 lb.',
    });
  });

  it.each(['0.1', '0.5', '1', '1.25', '2.5', '70'])('accepts %s lb', (weight) => {
    expect(validatePackageWeight(weight)).toMatchObject({ valid: true, weight: Number(weight) });
  });

  it('rejects a manually modified API request outside the weight range', () => {
    expect(() => validateShipmentRequestForBackend(parcel('0.09'))).toThrow(
      InvalidShipmentRequestError,
    );
    expect(() => validateShipmentRequestForBackend(parcel('0.09'))).toThrow(
      'Weight must be between 0.1 and 70 lb.',
    );
  });
});
