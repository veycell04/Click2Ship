import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/createApp.js';
import { parseCreateLabelRequest } from '../src/schemas/createLabel.js';
import {
  DOMESTIC_SHIPPING_ONLY_MESSAGE,
  DOMESTIC_SHIPPING_ONLY_RESPONSE,
  normalizeCountry,
  validateDomesticShipment,
} from '../src/services/domesticShipping.js';
import { InMemoryLabelRepository } from '../src/services/labelRepository.js';
import { InMemoryOrderRepository } from '../src/services/orderRepository.js';
import {
  InMemoryPricingQuoteRepository,
  LiveEasyPostPricingService,
} from '../src/services/pricingService.js';
import type { RateProvider } from '../src/services/rateProvider.js';
import type { CheckoutSessionState, PaidCheckoutEvent, PaymentProvider } from '../src/types/payments.js';
import type { CreateLabelInput, CreatedLabel, LabelProvider, ShippingAddress } from '../src/types/shipping.js';

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
  shipDimeDiscountPercent: 20,
  databaseUrl: '',
};

const address = (country: string): ShippingAddress => ({
  fullName: 'Test User',
  company: '',
  phone: '',
  address1: '1 Main St',
  address2: '',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  country,
});

const shipment = (senderCountry: string, recipientCountry: string): CreateLabelInput => ({
  selectionId: crypto.randomUUID(),
  labelTypeId: 87,
  weight: 2,
  length: 12,
  width: 9,
  height: 1,
  sender: address(senderCountry),
  recipient: address(recipientCountry),
  reference: 'ShipDime-domestic-test',
});

const label: CreatedLabel = {
  id: 'label-1',
  trackingNumber: '9400',
  labelTypeId: 87,
  labelTypeName: 'USPS Priority Mail',
  downloadUrl: '/api/shipping/labels/label-1/download',
  reference: 'ShipDime-domestic-test',
  createdAt: '2026-08-22T00:00:00.000Z',
};

class CountingShippingProvider implements LabelProvider {
  createCount = 0;
  async getBalance() { return { balance: 100, currency: 'USD' }; }
  async getLabelTypes() { return [{ id: 87, name: 'USPS Priority Mail', description: '' }]; }
  async createLabel() { this.createCount += 1; return label; }
  async getLabel() { return label; }
  async downloadLabel() {
    return { bytes: new Uint8Array([37, 80, 68, 70]), contentType: 'application/pdf' as const };
  }
}

class CountingPaymentProvider implements PaymentProvider {
  createCount = 0;
  event: PaidCheckoutEvent = {
    type: 'checkout.session.completed',
    sessionId: 'cs_test',
    paymentStatus: 'paid',
    paymentIntentId: 'pi_test',
    metadata: {},
  };
  async createCheckoutSession(
    input: Parameters<PaymentProvider['createCheckoutSession']>[0],
  ) {
    this.createCount += 1;
    this.event.metadata = {
      orderId: input.orderId,
      quoteId: input.quoteId,
      selectionId: input.selectionId,
    };
    return { id: 'cs_test', url: 'https://checkout.stripe.com/test' };
  }
  async getCheckoutSession(): Promise<CheckoutSessionState | null> { return null; }
  verifyWebhook(): PaidCheckoutEvent { return this.event; }
}

