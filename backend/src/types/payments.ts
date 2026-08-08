import type { CreateLabelInput, CreatedLabel } from './shipping.js';

export type OrderStatus =
  | 'draft'
  | 'checkout_created'
  | 'payment_pending'
  | 'paid'
  | 'label_processing'
  | 'label_created'
  | 'payment_failed'
  | 'label_failed';

export interface OrderRecord {
  id: string;
  selectionId: string;
  quoteId: string;
  status: OrderStatus;
  amountCents: number;
  currency: string;
  stripeCheckoutSessionId: string;
  stripeCheckoutUrl: string;
  stripePaymentIntentId: string;
  providerLabelId: string;
  trackingNumber: string;
  shipmentSnapshot: CreateLabelInput;
  label: CreatedLabel | null;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface PaidCheckoutEvent {
  type: string;
  sessionId: string;
  paymentStatus: string;
  paymentIntentId: string;
  metadata: Record<string, string>;
  failureMessage?: string;
}

export interface PaymentProvider {
  createCheckoutSession(input: {
    orderId: string;
    quoteId: string;
    selectionId: string;
    serviceName: string;
    amountCents: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;
  verifyWebhook(rawBody: Buffer, signature: string): PaidCheckoutEvent;
}
