import { describe, expect, it, vi } from 'vitest';
import {
  createShipAirLabelPayload,
  ShipAirShippingProvider,
  ShippingProviderError,
} from '../src/providers/shipAirShippingProvider.js';

const response = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(body instanceof Uint8Array ? body : JSON.stringify(body), {
    status,
    headers: headers ?? { 'Content-Type': 'application/json' },
  });
const validCreateInput = {
  selectionId: '123e4567-e89b-42d3-a456-426614174000',
  labelTypeId: 87,
  weight: 2,
  length: 12,
  width: 9,
  height: 1,
  sender: {
    fullName: 'Sender Name',
    company: '',
    phone: '',
    address1: '1 Main St',
    address2: '',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    country: 'US' as const,
  },
  recipient: {
    fullName: 'Recipient Name',
    company: '',
    phone: '',
    address1: '2 Oak St',
    address2: '',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    country: 'US' as const,
  },
  reference: 'Click2Ship-test',
};

describe('ShipAirShippingProvider', () => {
  it('normalizes a successful ShipAir label response', async () => {
    const fetcher = vi.fn(async () =>
      response({
        data: {
          label_id: 7,
          tracking_number: '9400',
          label_type: 'USPS',
          download_url: '/pdf',
          created_at: 'now',
        },
      }),
    );
    const provider = new ShipAirShippingProvider(
      'https://example.test',
      'secret',
      fetcher as typeof fetch,
    );
    await expect(provider.getLabel('7')).resolves.toEqual({
      id: '7',
      trackingNumber: '9400',
      labelTypeId: 0,
      labelTypeName: 'USPS',
      downloadUrl: '/api/shipping/labels/7/download',
      reference: '',
      createdAt: 'now',
    });
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer secret',
      'User-Agent': 'Click2Ship/0.1',
    });
  });

  it.each([
    [401, 'AUTHENTICATION_FAILED'],
    [403, 'FORBIDDEN'],
    [500, 'SHIPAIR_ERROR'],
    [422, 'SHIPAIR_VALIDATION_ERROR'],
  ])('maps ShipAir %s', async (status, code) => {
    const provider = new ShipAirShippingProvider(
      'https://example.test',
      'secret',
      vi.fn(async () => response({}, status)) as typeof fetch,
    );
    await expect(provider.getLabel('7')).rejects.toMatchObject({ code });
  });

  it('maps Click2Ship fields to the documented flat ShipAir payload', async () => {
    const input = {
      selectionId: '123e4567-e89b-42d3-a456-426614174000',
      labelTypeId: 87,
      weight: 2,
      length: 12,
      width: 9,
      height: 1,
      sender: {
        fullName: 'Sender Name',
        company: '',
        phone: '+1 929-531-4556',
        address1: '1 Main St',
        address2: '',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        country: 'US' as const,
      },
      recipient: {
        fullName: 'Recipient Name',
        company: '',
        phone: '415-851-9136 ext. 74540',
        address1: '2 Oak St',
        address2: '',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        country: 'US' as const,
      },
      reference: 'Click2Ship-test',
    };
    expect(createShipAirLabelPayload(input)).toEqual({
      label_type_id: 87,
      weight: 2,
      length_in: 12,
      width_in: 9,
      height_in: 1,
      from_name: 'Sender Name',
      from_company: '',
      from_phone: '9295314556',
      from_address1: '1 Main St',
      from_address2: '',
      from_city: 'Chicago',
      from_state: 'IL',
      from_zip: '60601',
      from_country: 'US',
      to_name: 'Recipient Name',
      to_company: '',
      to_phone: '4158519136',
      to_address1: '2 Oak St',
      to_address2: '',
      to_city: 'Dallas',
      to_state: 'TX',
      to_zip: '75201',
      to_country: 'US',
      reference: 'Click2Ship-test',
    });
    const payload = createShipAirLabelPayload(input);
    expect(payload.length_in).toBe(12);
    expect(payload.width_in).toBe(9);
    expect(payload.height_in).toBe(1);
    expect(payload.from_country).toBe('US');
    expect(payload.to_country).toBe('US');
  });

  it('serializes top-level dimensions in the actual ShipAir HTTP body', async () => {
    const fetcher = vi.fn(async () =>
      response({
        data: {
          label_id: 7,
          tracking_number: '9400',
          label_type: 'USPS',
          download_url: '/pdf',
          created_at: 'now',
        },
      }),
    );
    const provider = new ShipAirShippingProvider(
      'https://example.test',
      'secret',
      fetcher as typeof fetch,
    );
    await provider.createLabel({
      ...validCreateInput,
      length: 12,
      width: 9,
      height: 6,
    });
    const serializedBody = fetcher.mock.calls[0]?.[1]?.body;
    expect(typeof serializedBody).toBe('string');
    const body = JSON.parse(String(serializedBody)) as Record<string, unknown>;
    expect(body.length_in).toBe(12);
    expect(body.width_in).toBe(9);
    expect(body.height_in).toBe(6);
    expect(body.length).toBeUndefined();
    expect(body.width).toBeUndefined();
    expect(body.height).toBeUndefined();
    expect(body.from_country).toBe('US');
    expect(body.to_country).toBe('US');
    expect(body).not.toHaveProperty('package_length');
    expect(body).not.toHaveProperty('dimensions');
  });

  it.each([
    ['length', 0],
    ['width', -1],
    ['height', Number.NaN],
  ] as const)('rejects invalid %s before calling ShipAir', async (field, value) => {
    expect(() => createShipAirLabelPayload({ ...validCreateInput, [field]: value })).toThrow(
      ShippingProviderError,
    );
  });

  it('preserves and sanitizes a ShipAir 422 response', async () => {
    const provider = new ShipAirShippingProvider(
      'https://example.test',
      'secret',
      vi.fn(async () =>
        response(
          { message: 'Invalid phone', errors: { to_phone: ['Invalid'] }, api_key: 'hidden' },
          422,
        ),
      ) as typeof fetch,
    );
    await expect(provider.getLabel('7')).rejects.toMatchObject({
      code: 'SHIPAIR_VALIDATION_ERROR',
      statusCode: 422,
      shipAirResponse: { message: 'Invalid phone', errors: { to_phone: ['Invalid'] } },
    });
  });

  it.each([
    [{ success: true, data: [{ id: 1, name: 'Ground' }] }],
    [{ data: [{ id: 1, name: 'Ground' }] }],
    [[{ id: 1, name: 'Ground' }]],
  ])('normalizes supported label-type response shapes', async (body) => {
    const provider = new ShipAirShippingProvider(
      'https://example.test/api/v1',
      'secret',
      vi.fn(async () => response(body)) as typeof fetch,
    );
    await expect(provider.getLabelTypes()).resolves.toEqual([
      { id: 1, name: 'Ground', description: '' },
    ]);
  });

  it('rejects an unexpected label-type response shape', async () => {
    const provider = new ShipAirShippingProvider(
      'https://example.test/api/v1',
      'secret',
      vi.fn(async () => response({ success: true, data: { wrong: true } })) as typeof fetch,
    );
    await expect(provider.getLabelTypes()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('marks a submitted label timeout as status unknown', async () => {
    const fetcher = vi.fn(
      async (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const provider = new ShipAirShippingProvider(
      'https://example.test',
      'secret',
      fetcher as typeof fetch,
      5,
    );
    await expect(provider.createLabel(validCreateInput)).rejects.toEqual(
      expect.objectContaining<Partial<ShippingProviderError>>({ code: 'LABEL_STATUS_UNKNOWN' }),
    );
  });
});
