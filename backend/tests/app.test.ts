import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/createApp.js';
import { ShippingProviderError } from '../src/providers/shipAirShippingProvider.js';
import { InMemoryLabelRepository } from '../src/services/labelRepository.js';
import type { CreateLabelInput, CreatedLabel, ShippingProvider } from '../src/types/shipping.js';

const label: CreatedLabel = {
  id: 'label-1',
  trackingNumber: '9400111',
  labelTypeId: 1,
  labelTypeName: 'USPS APIs Priority Mail 9201',
  downloadUrl: '/api/shipping/labels/label-1/download',
  reference: 'test',
  createdAt: '2026-01-01T00:00:00Z',
};
class FakeProvider implements ShippingProvider {
  createCount = 0;
  async getBalance() {
    return { balance: 100, currency: 'USD' };
  }
  async getLabelTypes() {
    return [{ id: 1, name: 'USPS', description: '' }];
  }
  async createLabel(input: CreateLabelInput) {
    void input;
    this.createCount += 1;
    return label;
  }
  async getLabel() {
    return label;
  }
  async downloadLabel() {
    return { bytes: new Uint8Array([37, 80, 68, 70]), contentType: 'application/pdf' as const };
  }
}
const address = {
  fullName: 'Jane Doe',
  company: '',
  phone: '',
  address1: '1 Main St',
  address2: '',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  country: 'US',
};
const body = {
  selectionId: '123e4567-e89b-42d3-a456-426614174000',
  labelTypeId: 1,
  weight: 2,
  length: 12,
  width: 10,
  height: 6,
  sender: address,
  recipient: address,
  reference: 'test',
};
const config = {
  shipAirBaseUrl: '',
  shipAirApiKey: '',
  extensionId: 'extension-id',
  nodeEnv: 'test',
  port: 3001,
  stripeSecretKey: 'sk_test_example',
  stripeWebhookSecret: 'whsec_example',
  publicBaseUrl: 'http://127.0.0.1:3001',
  checkoutSuccessUrl: 'http://127.0.0.1:3001/payment/success',
  checkoutCancelUrl: 'http://127.0.0.1:3001/payment/cancel',
  easyPostApiKey: 'EZTKtest',
  discountPercent: 20,
  databaseUrl: '',
};

