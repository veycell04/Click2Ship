import type { ShippingAddress } from '../types/shipping.js';

export interface RateRequest {
  sender: ShippingAddress;
  recipient: ShippingAddress;
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface ReferenceRate {
  providerShipmentId: string;
  providerRateId: string;
  carrier: 'USPS';
  serviceCode: string;
  serviceName: string;
  retailPriceCents: number;
  deliveryDays: number | null;
  deliveryDate: string | null;
  guaranteed: boolean;
}

export interface RateProvider {
  getRates(input: RateRequest): Promise<ReferenceRate[]>;
}

export class RateProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 503,
    public readonly code = 'RATE_PROVIDER_UNAVAILABLE',
    public readonly diagnostic?: unknown,
  ) {
    super(message);
  }
}
