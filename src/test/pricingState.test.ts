import { describe, expect, it } from 'vitest';
import { BackendClientError } from '../services/click2ShipBackendClient';
import {
  createPricingInputKey,
  describePricingError,
  PricingRequestGate,
} from '../sidepanel/pricingState';

describe('pricing error messages', () => {
  it.each([
    [404, 'Pricing endpoint not found'],
    [422, 'Pricing validation failed'],
    [500, 'Backend error'],
    [0, 'Unable to reach backend'],
  ])('maps HTTP status %s', (status, message) => {
    expect(describePricingError(new BackendClientError('TEST', 'failed', status))).toBe(message);
  });

  it('uses the timeout-safe fallback for other failures', () => {
    expect(describePricingError(new Error('Pricing request exceeded 5 seconds.'))).toBe(
      'Unable to load shipping price.',
    );
  });

  it('surfaces the selected-service unavailable message', () => {
    const body = JSON.stringify({
      error: 'SELECTED_SERVICE_UNAVAILABLE',
      message: 'USPS Ground Advantage rate is unavailable for this shipment.',
    });
    expect(
      describePricingError(new BackendClientError('TEST', 'failed', 422, '', body)),
    ).toBe('USPS Ground Advantage rate is unavailable for this shipment.');
  });
});

describe('pricing input identity', () => {
  it('changes when only the selected label type changes and changes back for Priority', () => {
    const base = { weight: '2', length: '12', width: '9', height: '1' };
    const priority = createPricingInputKey({ ...base, labelTypeId: '87' });
    const ground = createPricingInputKey({ ...base, labelTypeId: '78' });
    const priorityAgain = createPricingInputKey({ ...base, labelTypeId: '87' });
    expect(ground).not.toBe(priority);
    expect(priorityAgain).toBe(priority);
  });
});

describe('PricingRequestGate', () => {
  it('rejects an older response after a newer quote begins', () => {
    const gate = new PricingRequestGate();
    const olderRequest = gate.begin();
    const newerRequest = gate.begin();

    expect(gate.isCurrent(newerRequest)).toBe(true);
    expect(gate.isCurrent(olderRequest)).toBe(false);
  });
});
