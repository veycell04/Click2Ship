import Stripe from 'stripe';
import type { PaidCheckoutEvent, PaymentProvider } from '../types/payments.js';

export class StripeCheckoutPaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
    stripeClient?: Stripe,
  ) {
    this.stripe = stripeClient ?? new Stripe(secretKey);
  }

  async createCheckoutSession(input: {
    orderId: string;
    quoteId: string;
    selectionId: string;
    serviceName: string;
    amountCents: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const metadata = { orderId: input.orderId, quoteId: input.quoteId, selectionId: input.selectionId };
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.orderId,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: input.amountCents,
            product_data: { name: `Click2Ship ${input.serviceName} Label` },
          },
        },
      ],
    }, { idempotencyKey: `click2ship-checkout-${input.quoteId}` });
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
    return { id: session.id, url: session.url };
  }

  verifyWebhook(rawBody: Buffer, signature: string): PaidCheckoutEvent {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.expired'
    ) {
      const session = event.data.object;
      return {
        type: event.type,
        sessionId: session.id,
        paymentStatus: session.payment_status,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || '',
        metadata: Object.fromEntries(
          Object.entries(session.metadata ?? {}).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        ),
      };
    }
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      return {
        type: event.type,
        sessionId: '',
        paymentStatus: 'failed',
        paymentIntentId: paymentIntent.id,
        metadata: Object.fromEntries(
          Object.entries(paymentIntent.metadata ?? {}).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        ),
        failureMessage: paymentIntent.last_payment_error?.message ?? 'Stripe payment failed.',
      };
    }
    return {
      type: event.type,
      sessionId: '',
      paymentStatus: '',
      paymentIntentId: '',
      metadata: {},
    };
  }
}
