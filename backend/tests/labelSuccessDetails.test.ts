import { describe, expect, it } from 'vitest';
import { buildLabelSuccessDetails } from '../src/services/labelSuccessDetails.js';
import type { OrderRecord } from '../src/types/payments.js';

const order: OrderRecord = {
  id: 'order-1',
  quoteId: 'quote-1',
  selectionId: 'selection-1',
  status: 'label_created',
  amountCents: 1076,
  currency: 'usd',
  stripeCheckoutSessionId: '',
  stripeCheckoutUrl: '',
  stripePaymentIntentId: '',
  providerLabelId: 'provider-label-1',
  trackingNumber: '9400111899',
  shipmentSnapshot: {
    selectionId: 'selection-1',
    labelTypeId: 78,
    weight: 2,
    length: 14,
    width: 10,
    height: 6,
    sender: { fullName: 'Sender', address1: 'Hidden', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' },
    recipient: { fullName: 'John Jaramillo', address1: 'Hidden', city: 'Taos', state: 'NM', zip: '87571', country: 'US' },
    reference: 'ShipDime-selection-1',
  },
  label: {
    id: 'provider-label-1',
    trackingNumber: '9400111899',
    labelTypeId: 78,
    labelTypeName: 'USPS Ground Advantage',
    downloadUrl: '/api/shipping/labels/provider-label-1/download',
    reference: 'ShipDime-selection-1',
    createdAt: '2026-08-09T12:00:00.000Z',
  },
  errorMessage: '',
  createdAt: '2026-08-09T12:00:00.000Z',
  updatedAt: '2026-08-09T12:00:00.000Z',
};

describe('label success details', () => {
  it('normalizes customer-facing values from the persisted shipment snapshot', () => {
    expect(buildLabelSuccessDetails(order)).toEqual({
      orderId: 'order-1',
      recipientName: 'John Jaramillo',
      destination: 'Taos, NM 87571',
      weightLb: 2,
      lengthIn: 14,
      widthIn: 10,
      heightIn: 6,
      serviceName: 'USPS Ground Advantage',
      trackingNumber: '9400111899',
      reference: 'ShipDime-selection-1',
      labelUrl: '/api/shipping/labels/provider-label-1/download',
    });
  });

  it('handles missing optional and display fields without undefined or null text', () => {
    const details = buildLabelSuccessDetails({
      ...order,
      shipmentSnapshot: {
        ...order.shipmentSnapshot,
        weight: Number.NaN,
        recipient: { ...order.shipmentSnapshot.recipient, address2: undefined, city: '', state: '', zip: '' },
      },
    });
    expect(details.destination).toBe('');
    expect(details.weightLb).toBeNull();
    expect(JSON.stringify(details)).not.toContain('undefined');
  });
});
