import { Pool, type PoolClient } from 'pg';
import type { LabelRecord, LabelRepository } from './labelRepository.js';
import type { OrderRepository } from './orderRepository.js';
import type { PricingQuoteRepository, StoredPricingQuote } from './pricingService.js';
import type { OrderRecord, OrderStatus } from '../types/payments.js';
import type { CreatedLabel } from '../types/shipping.js';

const schema = `
CREATE TABLE IF NOT EXISTS click2ship_quotes (
  quote_id text PRIMARY KEY,
  selection_id text NOT NULL UNIQUE,
  document jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS click2ship_orders (
  order_id text PRIMARY KEY,
  selection_id text NOT NULL UNIQUE,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS click2ship_labels (
  selection_id text PRIMARY KEY,
  provider_label_id text UNIQUE,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

export class Click2ShipPostgres {
  readonly pool: Pool;
  private initialized: Promise<void> | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
    });
  }

  ready(): Promise<void> {
    this.initialized ??= this.pool.query(schema).then(() => undefined);
    return this.initialized;
  }
}

export class PostgresPricingQuoteRepository implements PricingQuoteRepository {
  constructor(private readonly database: Click2ShipPostgres) {}
  async save(quote: StoredPricingQuote): Promise<void> {
    await this.database.ready();
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM click2ship_quotes WHERE selection_id = $1', [quote.input.selectionId]);
      await client.query(
        'INSERT INTO click2ship_quotes (quote_id, selection_id, document, expires_at) VALUES ($1, $2, $3::jsonb, $4)',
        [quote.quoteId, quote.input.selectionId, JSON.stringify(quote), quote.expiresAt],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async findById(quoteId: string): Promise<StoredPricingQuote | null> {
    await this.database.ready();
    const result = await this.database.pool.query<{ document: StoredPricingQuote }>(
      'SELECT document FROM click2ship_quotes WHERE quote_id = $1', [quoteId],
    );
    return result.rows[0]?.document ?? null;
  }
}

const orderFrom = async (client: PoolClient, id: string): Promise<OrderRecord | null> => {
  const result = await client.query<{ document: OrderRecord }>(
    'SELECT document FROM click2ship_orders WHERE order_id = $1', [id],
  );
  return result.rows[0]?.document ?? null;
};

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly database: Click2ShipPostgres) {}
  private async update(id: string, changes: Partial<OrderRecord>): Promise<OrderRecord | null> {
    await this.database.ready();
    const current = await this.findById(id);
    if (!current) return null;
    const next = { ...current, ...changes, updatedAt: new Date().toISOString() };
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      'UPDATE click2ship_orders SET document = $2::jsonb, updated_at = now() WHERE order_id = $1 RETURNING document',
      [id, JSON.stringify(next)],
    );
    return result.rows[0]?.document ?? null;
  }
  async findById(id: string) {
    await this.database.ready();
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      'SELECT document FROM click2ship_orders WHERE order_id = $1', [id],
    );
    return result.rows[0]?.document ?? null;
  }
  async findBySelectionId(selectionId: string) {
    await this.database.ready();
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      'SELECT document FROM click2ship_orders WHERE selection_id = $1', [selectionId],
    );
    return result.rows[0]?.document ?? null;
  }
  async create(order: OrderRecord) {
    await this.database.ready();
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      `INSERT INTO click2ship_orders (order_id, selection_id, document)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (selection_id) DO UPDATE SET selection_id = EXCLUDED.selection_id
       RETURNING document`,
      [order.id, order.selectionId, JSON.stringify(order)],
    );
    return result.rows[0]?.document ?? order;
  }
  async updateCheckout(id: string, sessionId: string, url: string) {
    const order = await this.update(id, { stripeCheckoutSessionId: sessionId, stripeCheckoutUrl: url, status: 'payment_pending' });
    if (!order) throw new Error('Order not found.');
    return order;
  }
  markPaid(id: string, paymentIntentId: string) {
    return this.update(id, { status: 'paid', stripePaymentIntentId: paymentIntentId });
  }
  async claimLabelProcessing(id: string) {
    await this.database.ready();
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await orderFrom(client, id);
      if (!current || current.status === 'label_processing' || current.status === 'label_created') {
        await client.query('ROLLBACK');
        return null;
      }
      const next = { ...current, status: 'label_processing' as const, updatedAt: new Date().toISOString() };
      const claimed = await client.query(
        `UPDATE click2ship_orders SET document = $2::jsonb, updated_at = now()
         WHERE order_id = $1 AND document->>'status' NOT IN ('label_processing', 'label_created')`,
        [id, JSON.stringify(next)],
      );
      if (claimed.rowCount !== 1) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query('COMMIT');
      return next;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  markLabelCreated(id: string, label: CreatedLabel) {
    return this.update(id, { status: 'label_created', providerLabelId: label.id, trackingNumber: label.trackingNumber, label, errorMessage: '' });
  }
  markLabelFailed(id: string, message: string) {
    return this.update(id, { status: 'label_failed', errorMessage: message });
  }
  updateStatus(id: string, status: OrderStatus) { return this.update(id, { status }); }
}

export class PostgresLabelRepository implements LabelRepository {
  constructor(private readonly database: Click2ShipPostgres) {}
  async findBySelectionId(selectionId: string) {
    await this.database.ready();
    const result = await this.database.pool.query<{ document: LabelRecord }>('SELECT document FROM click2ship_labels WHERE selection_id = $1', [selectionId]);
    return result.rows[0]?.document ?? null;
  }
  async findByLabelId(labelId: string) {
    await this.database.ready();
    const result = await this.database.pool.query<{ document: LabelRecord }>('SELECT document FROM click2ship_labels WHERE provider_label_id = $1', [labelId]);
    return result.rows[0]?.document ?? null;
  }
  async claimProcessing(selectionId: string) {
    await this.database.ready();
    const record: LabelRecord = { selectionId, status: 'processing', createdAt: new Date().toISOString(), label: null };
    const result = await this.database.pool.query(
      `INSERT INTO click2ship_labels (selection_id, document) VALUES ($1, $2::jsonb)
       ON CONFLICT (selection_id) DO NOTHING RETURNING selection_id`,
      [selectionId, JSON.stringify(record)],
    );
    return result.rowCount === 1 ? null : this.findBySelectionId(selectionId);
  }
  async markCompleted(selectionId: string, label: CreatedLabel) {
    const record: LabelRecord = { selectionId, providerLabelId: label.id, trackingNumber: label.trackingNumber, labelTypeId: label.labelTypeId, reference: label.reference, status: 'completed', createdAt: label.createdAt, label };
    await this.database.ready();
    await this.database.pool.query(
      `INSERT INTO click2ship_labels (selection_id, provider_label_id, document) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (selection_id) DO UPDATE SET provider_label_id = EXCLUDED.provider_label_id, document = EXCLUDED.document, updated_at = now()`,
      [selectionId, label.id, JSON.stringify(record)],
    );
  }
  async markFailed(selectionId: string, errorCode: string, unknown = false) {
    const record: LabelRecord = { selectionId, status: unknown ? 'unknown' : 'failed', createdAt: new Date().toISOString(), label: null, errorCode };
    await this.database.ready();
    await this.database.pool.query(
      `INSERT INTO click2ship_labels (selection_id, document) VALUES ($1, $2::jsonb)
       ON CONFLICT (selection_id) DO UPDATE SET document = EXCLUDED.document, updated_at = now()`,
      [selectionId, JSON.stringify(record)],
    );
  }
}