describe('U.S. domestic shipping enforcement', () => {
  it.each([
    ['US', 'US'],
    ['us', 'US'],
    ['USA', 'United States'],
    ['United States', 'US'],
  ])('allows and normalizes %s to %s', (senderCountry, recipientCountry) => {
    const normalized = validateDomesticShipment(
      address(senderCountry),
      address(recipientCountry),
    );
    expect(normalized.sender.country).toBe('US');
    expect(normalized.recipient.country).toBe('US');
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(normalizeCountry('  united states of america  ')).toBe('US');
  });

  it('preserves the existing US default when country fields are omitted', () => {
    const input = shipment('US', 'US') as unknown as Record<string, unknown>;
    const sender = { ...(input.sender as Record<string, unknown>) };
    const recipient = { ...(input.recipient as Record<string, unknown>) };
    delete sender.country;
    delete recipient.country;
    const parsed = parseCreateLabelRequest({ ...input, sender, recipient });
    expect(parsed.sender.country).toBe('US');
    expect(parsed.recipient.country).toBe('US');
  });

  it.each([
    ['US', 'China'],
    ['US', 'CA'],
    ['US', 'Canada'],
    ['China', 'US'],
    ['Canada', 'Mexico'],
  ])('blocks %s to %s', (senderCountry, recipientCountry) => {
    expect(() =>
      validateDomesticShipment(address(senderCountry), address(recipientCountry)),
    ).toThrow(DOMESTIC_SHIPPING_ONLY_MESSAGE);
  });

  it('blocks international pricing before calling the rate provider', async () => {
    let rateCalls = 0;
    const shipping = new CountingShippingProvider();
    const pricingRepository = new InMemoryPricingQuoteRepository();
    const pricingService = new LiveEasyPostPricingService(
      {
        getRates: async () => {
          rateCalls += 1;
          return [];
        },
      } satisfies RateProvider,
      pricingRepository,
      20,
    );
    const app = await buildApp(
      config,
      shipping,
      new InMemoryLabelRepository(),
      undefined,
      undefined,
      pricingService,
    );
    const input = shipment('US', 'China');
    const response = await app.inject({
      method: 'POST',
      url: '/api/pricing/quote',
      payload: input,
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual(DOMESTIC_SHIPPING_ONLY_RESPONSE);
    expect(rateCalls).toBe(0);
    await app.close();
  }, 15_000);

  it('blocks an international label request before purchasing postage', async () => {
    const shipping = new CountingShippingProvider();
    const app = await buildApp(config, shipping, new InMemoryLabelRepository());
    const response = await app.inject({
      method: 'POST',
      url: '/api/shipping/labels',
      payload: shipment('China', 'US'),
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual(DOMESTIC_SHIPPING_ONLY_RESPONSE);
    expect(shipping.createCount).toBe(0);
    await app.close();
  });

  it('revalidates a stored quote before initiating Stripe Checkout', async () => {
    const shipping = new CountingShippingProvider();
    const payment = new CountingPaymentProvider();
    const orders = new InMemoryOrderRepository();
    const pricingRepository = new InMemoryPricingQuoteRepository();
    const pricingService = new LiveEasyPostPricingService(
      {
        getRates: async () => [
          {
            providerShipmentId: 'shp_1',
            providerRateId: 'rate_1',
            carrier: 'USPS',
            providerCarrier: 'USPS',
            serviceCode: 'Priority',
            serviceName: 'USPS Priority Mail',
            rateCents: 1000,
            currency: 'USD',
            deliveryDays: 2,
            deliveryDate: null,
            guaranteed: false,
          },
        ],
      } satisfies RateProvider,
      pricingRepository,
      20,
    );
    const app = await buildApp(
      config,
      shipping,
      new InMemoryLabelRepository(),
      payment,
      orders,
      pricingService,
    );
    const quoteResponse = await app.inject({
      method: 'POST',
      url: '/api/pricing/quote',
      payload: shipment('US', 'US'),
    });
    const quoteId = quoteResponse.json().quote.quoteId as string;
    const stored = await pricingRepository.findById(quoteId);
    if (!stored) throw new Error('Expected stored quote.');
    await pricingRepository.save({
      ...stored,
      shipmentSnapshot: {
        ...stored.shipmentSnapshot,
        recipient: { ...stored.shipmentSnapshot.recipient, country: 'Canada' },
      },
    });

    const checkout = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId },
    });
    expect(checkout.statusCode).toBe(422);
    expect(checkout.json()).toEqual(DOMESTIC_SHIPPING_ONLY_RESPONSE);
    expect(payment.createCount).toBe(0);
    expect(shipping.createCount).toBe(0);

    await pricingRepository.save(stored);
    const validCheckout = await app.inject({
      method: 'POST',
      url: '/api/payments/checkout',
      payload: { quoteId },
    });
    expect(validCheckout.statusCode).toBe(200);
    const order = await orders.findById(validCheckout.json().orderId as string);
    if (!order) throw new Error('Expected Checkout order.');
    order.shipmentSnapshot.recipient.country = 'Canada';
    const webhook = await app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      headers: { 'stripe-signature': 'valid', 'content-type': 'application/json' },
      payload: '{}',
    });
    expect(webhook.statusCode).toBe(200);
    expect(shipping.createCount).toBe(0);
    await app.close();
  });
});