describe('Click2Ship backend', () => {
  it('exposes a production status document at the root route', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ name: 'Click2Ship Backend', status: 'running' });
    await app.close();
  });

  it('reports database readiness and returns 503 when the database is unavailable', async () => {
    const connected = await buildApp(
      config,
      new FakeProvider(),
      new InMemoryLabelRepository(),
      undefined,
      undefined,
      undefined,
      async () => undefined,
    );
    const connectedResponse = await connected.inject({ method: 'GET', url: '/api/health' });
    expect(connectedResponse.statusCode).toBe(200);
    expect(connectedResponse.json()).toEqual({ status: 'ok', database: 'connected' });
    await connected.close();

    const unavailable = await buildApp(
      config,
      new FakeProvider(),
      new InMemoryLabelRepository(),
      undefined,
      undefined,
      undefined,
      async () => Promise.reject(new Error('offline')),
    );
    const unavailableResponse = await unavailable.inject({ method: 'GET', url: '/api/health' });
    expect(unavailableResponse.statusCode).toBe(503);
    expect(unavailableResponse.json()).toEqual({ status: 'error', database: 'unavailable' });
    await unavailable.close();
  });

  it('accepts the configured Chrome extension CORS origin and normalizes label types', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    const response = await app.inject({
      method: 'GET',
      url: '/api/shipping/label-types',
      headers: { origin: 'chrome-extension://extension-id' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('chrome-extension://extension-id');
    expect(response.json()).toEqual({
      success: true,
      labelTypes: [{ id: 1, name: 'USPS', description: '' }],
    });
    await app.close();
  });
  it('accepts loopback origins for local browser testing', async () => {
    const developmentApp = await buildApp(
      { ...config, nodeEnv: 'development' },
      new FakeProvider(),
      new InMemoryLabelRepository(),
    );
    const developmentResponse = await developmentApp.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'http://127.0.0.1:3001' },
    });
    expect(developmentResponse.statusCode).toBe(200);
    expect(developmentResponse.headers['access-control-allow-origin']).toBe(
      'http://127.0.0.1:3001',
    );
    await developmentApp.close();
  });

  it('handles extension preflight and reports the received origin', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    const origin = 'chrome-extension://extension-id';
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/api/shipping/label-types',
      headers: {
        origin,
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'content-type,x-click2ship-dev-token',
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(origin);
    expect(preflight.headers['access-control-allow-methods']).toContain('GET');

    const debug = await app.inject({
      method: 'GET',
      url: '/api/debug/origin',
      headers: { origin },
    });
    expect(debug.json()).toEqual({
      receivedOrigin: origin,
      allowedExtensionOrigin: origin,
    });
    await app.close();
  });
  it('validates weight, ZIP, and state', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/shipping/labels',
          payload: { ...body, weight: 1.99 },
        })
      ).statusCode,
    ).toBe(422);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/shipping/labels',
          payload: { ...body, recipient: { ...address, zip: '123' } },
        })
      ).statusCode,
    ).toBe(422);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/shipping/labels',
          payload: { ...body, recipient: { ...address, state: 'XX' } },
        })
      ).statusCode,
    ).toBe(422);
    expect(
      (await app.inject({ method: 'POST', url: '/api/shipping/labels', payload: body })).statusCode,
    ).toBe(200);
    await app.close();
  });

  it('returns readable local field validation errors', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    const response = await app.inject({
      method: 'POST',
      url: '/api/shipping/labels',
      payload: { ...body, labelTypeId: '' },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Shipment information is invalid.',
      fieldErrors: { labelTypeId: 'Must be a positive integer.' },
    });
    await app.close();
  });

  it.each(['US', 'USA', 'United States', 'United States of America'])(
    'normalizes country %s to US',
    async (country) => {
      const provider = new FakeProvider();
      let received: CreateLabelInput | null = null;
      provider.createLabel = async (input) => {
        received = input;
        return label;
      };
      const app = await buildApp(config, provider, new InMemoryLabelRepository());
      const response = await app.inject({
        method: 'POST',
        url: '/api/shipping/labels',
        payload: {
          ...body,
          selectionId: crypto.randomUUID(),
          sender: { ...address, country },
          recipient: { ...address, country },
        },
      });
      expect(response.statusCode).toBe(200);
      expect(received).toMatchObject({
        weight: 2,
        length: 12,
        width: 10,
        height: 6,
        sender: { country: 'US' },
        recipient: { country: 'US' },
      });
      await app.close();
    },
  );

  it('passes a sanitized ShipAir 422 response through', async () => {
    const provider = new FakeProvider();
    provider.createLabel = async () => {
      throw new ShippingProviderError(
        'SHIPAIR_VALIDATION_ERROR',
        'ShipAir rejected the label request.',
        422,
        { message: 'Invalid destination', errors: { to_zip: ['Invalid ZIP'] } },
      );
    };
    const app = await buildApp(config, provider, new InMemoryLabelRepository());
    const response = await app.inject({
      method: 'POST',
      url: '/api/shipping/labels',
      payload: body,
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      success: false,
      error: 'SHIPAIR_VALIDATION_ERROR',
      message: 'ShipAir rejected the label request.',
      shipAirStatus: 422,
      shipAirResponse: {
        message: 'Invalid destination',
        errors: { to_zip: ['Invalid ZIP'] },
      },
    });
    await app.close();
  });

  it('returns the exact ShipAir payload without purchasing a label', async () => {
    const app = await buildApp(
      { ...config, nodeEnv: 'development' },
      new FakeProvider(),
      new InMemoryLabelRepository(),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/debug/shipair-payload',
      payload: {
        ...body,
        selectionId: crypto.randomUUID(),
        labelTypeId: 87,
        weight: 2,
        length: 12,
        width: 9,
        height: 6,
        sender: {
          fullName: 'Test Sender',
          phone: '3125551212',
          address1: '47 W Commercial Ave',
          address2: '',
          city: 'Addison',
          state: 'IL',
          zip: '60101',
          country: 'US',
        },
        recipient: {
          fullName: 'Test Recipient',
          phone: '9295314556',
          address1: '1694 Davidson Ave',
          address2: 'Apt 3C',
          city: 'Bronx',
          state: 'NY',
          zip: '10453',
          country: 'US',
        },
        reference: 'DIMENSION-TEST-001',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      payload: {
        label_type_id: 87,
        weight: 2,
        length_in: 12,
        width_in: 9,
        height_in: 6,
        from_name: 'Test Sender',
        from_address1: '47 W Commercial Ave',
        from_country: 'US',
        to_name: 'Test Recipient',
        to_address1: '1694 Davidson Ave',
        to_country: 'US',
        reference: 'DIMENSION-TEST-001',
      },
    });
    await app.close();
  });

  it('does not create a duplicate for the same selectionId', async () => {
    const provider = new FakeProvider();
    const app = await buildApp(config, provider, new InMemoryLabelRepository());
    await app.inject({ method: 'POST', url: '/api/shipping/labels', payload: body });
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/shipping/labels',
      payload: body,
    });
    expect(duplicate.json()).toEqual({ success: true, label });
    expect(provider.createCount).toBe(1);
    await app.close();
  });

  it('allows only one provider call for simultaneous duplicate requests', async () => {
    const provider = new FakeProvider();
    const app = await buildApp(config, provider, new InMemoryLabelRepository());
    const [first, second] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/shipping/labels', payload: body }),
      app.inject({ method: 'POST', url: '/api/shipping/labels', payload: body }),
    ]);
    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(first.json()).toEqual({ success: true, label });
    expect(second.json()).toEqual({ success: true, label });
    expect(provider.createCount).toBe(1);
    await app.close();
  });

  it('retrieves a completed label by selection id', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    await app.inject({ method: 'POST', url: '/api/shipping/labels', payload: body });
    const response = await app.inject({
      method: 'GET',
      url: `/api/shipping/labels/by-selection/${body.selectionId}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true, label });
    await app.close();
  });

  it('proxies the label PDF', async () => {
    const app = await buildApp(config, new FakeProvider(), new InMemoryLabelRepository());
    const response = await app.inject({
      method: 'GET',
      url: '/api/shipping/labels/label-1/download',
    });
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.rawPayload.subarray(0, 4).toString()).toBe('%PDF');
    await app.close();
  });
});
