import type { PricingQuoteInput } from '../services/pricingService.js';
import { parseCreateLabelRequest } from './createLabel.js';

export const parsePricingQuoteInput = (value: unknown): PricingQuoteInput => {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const parsed = parseCreateLabelRequest({
    ...input,
    reference: `Click2Ship-${typeof input.selectionId === 'string' ? input.selectionId : ''}`,
  });
  return {
    selectionId: parsed.selectionId,
    labelTypeId: parsed.labelTypeId,
    weight: parsed.weight,
    length: parsed.length,
    width: parsed.width,
    height: parsed.height,
    sender: parsed.sender,
    recipient: parsed.recipient,
  };
};
