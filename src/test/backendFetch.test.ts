import { afterEach, describe, expect, it, vi } from 'vitest';
import { backendFetch, handleBackendRequest } from '../background/backendFetch';

afterEach(() => vi.unstubAllGlobals());

describe('background backend transport', () => {
  it('receives GET_LABEL_TYPES and passes a successful response back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              labelTypes: [{ id: 87, name: 'USPS APIs Priority Mail 9201', description: '' }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    const result = await handleBackendRequest({ type: 'GET_LABEL_TYPES' });
    expect(result).toEqual({
      success: true,
      status: 200,
      data: {
        success: true,
        labelTypes: [{ id: 87, name: 'USPS APIs Priority Mail 9201', description: '' }],
      },
    });
  });

  it('returns status 0 when the backend is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(backendFetch('/api/health')).resolves.toEqual({
      success: false,
      status: 0,
      error: 'Failed to fetch',
    });
  });

  it('posts the current shipment to the pricing quote route', async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, quote: { customerPriceCents: 792 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await handleBackendRequest({
      type: 'GET_PRICING_QUOTE',
      payload: {
        selectionId: '123e4567-e89b-42d3-a456-426614174000',
        labelTypeId: 87,
        weight: 2,
        length: 12,
        width: 9,
        height: 1,
        sender: { fullName: 'Sender', company: '', phone: '', address1: '1 Main St', address2: '', city: 'Chicago', state: 'IL', zip: '60101', country: 'US' },
        recipient: { fullName: 'Recipient', company: '', phone: '', address1: '2 Main St', address2: '', city: 'Bronx', state: 'NY', zip: '10453', country: 'US' },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/pricing/quote',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it.each([401, 422, 500])('preserves backend HTTP %s and response body', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(`failure-${status}`, { status })),
    );
    await expect(backendFetch('/api/shipping/label-types')).resolves.toEqual({
      success: false,
      status,
      error: `Backend returned ${status}`,
      responseBody: `failure-${status}`,
      data: `failure-${status}`,
    });
  });
});
