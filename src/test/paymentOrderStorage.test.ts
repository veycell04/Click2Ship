import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadPaymentOrder,
  loadPaymentOrders,
  savePaymentOrder,
  updatePaymentOrderStatus,
} from '../services/storage';

afterEach(() => vi.unstubAllGlobals());

describe('payment order restoration', () => {
  it('restores the current order when the side panel reopens', async () => {
    const values: Record<string, unknown> = {};
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          async set(next: Record<string, unknown>) { Object.assign(values, next); },
          async get(key: string) { return { [key]: values[key] }; },
        },
      },
    });
    await savePaymentOrder('selection-1', 'order-1', 'quote-1', 'payment_pending');
    await expect(loadPaymentOrder()).resolves.toEqual({
      selectionId: 'selection-1',
      orderId: 'order-1',
      quoteId: 'quote-1',
      currentStatus: 'payment_pending',
    });
    await updatePaymentOrderStatus('order-1', 'label_processing');
    await expect(loadPaymentOrder()).resolves.toMatchObject({ currentStatus: 'label_processing' });
    await expect(loadPaymentOrders()).resolves.toEqual([
      expect.objectContaining({ orderId: 'order-1', currentStatus: 'label_processing' }),
    ]);
  });
});
