import { RequestValidationError } from './createLabel.js';
import { DomesticShippingOnlyError, normalizeCountry } from '../services/domesticShipping.js';
import type { PricingQuoteInput } from '../services/pricingService.js';

export function parsePublicRateInput(value: unknown): { input: PricingQuoteInput; service: 'best' | 'ground' | 'priority' } {
  const body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  for (const key of ['originCountry', 'destinationCountry']) {
    if (!normalizeCountry(body[key] ?? 'US')) throw new DomesticShippingOnlyError();
  }
  const zip = (key: string) => {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (!/^\d{5}(?:-\d{4})?$/.test(value)) throw new RequestValidationError(key, 'Enter a valid U.S. ZIP code.');
    return value;
  };
  const number = (key: string, min: number, max = Infinity) => {
    const value = body[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
      throw new RequestValidationError(key, 'Invalid package measurement.');
    return value;
  };
  const service = body.service ?? 'best';
  if (service !== 'best' && service !== 'ground' && service !== 'priority') throw new RequestValidationError('service', 'Unsupported service.');
  const shipmentCategory = body.shipmentCategory ?? 'standard';
  if (shipmentCategory !== 'standard' && shipmentCategory !== 'book') throw new RequestValidationError('shipmentCategory', 'Unsupported category.');
  // Deliberately omit address details, rather than inventing a street or city.
  const address = (zip: string) => ({ fullName: '', address1: '', city: '', state: '', zip, country: 'US' });
  return { service, input: {
    selectionId: crypto.randomUUID(), labelTypeId: service === 'priority' ? 87 : 120,
    shipmentCategory, ...(shipmentCategory === 'book' ? { bookService: service === 'best' ? 'best' : 'selected' } : {}),
    sender: address(zip('originZip')), recipient: address(zip('destinationZip')),
    weight: number('weight', 0.1, 70), length: number('length', Number.MIN_VALUE),
    width: number('width', Number.MIN_VALUE), height: number('height', Number.MIN_VALUE),
  } };
}
