import type { PackageDetails } from '../domain/models';
import { MINIMUM_PACKAGE_WEIGHT_MESSAGE, validatePackageWeight } from '../domain/packageWeight';

export class InvalidShipmentRequestError extends Error {
  readonly statusCode = 400;
}

/** Server-boundary validation. A future API handler must call this before ShipAir. */
export function validateShipmentRequestForBackend(parcel: PackageDetails): void {
  if (!validatePackageWeight(parcel.weight).valid) {
    throw new InvalidShipmentRequestError(MINIMUM_PACKAGE_WEIGHT_MESSAGE);
  }
}
