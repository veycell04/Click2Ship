import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { StripeCheckoutPaymentProvider } from '../src/providers/stripeCheckoutPaymentProvider.js';

describe('StripeCheckoutPaymentProvider', () => {
  it('creates a backend-priced payment Session with complete metadata and idempotency', async () => {
    const create = vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/test' }));
    const stripe = {
      checkout: { sessions: { create } },
      webhooks: { constructEvent: vi.fn() },
    } as unknown as Stripe;
    const provider = new StripeCheckoutPaymentProvider('sk_test', 'whsec_test', stripe);
    await expect(provider.createCheckoutSession({
      orderId: 'order-1',
      quoteId: 'quote-1',
      selectionId: 'selection-1',
      serviceName: 'USPS Priority Mail',
      amountCents: 640,
      currency: 'usd',
      successUrl: 'https://example.com/payment/success',
      cancelUrl: 'https://example.com/payment/cancel',
    })).resolves.toEqual({ id: 'cs_test_1', url: 'https://checkout.stripe.com/test' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        metadata: { orderId: 'order-1', quoteId: 'quote-1', selectionId: 'selection-1' },
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 640,
            product_data: { name: 'Click2Ship USPS Priority Mail Label' },
          },
        }],
      }),
      { idempotencyKey: 'click2ship-checkout-quote-1' },
    );
  });
});
