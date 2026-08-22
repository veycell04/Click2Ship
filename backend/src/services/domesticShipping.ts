import type { ShippingAddress } from '../types/shipping.js';

export const DOMESTIC_SHIPPING_ONLY_MESSAGE =
  'ShipDime currently supports U.S. domestic shipping only.';
export const DOMESTIC_SHIPPING_ONLY_RESPONSE = {
  success: false,
  error: 'DOMESTIC_SHIPPING_ONLY',
  message: DOMESTIC_SHIPPING_ONLY_MESSAGE,
} as const;

const acceptedUnitedStatesNames = new Set([
  'US',
  'USA',
  'UNITED STATES',
  'UNITED STATES OF AMERICA',
]);

export class DomesticShippingOnlyError extends Error {
  readonly code = 'DOMESTIC_SHIPPING_ONLY';
  readonly statusCode = 422;

  constructor() {
    super(DOMESTIC_SHIPPING_ONLY_MESSAGE);
  }
}

export function normalizeCountry(value: unknown): 'US' | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase();
  return acceptedUnitedStatesNames.has(normalized) ? 'US' : null;
}

export function validateDomesticShipment(
  sender: ShippingAddress,
  recipient: ShippingAddress,
): { sender: ShippingAddress; recipient: ShippingAddress } {
  const senderCountry = normalizeCountry(sender.country);
  const recipientCountry = normalizeCountry(recipient.country);
  if (!senderCountry || !recipientCountry) throw new DomesticShippingOnlyError();
  return {
    sender: { ...sender, country: senderCountry },
    recipient: { ...recipient, country: recipientCountry },
  };
}
