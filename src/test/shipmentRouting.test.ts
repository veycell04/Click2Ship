import { describe, expect, it } from 'vitest';
import { resolveInitialSidePanelRoute } from '../sidepanel/shipmentRouting';
import type { CompletedShipment, PendingNewShipment, StoredPaymentOrder } from '../services/storage';

const pending: PendingNewShipment = {
  type: 'START_NEW_SHIPMENT',
  selectionId: 'selection-new',
  selectedText: 'New Recipient\n1 New Street',
  createdAt: 123,
};

const order: StoredPaymentOrder = {
  orderId: 'order-old',
  quoteId: 'quote-old',
  selectionId: 'selection-old',
  currentStatus: 'label_processing',
};

const completed = {
  selectionId: 'selection-old',
  recipientName: 'Old Recipient',
  destinationCity: 'Old City',
  destinationState: 'IL',
  weight: '2', length: '12', width: '9', height: '1',
  label: {
    id: 'label-old', trackingNumber: 'TRACK', labelTypeId: 87,
    labelTypeName: 'USPS Priority Mail', downloadUrl: '/label', reference: 'OLD',
    createdAt: new Date(0).toISOString(),
  },
} satisfies CompletedShipment;

describe('side-panel routing priority', () => {
  it('opens a fresh shipment when an old completed label exists', () => {
    expect(resolveInitialSidePanelRoute({
      pendingNewShipment: pending, selectionId: 'selection-old', paymentOrder: null,
      completedShipment: completed,
    })).toMatchObject({ view: 'new-shipment', selectionId: 'selection-new' });
  });

  it('lets a new context-menu intent beat paid-order recovery', () => {
    expect(resolveInitialSidePanelRoute({
      pendingNewShipment: pending, selectionId: 'selection-old', paymentOrder: order,
      completedShipment: completed,
    })).toMatchObject({ view: 'new-shipment', selectionId: 'selection-new' });
  });

  it('restores a genuinely recoverable order without a new intent', () => {
    expect(resolveInitialSidePanelRoute({
      pendingNewShipment: null, selectionId: 'selection-old', paymentOrder: order,
      completedShipment: null,
    })).toMatchObject({ view: 'recovery', selectionId: 'selection-old' });
  });

  it('does not restore an unpaid draft over the normal shipment view', () => {
    expect(resolveInitialSidePanelRoute({
      pendingNewShipment: null, selectionId: 'selection-new',
      paymentOrder: { ...order, currentStatus: 'draft' }, completedShipment: completed,
    })).toEqual({ view: 'shipment', selectionId: 'selection-new' });
  });
});
