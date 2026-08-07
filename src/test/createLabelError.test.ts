import { describe, expect, it } from 'vitest';
import { BackendClientError } from '../services/click2ShipBackendClient';
import { describeCreateLabelError } from '../services/createLabelError';

describe('create-label error presentation', () => {
  it('displays local schema field errors and the raw response in development', () => {
    const body = {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Shipment information is invalid.',
      fieldErrors: { labelTypeId: 'Must be a positive integer.' },
    };
    const raw = JSON.stringify(body);
    const described = describeCreateLabelError(
      new BackendClientError(
        'BACKEND_REQUEST_FAILED',
        'Backend returned 422',
        422,
        'http://test/api/shipping/labels',
        raw,
        true,
        false,
        body,
      ),
      true,
    );
    expect(described.message).toContain('Shipment information is invalid.');
    expect(described.message).toContain('labelTypeId');
    expect(described.message).toContain(raw);
    expect(described.diagnostic.httpStatus).toBe(422);
  });
});
