import type { CreatedLabel } from '../types/shipping.js';
import type { OrderRecord, OrderStatus } from '../types/payments.js';

export interface OrderRepository {
  findById(id: string): Promise<OrderRecord | null>;
  findBySelectionId(selectionId: string): Promise<OrderRecord | null>;
  create(order: OrderRecord): Promise<OrderRecord>;
  updateCheckout(id: string, sessionId: string, url: string): Promise<OrderRecord>;
  markPaid(id: string, paymentIntentId: string): Promise<OrderRecord | null>;
  claimLabelProcessing(id: string): Promise<OrderRecord | null>;
  markLabelCreated(id: string, label: CreatedLabel): Promise<OrderRecord | null>;
  markLabelFailed(id: string, message: string): Promise<OrderRecord | null>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderRecord | null>;
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly records = new Map<string, OrderRecord>();

  async findById(id: string) {
    return this.records.get(id) ?? null;
  }
  async findBySelectionId(selectionId: string) {
    return [...this.records.values()].find((order) => order.selectionId === selectionId) ?? null;
  }
  async create(order: OrderRecord) {
    this.records.set(order.id, order);
    return order;
  }
  private update(id: string, changes: Partial<OrderRecord>) {
    const current = this.records.get(id);
    if (!current) return null;
    const next = { ...current, ...changes, updatedAt: new Date().toISOString() };
    this.records.set(id, next);
    return next;
  }
  async updateCheckout(id: string, sessionId: string, url: string) {
    const order = this.update(id, {
      stripeCheckoutSessionId: sessionId,
      stripeCheckoutUrl: url,
      status: 'payment_pending',
    });
    if (!order) throw new Error('Order not found.');
    return order;
  }
  async markPaid(id: string, paymentIntentId: string) {
    return this.update(id, { status: 'paid', stripePaymentIntentId: paymentIntentId });
  }
  async claimLabelProcessing(id: string) {
    const current = this.records.get(id);
    if (!current || current.status === 'label_processing' || current.status === 'label_created') {
      return null;
    }
    return this.update(id, { status: 'label_processing' });
  }
  async markLabelCreated(id: string, label: CreatedLabel) {
    return this.update(id, {
      status: 'label_created',
      providerLabelId: label.id,
      trackingNumber: label.trackingNumber,
      label,
      errorMessage: '',
    });
  }
  async markLabelFailed(id: string, message: string) {
    return this.update(id, { status: 'label_failed', errorMessage: message });
  }
  async updateStatus(id: string, status: OrderStatus) {
    return this.update(id, { status });
  }
}
