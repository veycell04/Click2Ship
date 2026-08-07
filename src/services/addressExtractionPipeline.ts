import type { AddressExtractionResult } from '../domain/models';
import { universalAddressExtractor } from './universalAddressExtractor';

/** Compatibility entry point; all parsing is delegated to the universal extractor. */
export function extractAddress(input: string): Promise<AddressExtractionResult> {
  return universalAddressExtractor.extract(input);
}
