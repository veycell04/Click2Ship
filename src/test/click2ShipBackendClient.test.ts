import { describe, expect, it, vi } from 'vitest';
import { emptyAddress } from '../domain/models';
import type { BackendRequestMessage, BackendResponse } from '../messaging/backendMessages';
import {
  BackendClientError,
  Click2ShipBackendClient,
  type RuntimeMessenger,
} from '../services/click2ShipBackendClient';

const parcel = {
  weight: '2',
  length: '12',
  width: '10',
  height: '6',
  preset: 'medium-box' as const,
};
const messenger = (
  implementation: (message: BackendRequestMessage) => Promise<BackendResponse<unknown>>,
) => implementation as RuntimeMessenger;

describe('Click2ShipBackendClient messaging', () => {
  it('sends health and GET_LABEL_TYPES sequentially', async () => {
    const messages: BackendRequestMessage[] = [];
    const client = new Click2ShipBackendClient(
      messenger(async (message) => {
        messages.push(message);
        return message.type === 'BACKEND_HEALTH'
          ? { success: true, status: 200, data: { status: 'ok' } }
          : {
              success: true,
              status: 200,
              data: {
                success: true,
                labelTypes: [{ id: 87, name: 'Priority Mail 9201', description: '' }],
              },
            };
      }),
      'http://test',
    );

    const diagnostic = await client.testConnection();

    expect(messages.map(({ type }) => type)).toEqual(['BACKEND_HEALTH', 'GET_LABEL_TYPES']);
    expect(diagnostic).toMatchObject({
      healthHttpStatus: 200,
      labelTypesHttpStatus: 200,
      backgroundFetchStatus: 200,
      parsedLabelTypes: [{ id: 87, name: 'Priority Mail 9201', description: '' }],
      error: '',
    });
  });

  it('loads normalized label types from the background response', async () => {
    const send = vi.fn(async () => ({
      success: true,
      status: 200,
      data: { labelTypes: [{ id: 1, name: 'Ground', description: '' }] },
    }));
    const client = new Click2ShipBackendClient(messenger(send), 'http://test');
    await expect(client.getLabelTypes()).resolves.toEqual([
      { id: 1, name: 'Ground', description: '' },
    ]);
    expect(send).toHaveBeenCalledWith({ type: 'GET_LABEL_TYPES' });
  });

  it('requests pricing for the current numeric package values', async () => {
    const send = vi.fn(async () => ({
      success: true,
      status: 200,
      data: {
        success: true,
        quote: {
          quoteId: 'quote-1',
          carrier: 'USPS',
          serviceCode: 'Priority',
          serviceName: 'USPS Priority Mail',
          easyPostShipmentId: 'shp_1',
          easyPostRateId: 'rate_1',
          shipAirLabelTypeId: 87,
          referencePriceType: 'EASYPOST_USPS_RETAIL',
          referencePriceCents: 990,
          referenceDisplayAmount: '$9.90',
          customerPriceCents: 792,
          customerDisplayAmount: '$7.92',
          savingsCents: 198,
          savingsDisplayAmount: '$1.98',
          savingsPercent: 20,
          currency: 'usd',
          pricingMode: 'live',
          deliveryDays: 2,
          expiresAt: '2026-08-06T12:10:00.000Z',
        },
      },
    }));
    const client = new Click2ShipBackendClient(messenger(send), 'http://test');

    await expect(
      client.getPricingQuote(
        '123e4567-e89b-42d3-a456-426614174000',
        '87',
        { ...emptyAddress(), country: 'US', state: 'IL', zipCode: '60101' },
        { ...emptyAddress(), country: 'US', state: 'NY', zipCode: '10453' },
        parcel,
      ),
    ).resolves.toMatchObject({ customerPriceCents: 792 });
    expect(send).toHaveBeenCalledWith({
      type: 'GET_PRICING_QUOTE',
      payload: expect.objectContaining({
        selectionId: '123e4567-e89b-42d3-a456-426614174000',
        labelTypeId: 87,
        weight: 2,
        length: 12,
        width: 10,
        height: 6,
        sender: expect.objectContaining({ zip: '60101' }),
        recipient: expect.objectContaining({ zip: '10453' }),
      }),
    });
  });

  it.each([404, 0])('allows a pricing retry after status %s', async (failureStatus) => {
    let attempts = 0;
    const client = new Click2ShipBackendClient(
      messenger(async () => {
        attempts += 1;
        if (attempts === 1) {
          return {
            success: false,
            status: failureStatus,
            error: failureStatus === 404 ? 'Not found' : 'Failed to fetch',
          };
        }
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            quote: {
              quoteId: 'quote-1',
              carrier: 'USPS',
              serviceCode: 'Priority',
              serviceName: 'USPS Priority Mail',
              easyPostShipmentId: 'shp_1',
              easyPostRateId: 'rate_1',
              shipAirLabelTypeId: 87,
              referencePriceType: 'EASYPOST_USPS_RETAIL',
              referencePriceCents: 990,
              referenceDisplayAmount: '$9.90',
              customerPriceCents: 792,
              customerDisplayAmount: '$7.92',
              savingsCents: 198,
              savingsDisplayAmount: '$1.98',
              savingsPercent: 20,
              currency: 'usd',
              pricingMode: 'live',
              deliveryDays: 2,
              expiresAt: '2026-08-06T12:10:00.000Z',
            },
          },
        };
      }),
      'http://test',
    );
    const args = [
      '123e4567-e89b-42d3-a456-426614174000',
      '87',
      { ...emptyAddress(), country: 'US', state: 'IL', zipCode: '60101' },
      { ...emptyAddress(), country: 'US', state: 'NY', zipCode: '10453' },
      parcel,
    ] as const;

    await expect(client.getPricingQuote(...args)).rejects.toMatchObject({
      status: failureStatus,
    });
    await expect(client.getPricingQuote(...args)).resolves.toMatchObject({
      customerPriceCents: 792,
    });
  });

  it('reports an unavailable backend with status 0', async () => {
    const client = new Click2ShipBackendClient(
      messenger(async () => ({ success: false, status: 0, error: 'Failed to fetch' })),
      'http://test',
    );
    await expect(client.getLabelTypes()).rejects.toMatchObject({
      status: 0,
      requestedUrl: 'http://test/api/shipping/label-types',
    });
  });

  it('returns the normalized success label', async () => {
    const label = {
      id: '1',
      trackingNumber: '9400',
      labelTypeId: 87,
      labelTypeName: 'USPS APIs Priority Mail 9201',
      downloadUrl: '/api/shipping/labels/1/download',
      reference: 'Click2Ship-selection',
      createdAt: 'now',
    };
    const client = new Click2ShipBackendClient(
      messenger(async () => ({ success: true, status: 200, data: { success: true, label } })),
      'http://test',
    );
    await expect(
      client.createLabel('selection', 1, emptyAddress(), emptyAddress(), parcel),
    ).resolves.toEqual(label);
  });

  it('converts label type "87" and parcel values to finite numbers', async () => {
    const captured: BackendRequestMessage[] = [];
    const label = {
      id: '1',
      trackingNumber: '9400',
      labelTypeId: 87,
      labelTypeName: 'USPS APIs Priority Mail 9201',
      downloadUrl: '/api/shipping/labels/1/download',
      reference: 'Click2Ship-selection',
      createdAt: 'now',
    };
    const client = new Click2ShipBackendClient(
      messenger(async (message) => {
        captured.push(message);
        return { success: true, status: 200, data: { success: true, label } };
      }),
      'http://test',
    );
    await client.createLabel('selection', '87', emptyAddress(), emptyAddress(), parcel);
    expect(captured[0]).toMatchObject({
      type: 'CREATE_LABEL',
      payload: { labelTypeId: 87, weight: 2, length: 12, width: 10, height: 6 },
    });
    const createMessage = captured[0];
    expect(createMessage?.type).toBe('CREATE_LABEL');
    if (createMessage?.type !== 'CREATE_LABEL') throw new Error('Expected CREATE_LABEL message.');
    expect(typeof createMessage.payload.labelTypeId).toBe('number');
    expect(createMessage.payload.labelTypeId).toBe(87);
  });

  it.each(['', 'not-a-number'])('rejects invalid label type %j before messaging', async (value) => {
    const send = vi.fn();
    const client = new Click2ShipBackendClient(messenger(send), 'http://test');
    await expect(
      client.createLabel('selection', value, emptyAddress(), emptyAddress(), parcel),
    ).rejects.toMatchObject({ code: 'INVALID_LABEL_TYPE', message: 'Select a label type.' });
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects invalid parcel numeric values before messaging', async () => {
    const send = vi.fn();
    const client = new Click2ShipBackendClient(messenger(send), 'http://test');
    await expect(
      client.createLabel('selection', '87', emptyAddress(), emptyAddress(), {
        ...parcel,
        length: 'not-a-number',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_NUMERIC_VALUE' });
    expect(send).not.toHaveBeenCalled();
  });

  it('preserves backend status and response text', async () => {
    const responseBody = JSON.stringify({ error: { message: 'Check the address.' } });
    const client = new Click2ShipBackendClient(
      messenger(async () => ({
        success: false,
        status: 422,
        error: 'Backend returned 422',
        responseBody,
      })),
      'http://test',
    );
    await expect(client.getLabelTypes()).rejects.toEqual(
      expect.objectContaining<Partial<BackendClientError>>({
        status: 422,
        message: 'Backend returned 422',
        responseBody,
      }),
    );
  });

  it('coalesces rapid repeated create requests for one selection', async () => {
    const label = {
      id: '1',
      trackingNumber: '9400',
      labelTypeId: 87,
      labelTypeName: 'Priority Mail',
      downloadUrl: '/api/shipping/labels/1/download',
      reference: 'Click2Ship-selection',
      createdAt: 'now',
    };
    const send = vi.fn(async () => ({
      success: true,
      status: 200,
      data: { success: true, label },
    }));
    const client = new Click2ShipBackendClient(messenger(send), 'http://test');

    const [first, second] = await Promise.all([
      client.createLabel('selection', 87, emptyAddress(), emptyAddress(), parcel),
      client.createLabel('selection', 87, emptyAddress(), emptyAddress(), parcel),
    ]);

    expect(first).toEqual(label);
    expect(second).toEqual(label);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('recovers an interrupted create response by selection without recreating', async () => {
    const label = {
      id: '1',
      trackingNumber: '9400',
      labelTypeId: 87,
      labelTypeName: 'Priority Mail',
      downloadUrl: '/api/shipping/labels/1/download',
      reference: 'Click2Ship-selection',
      createdAt: 'now',
    };
    const messages: BackendRequestMessage[] = [];
    const client = new Click2ShipBackendClient(
      messenger(async (message) => {
        messages.push(message);
        return message.type === 'CREATE_LABEL'
          ? { success: false, status: 0, error: 'Connection interrupted' }
          : { success: true, status: 200, data: { success: true, label } };
      }),
      'http://test',
    );

    await expect(
      client.createLabel('selection', 87, emptyAddress(), emptyAddress(), parcel),
    ).resolves.toEqual(label);
    expect(messages.map((message) => message.type)).toEqual([
      'CREATE_LABEL',
      'GET_LABEL_BY_SELECTION',
    ]);
  });

  it('creates Checkout without allowing a client-controlled amount', async () => {
    const messages: BackendRequestMessage[] = [];
    const client = new Click2ShipBackendClient(
      messenger(async (message) => {
        messages.push(message);
        return {
          success: true,
          status: 200,
          data: {
            success: true,
            orderId: 'order-1',
            checkoutSessionId: 'cs_test_1',
            checkoutUrl: 'https://checkout.stripe.com/test',
          },
        };
      }),
      'http://test',
    );
    await client.createCheckout('quote-1');
    const message = messages[0];
    expect(message?.type).toBe('CREATE_CHECKOUT');
    if (message?.type !== 'CREATE_CHECKOUT') throw new Error('Expected CREATE_CHECKOUT.');
    expect(message).toEqual({ type: 'CREATE_CHECKOUT', quoteId: 'quote-1' });
  });

  it('reads label_created from the order status endpoint', async () => {
    const order = {
      id: 'order-1',
      status: 'label_created' as const,
      amountCents: 792,
      currency: 'usd',
      trackingNumber: '9400',
      labelId: 'label-1',
      downloadUrl: '/api/shipping/labels/label-1/download',
      errorMessage: '',
      label: null,
    };
    const client = new Click2ShipBackendClient(
      messenger(async () => ({ success: true, status: 200, data: { success: true, order } })),
      'http://test',
    );
    await expect(client.getOrderStatus('order-1')).resolves.toEqual(order);
  });
});
