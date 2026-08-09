import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import { StripeCheckoutPaymentProvider } from '../src/providers/stripeCheckoutPaymentProvider.js';

describe('StripeCheckoutPaymentProvider', () => {
  it('creates a backend-priced payment Session with complete metadata and idempotency', async () => {
    const create = vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/test' }));
    const retrieve = vi.fn();
    const stripe = {
      checkout: { sessions: { create, retrieve } },
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
      successUrl: 'https://click2-ship.vercel.app/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://click2-ship.vercel.app/payment/cancel',
    })).resolves.toEqual({ id: 'cs_test_1', url: 'https://checkout.stripe.com/test' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        success_url: 'https://click2-ship.vercel.app/payment/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://click2-ship.vercel.app/payment/cancel',
        metadata: { orderId: 'order-1', quoteId: 'quote-1', selectionId: 'selection-1' },
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: 640,
            product_data: { name: 'ShipDime — USPS Priority Mail' },
          },
        }],
      }),
      { idempotencyKey: 'click2ship-checkout-v2-quote-1-initial' },
    );
    expect(JSON.stringify(create.mock.calls[0])).not.toContain('ShipAir');
  });

  it('retrieves redirect and lifecycle state for reuse validation', async () => {
    const retrieve = vi.fn(async () => ({
      id: 'cs_live_1',
      url: 'https://checkout.stripe.com/live',
      success_url: 'https://click2-ship.vercel.app/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://click2-ship.vercel.app/payment/cancel',
      status: 'open',
      payment_status: 'unpaid',
    }));
    const stripe = {
      checkout: { sessions: { create: vi.fn(), retrieve } },
      webhooks: { constructEvent: vi.fn() },
    } as unknown as Stripe;
    const provider = new StripeCheckoutPaymentProvider('sk_live_example', 'whsec_live', stripe);
    await expect(provider.getCheckoutSession('cs_live_1')).resolves.toMatchObject({
      id: 'cs_live_1',
      status: 'open',
      paymentStatus: 'unpaid',
    });
  });
});
