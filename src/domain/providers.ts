import type { Address, AddressExtractionResult } from './models';

export interface AddressParserProvider {
  parse(input: string): Promise<AddressExtractionResult>;
}

/** @deprecated Use AddressParserProvider. */
export type AddressParser = AddressParserProvider;

export interface AIExtractionProvider {
  extract(input: string): Promise<AddressExtractionResult | null>;
}

export interface UniversalAddressExtractor {
  extract(rawText: string): Promise<AddressExtractionResult>;
}

export interface PaymentProvider {
  authorize(amount: number, currency: string): Promise<{ authorizationId: string }>;
}

export interface AddressValidationProvider {
  validate(address: Address): Promise<{ valid: boolean; normalized?: Address; messages: string[] }>;
}

export interface MarketplaceAdapter {
  matches(url: string): boolean;
  extractRawAddressBlock(): Promise<string | null>;
}
