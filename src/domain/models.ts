export interface Address {
  fullName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface AddressExtractionResult {
  fullName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  source: 'marketplace-adapter' | 'address-library' | 'ai-provider' | 'fallback';
  confidence: number;
  originalText: string;
}

export type PackagePreset = 'poly-mailer' | 'small-box' | 'medium-box' | 'large-box' | 'custom';

export interface PackageDetails {
  weight: string;
  length: string;
  width: string;
  height: string;
  preset: PackagePreset;
}

export interface PriceQuote {
  carrier: string;
  service: string;
  referencePrice: number;
  customerPrice: number;
  currency: 'USD';
  isDemo: true;
}

export interface LabelResult {
  trackingNumber: string;
  labelText: string;
}

export const emptyAddress = (): Address => ({
  fullName: '',
  company: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
  phone: '',
});
