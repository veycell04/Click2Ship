import type { CompletedShipment, PendingNewShipment, StoredPaymentOrder } from '../services/storage';

export type SidePanelRoute =
  | { view: 'new-shipment'; selectionId: string; intent: PendingNewShipment }
  | { view: 'recovery'; selectionId: string; order: StoredPaymentOrder }
  | { view: 'completed'; selectionId: string; shipment: CompletedShipment }
  | { view: 'shipment'; selectionId: string };

const recoverableStatuses = new Set([
  'payment_pending',
  'paid',
  'label_processing',
  'label_failed',
]);

export function resolveInitialSidePanelRoute(input: {
  pendingNewShipment: PendingNewShipment | null;
  selectionId: string;
  paymentOrder: StoredPaymentOrder | null;
  completedShipment: CompletedShipment | null;
}): SidePanelRoute {
  if (input.pendingNewShipment) {
    return {
      view: 'new-shipment',
      selectionId: input.pendingNewShipment.selectionId,
      intent: input.pendingNewShipment,
    };
  }
  if (
    input.paymentOrder &&
    recoverableStatuses.has(input.paymentOrder.currentStatus)
  ) {
    return {
      view: 'recovery',
      selectionId: input.paymentOrder.selectionId,
      order: input.paymentOrder,
    };
  }
  if (input.completedShipment?.selectionId === input.selectionId) {
    return {
      view: 'completed',
      selectionId: input.selectionId,
      shipment: input.completedShipment,
    };
  }
  return { view: 'shipment', selectionId: input.selectionId };
}
