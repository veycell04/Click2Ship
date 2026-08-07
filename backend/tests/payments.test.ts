import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/createApp.js';
import { InMemoryLabelRepository } from '../src/services/labelRepository.js';
import { InMemoryOrderRepository } from '../src/services/orderRepository.js';
import {
  InMemoryPricingQuoteRepository,
  LiveEasyPostPricingService,
} from '../src/services/pricingService.js';
import type { RateProvider } from '../src/services/rateProvider.js';
import type { CreateLabelInput, CreatedLabel, ShippingProvider } from '../src/types/shipping.js';
import type { PaidCheckoutEvent, PaymentProvider } from '../src/types/payments.js';

const address = {
  fullName: 'Test User',
  company: '',
  phone: '',
  address1: '1 Main St',
  address2: '',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  country: 'US',
};
const shipment = {
  selectionId: '123e4567-e89b-42d3-a456-426614174000',
  labelTypeId: 87,
  weight: 2,
  length: 12,
  width: 9,
  height: 1,
  sender: address,
  recipient: address,
  reference: 'Click2Ship-test',
};
const label: CreatedLabel = {
  id: 'label-1',
  trackingNumber: '9400',
  labelTypeId: 87,
  labelTypeName: 'Priority Mail',
  downloadUrl: '/api/shipping/labels/label-1/download',
  reference: 'Click2Ship-test',
  createdAt: '2026-08-06T00:00:00.000Z',
};
class FakeShipping implements ShippingProvider {
  createCount = 0;
  fail = false;
  async getBalance() {
    return { balance: 100, currency: 'USD' };
  }
  async getLabelTypes() {
    return [{ id: 87, name: 'Priority Mail', description: '' }];
  }
  async createLabel(input: CreateLabelInput) {
    void input;
    this.createCount += 1;
    if (this.fail) throw new Error('ShipAir unavailable');
    return label;
  }
  async getLabel() {
    return label;
  }
  async downloadLabel() {
    return { bytes: new Uint8Array([37, 80, 68, 70]), contentType: 'application/pdf' as const };
  }
}
class FakePayment implements PaymentProvider {
  createCount = 0;
  lastAmountCents = 0;
  lastCheckoutInput: Parameters<PaymentProvider['createCheckoutSession']>[0] | null = null;
  event: PaidCheckoutEvent = {
    type: 'checkout.session.completed',
    sessionId: 'cs_test_1',
    paymentStatus: 'paid',
    paymentIntentId: 'pi_test_1',
    metadata: {},
  };
  async createCheckoutSession(input: Parameters<PaymentProvider['createCheckoutSession']>[0]) {
    this.createCount += 1;
    this.lastAmountCents = input.amountCents;
    this.lastCheckoutInput = input;
    this.event.metadata = { orderId: input.orderId, quoteId: input.quoteId, selectionId: shipment.selectionId };
    return { id: 'cs_test_1', url: 'https://checkout.stripe.com/test' };
  }
  verifyWebhook(_body: Buffer, signature: string) {
    if (signature !== 'valid') throw new Error('invalid signature');
    return this.event;
  }
}
const config = {
  shipAirBaseUrl: 'https://shipair.test',
  shipAirApiKey: 'key',
  extensionId: 'extension-id',
  nodeEnv: 'test',
  port: 3001,
  stripeSecretKey: 'sk_test',
  stripeWebhookSecret: 'whsec_test',
  publicBaseUrl: 'http://127.0.0.1:3001',
  checkoutSuccessUrl: 'http://127.0.0.1:3001/payment/success',
  checkoutCancelUrl: 'http://127.0.0.1:3001/payment/cancel',
  easyPostApiKey: 'EZTKtest',
  discountPercent: 20,
  databaseUrl: '',
};

const setup = async () => {
  const shipping = new FakeShipping();
  const payment = new FakePayment();
  const orders = new InMemoryOrderRepository();
  const quoteRepository = new InMemoryPricingQuoteRepository();
  const app = await buildApp(
    config,
    shipping,
    new InMemoryLabelRepository(),
    payment,
    orders,
    new LiveEasyPostPricingService(
      { getRates: async () => [{ providerShipmentId: 'shp_1', providerRateId: 'rate_1', carrier: 'USPS', serviceCode: 'Priority', serviceName: 'Priority', retailPriceCents: 990, deliveryDays: 2, deliveryDate: null, guaranteed: false }] } satisfies RateProvider,
      quoteRepository,
    ),
  );
  return { app, shipping, payment, orders, quoteRepository };
};

const quotePayload = (override: Record<string, unknown> = {}) => ({
  selectionId: shipment.selectionId,
  labelTypeId: 87,
  weight: 2,
  length: 12,
  width: 9,
  height: 1,
  sender: shipment.sender,
  recipient: shipment.recipient,
  ...override,
});

