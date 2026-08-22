import type { AddressExtractionResult } from '../domain/models';
import type { UniversalAddressExtractor } from '../domain/providers';
import { universalAddressExtractor } from '../services/universalAddressExtractor';

export async function parseFallbackAddress(
  selectedAddressText: string,
  extractor: UniversalAddressExtractor = universalAddressExtractor,
): Promise<AddressExtractionResult> {
  const parserInput = selectedAddressText.trim();
  if (!parserInput) throw new Error('No selected address text is available to parse.');
  return extractor.extract(parserInput);
}
