import type { PricingQuoteInput } from '../services/pricingService.js';
import { parseCreateLabelRequest } from './createLabel.js';
import { RequestValidationError } from './createLabel.js';

export const parsePricingQuoteInput = (value: unknown): PricingQuoteInput => {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const parsed = parseCreateLabelRequest({
    ...input,
    reference: `ShipDime-${typeof input.selectionId === 'string' ? input.selectionId : ''}`,
  });
  if (input.bookService !== undefined && input.bookService !== 'best' && input.bookService !== 'selected')
    throw new RequestValidationError('bookService', 'Must be best or selected.');
  return {
    selectionId: parsed.selectionId,
    labelTypeId: parsed.labelTypeId,
    shipmentCategory: parsed.shipmentCategory,
    ...(parsed.shipmentCategory === 'book' ? { bookService: (input.bookService ?? 'best') as 'best' | 'selected' } : {}),
    weight: parsed.weight,
    length: parsed.length,
    width: parsed.width,
    height: parsed.height,
    sender: parsed.sender,
    recipient: parsed.recipient,
  };
};
