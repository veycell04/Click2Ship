import { BackendClientError } from '../services/click2ShipBackendClient';
import type { PricingRequirement } from './pricingRequirements';

const fieldMap: Record<
  string,
  Pick<PricingRequirement, 'key' | 'label' | 'section'>
> = {
  'sender.zip': { key: 'sender.zipCode', label: 'Sender ZIP', section: 'sender' },
  'recipient.zip': { key: 'recipient.zipCode', label: 'Recipient ZIP', section: 'recipient' },
  weight: { key: 'package.weight', label: 'Package weight', section: 'package' },
  length: { key: 'package.length', label: 'Package length', section: 'package' },
  width: { key: 'package.width', label: 'Package width', section: 'package' },
  height: { key: 'package.height', label: 'Package height', section: 'package' },
  labelTypeId: { key: 'service.labelType', label: 'Label type', section: 'service' },
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

function errorBody(error: BackendClientError): Record<string, unknown> | null {
  const parsed = asRecord(error.parsedData);
  if (parsed) return parsed;
  try {
    return asRecord(JSON.parse(error.responseBody));
  } catch {
    return null;
  }
}

export function mapBackendPricingFieldErrors(error: unknown): PricingRequirement[] {
  if (!(error instanceof BackendClientError)) return [];
  const body = errorBody(error);
  const fieldErrors = asRecord(body?.fieldErrors);
  if (!fieldErrors) return [];

  return Object.entries(fieldErrors).flatMap(([backendKey, value]) => {
    const mapped = fieldMap[backendKey];
    const message =
      typeof value === 'string'
        ? value
        : Array.isArray(value) && typeof value[0] === 'string'
          ? value[0]
          : '';
    return mapped && message ? [{ ...mapped, valid: false, message }] : [];
  });
}
