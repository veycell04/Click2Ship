import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPaymentOrder, savePaymentOrder } from '../services/storage';

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
    await savePaymentOrder('selection-1', 'order-1');
    await expect(loadPaymentOrder()).resolves.toEqual({
      selectionId: 'selection-1',
      orderId: 'order-1',
    });
  });
});