const createQuote = async (app: Awaited<ReturnType<typeof setup>>['app']) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/pricing/quote',
    payload: quotePayload(),
  });
  expect(response.statusCode).toBe(200);
  return response.json().quote as { quoteId: string };
};

describe('payment checkout and fulfillment', () => {
  it('returns a package-correlated pricing quote', async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/pricing/quote',
      payload: quotePayload({ amountCents: 1 }),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      quote: {
        referencePriceCents: 990,
        customerPriceCents: 792,
        customerDisplayAmount: '$7.92',
        savingsPercent: 20,
      },
    });
    expect(new Date(response.json().quote.expiresAt).getTime()).toBeGreaterThan(Date.now());
    await app.close();
  });

  it.each([
    ['weight', { weight: 1 }],
    ['length', { length: 0 }],
    ['sender.zip', { sender: { ...shipment.sender, zip: '' } }],
  ])('returns 422 for invalid pricing field %s', async (field, override) => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/pricing/quote',
      payload: quotePayload(override),
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().fieldErrors).toHaveProperty(field);
    await app.close();
  });

  it('calculates the backend price and ignores extension amount overrides', async () => {
    const { app, payment } = await setup();
    const quote = await createQuote(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId: quote.quoteId, amountCents: 1 },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().price).toMatchObject({ customerPriceCents: 792 });
    expect(payment.lastAmountCents).toBe(792);
    expect(payment.lastCheckoutInput).toMatchObject({
      quoteId: quote.quoteId,
      selectionId: shipment.selectionId,
      serviceName: 'USPS Priority Mail',
      currency: 'usd',
    });
    await app.close();
  });

  it('rejects an expired stored quote', async () => {
    const { app, quoteRepository } = await setup();
    const quote = await createQuote(app);
    const stored = await quoteRepository.findById(quote.quoteId);
    if (!stored) throw new Error('Expected stored quote.');
    await quoteRepository.save({ ...stored, expiresAt: '2020-01-01T00:00:00.000Z' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId: quote.quoteId },
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().message).toContain('expired');
    await app.close();
  });

  it('reuses one Checkout Session for duplicate clicks', async () => {
    const { app, payment } = await setup();
    const quote = await createQuote(app);
    const payload = { quoteId: quote.quoteId };
    const first = await app.inject({ method: 'POST', url: '/api/payments/checkout', payload });
    const second = await app.inject({ method: 'POST', url: '/api/payments/checkout', payload });
    expect(second.json().checkoutSessionId).toBe(first.json().checkoutSessionId);
    expect(payment.createCount).toBe(1);
    await app.close();
  });

  it('rejects an invalid Stripe signature', async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'invalid', 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('does not create a label for an unpaid Checkout Session', async () => {
    const { app, payment, shipping } = await setup();
    const quote = await createQuote(app);
    await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId: quote.quoteId },
    });
    payment.event.paymentStatus = 'unpaid';
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'valid', 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(shipping.createCount).toBe(0);
    await app.close();
  });

  it('does not fulfill from payment success or cancel redirects', async () => {
    const { app, shipping } = await setup();
    expect((await app.inject({ method: 'GET', url: '/payment/success' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/payment/cancel' })).statusCode).toBe(200);
    expect(shipping.createCount).toBe(0);
    await app.close();
  });

  it('creates one label for paid and duplicate webhooks', async () => {
    const { app, payment, shipping } = await setup();
    const quote = await createQuote(app);
    const checkout = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId: quote.quoteId },
    });
    const orderId = checkout.json().orderId;
    payment.event.paymentStatus = 'paid';
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'valid', 'content-type': 'application/json' },
      payload: '{}',
    });
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'valid', 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(shipping.createCount).toBe(1);
    const status = await app.inject({ method: 'GET', url: `/api/orders/${orderId}/status` });
    expect(status.json().order).toMatchObject({ status: 'label_created', trackingNumber: '9400' });
    await app.close();
  });

  it('preserves payment and marks label_failed when ShipAir fails', async () => {
    const { app, payment, shipping } = await setup();
    const quote = await createQuote(app);
    const checkout = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId: quote.quoteId },
    });
    shipping.fail = true;
    payment.event.paymentStatus = 'paid';
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'valid', 'content-type': 'application/json' },
      payload: '{}',
    });
    const status = await app.inject({
      method: 'GET',
      url: `/api/orders/${checkout.json().orderId}/status`,
    });
    expect(status.json().order.status).toBe('label_failed');
    expect(payment.createCount).toBe(1);
    const duplicateWebhook = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'valid', 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(duplicateWebhook.statusCode).toBe(200);
    expect(shipping.createCount).toBe(1);
    const repeatedCheckout = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId: quote.quoteId },
    });
    expect(repeatedCheckout.json()).toMatchObject({ status: 'label_failed' });
    expect(payment.createCount).toBe(1);
    await app.close();
  });
});
