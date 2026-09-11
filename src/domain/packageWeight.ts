export const MINIMUM_PACKAGE_WEIGHT_LB = 0.1;
export const MAXIMUM_PACKAGE_WEIGHT_LB = 70;
export const MINIMUM_PACKAGE_WEIGHT_MESSAGE = 'Weight must be between 0.1 and 70 lb.';

export interface PackageWeightValidation {
  valid: boolean;
  weight: number | null;
  message: string;
}

export function validatePackageWeight(value: string | number): PackageWeightValidation {
  const text = String(value).trim();
  const weight = text === '' ? Number.NaN : Number(text);
  const valid = Number.isFinite(weight) && weight >= MINIMUM_PACKAGE_WEIGHT_LB && weight <= MAXIMUM_PACKAGE_WEIGHT_LB;
  return {
    valid,
    weight: valid ? weight : null,
    message: valid ? '' : MINIMUM_PACKAGE_WEIGHT_MESSAGE,
  };
}
