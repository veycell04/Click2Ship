import { BackendClientError } from '../services/click2ShipBackendClient';

export const describePricingError = (error: unknown): string => {
  if (error instanceof BackendClientError) {
    if (error.responseBody.includes('SERVICE_RATE_UNAVAILABLE')) {
      try {
        const response = JSON.parse(error.responseBody) as { message?: unknown };
        if (typeof response.message === 'string') return response.message;
      } catch {
        return 'The selected shipping rate is unavailable for this shipment.';
      }
    }
    if (error.responseBody.includes('RATE_PROVIDER_')) {
      return 'Unable to retrieve shipping rates.';
    }
    if (error.status === 404) return 'Pricing endpoint not found';
    if (error.status === 422) return 'Pricing validation failed';
    if (error.status >= 500) return 'Backend error';
    if (error.status === 0) return 'Unable to reach backend';
  }
  return 'Unable to load shipping price.';
};

export class PricingRequestGate {
  private currentId = 0;

  begin(): number {
    this.currentId += 1;
    return this.currentId;
  }

  invalidate(): void {
    this.currentId += 1;
  }

  isCurrent(requestId: number): boolean {
    return requestId === this.currentId;
  }
}

export const createPricingInputKey = (input: unknown): string => JSON.stringify(input);
