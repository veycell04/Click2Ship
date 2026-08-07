import { emptyAddress, type Address, type AddressExtractionResult } from '../domain/models';

export function isAddressExtractionResult(value: unknown): value is AddressExtractionResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const stringFields = [
    'fullName',
    'company',
    'address1',
    'address2',
    'city',
    'state',
    'zip',
    'country',
    'phone',
    'originalText',
  ];
  return (
    stringFields.every((field) => typeof candidate[field] === 'string') &&
    typeof candidate.confidence === 'number' &&
    ['marketplace-adapter', 'address-library', 'ai-provider', 'fallback'].includes(
      String(candidate.source),
    )
  );
}

export function extractionResultToAddress(result: unknown): Address {
  if (!isAddressExtractionResult(result)) return emptyAddress();
  return {
    fullName: result.fullName,
    company: result.company,
    addressLine1: result.address1,
    addressLine2: result.address2,
    city: result.city,
    state: result.state,
    zipCode: result.zip,
    country: result.country || 'US',
    phone: result.phone,
  };
}
