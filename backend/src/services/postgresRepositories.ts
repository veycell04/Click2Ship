import { Pool, type PoolClient } from 'pg';
import type { LabelRecord, LabelRepository } from './labelRepository.js';
import type { OrderRepository } from './orderRepository.js';
import type { PricingQuoteRepository, StoredPricingQuote } from './pricingService.js';
import type { OrderRecord, OrderStatus } from '../types/payments.js';
import type { CreatedLabel } from '../types/shipping.js';

interface DatabaseErrorLike extends Error {
  code?: string;
  severity?: string;
  detail?: string;
  hint?: string;
  position?: string;
  routine?: string;
  cause?: unknown;
}

const redactConnectionUri = (value: string): string =>
  value.replace(/\b(?:postgres(?:ql)?):\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]');

const safeCause = (cause: unknown): unknown => {
  if (cause instanceof Error) {
    const error = cause as DatabaseErrorLike;
    return {
      name: error.name,
      message: redactConnectionUri(error.message),
      code: error.code,
    };
  }
  if (typeof cause === 'string') return redactConnectionUri(cause);
  if (cause === null || cause === undefined) return cause;
  return { type: typeof cause === 'object' ? cause.constructor?.name ?? 'Object' : typeof cause };
};

export function safeDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: 'UnknownDatabaseError', message: redactConnectionUri(String(error)) };
  }

  const databaseError = error as DatabaseErrorLike;
  return {
    name: databaseError.name,
    message: redactConnectionUri(databaseError.message),
    code: databaseError.code,
    cause: safeCause(databaseError.cause),
    stack: databaseError.stack ? redactConnectionUri(databaseError.stack) : undefined,
    severity: databaseError.severity,
    detail: databaseError.detail ? redactConnectionUri(databaseError.detail) : undefined,
    hint: databaseError.hint ? redactConnectionUri(databaseError.hint) : undefined,
    position: databaseError.position,
    routine: databaseError.routine,
  };
}

export class Click2ShipPostgres {
  readonly pool: Pool;
  readonly connectionMetadata: {
    databaseUrlConfigured: boolean;
    protocol: string;
    sslConfigured: boolean;
    pooledConnection: boolean | null;
  };

  constructor(connectionString: string) {
    const parsedUrl = new URL(connectionString);
    const isLocal = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
    const sslConfigured = !isLocal;
    const pooledConnection = /pool(?:er|ing)?/i.test(parsedUrl.hostname)
      ? true
      : parsedUrl.searchParams.has('pgbouncer')
        ? parsedUrl.searchParams.get('pgbouncer') !== 'false'
        : null;

    this.connectionMetadata = {
      databaseUrlConfigured: Boolean(connectionString),
      protocol: parsedUrl.protocol.replace(':', ''),
      sslConfigured,
      pooledConnection,
    };
    console.info('PostgreSQL connection configuration', this.connectionMetadata);

    this.pool = new Pool({
      connectionString,
      ssl: sslConfigured ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  async ready(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');
    } catch (error) {
      console.error('PostgreSQL SELECT 1 failed', {
        connection: this.connectionMetadata,
        error: safeDatabaseError(error),
      });
      throw error;
    }
  }
}

let sharedDatabase: Click2ShipPostgres | null = null;
let sharedConnectionString = '';

export function getClick2ShipPostgres(connectionString: string): Click2ShipPostgres {
  if (!sharedDatabase || sharedConnectionString !== connectionString) {
    sharedDatabase = new Click2ShipPostgres(connectionString);
    sharedConnectionString = connectionString;
  }
  return sharedDatabase;
}

export class PostgresPricingQuoteRepository implements PricingQuoteRepository {
  constructor(private readonly database: Click2ShipPostgres) {}

  async save(quote: StoredPricingQuote): Promise<void> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO quotes (
          id, selection_id, easy_post_shipment_id, easy_post_rate_id, carrier,
          service_code, service_name, ship_air_label_type_id, reference_price_cents,
          customer_price_cents, savings_cents, savings_percent, currency,
          shipment_snapshot, document, expires_at
        ) VALUES (
          $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14::jsonb, $15::jsonb, $16
        )`,
        [
          quote.quoteId,
          quote.input.selectionId,
          quote.easyPostShipmentId,
          quote.easyPostRateId,
          quote.carrier,
          quote.serviceCode,
          quote.serviceName,
          quote.shipAirLabelTypeId,
          quote.referencePriceCents,
          quote.customerPriceCents,
          quote.savingsCents,
          quote.savingsPercent,
          quote.currency,
          JSON.stringify(quote.shipmentSnapshot),
          JSON.stringify(quote),
          quote.expiresAt,
        ],
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
    const result = await this.database.pool.query<{ document: StoredPricingQuote }>(
      'SELECT document FROM quotes WHERE id = $1::uuid',
      [quoteId],
    );
    return result.rows[0]?.document ?? null;
  }
}

const orderFrom = async (client: PoolClient, id: string): Promise<OrderRecord | null> => {
  const result = await client.query<{ document: OrderRecord }>(
    'SELECT document FROM orders WHERE id = $1::uuid FOR UPDATE',
    [id],
  );
  return result.rows[0]?.document ?? null;
};

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly database: Click2ShipPostgres) {}

  private async update(id: string, changes: Partial<OrderRecord>): Promise<OrderRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const next = { ...current, ...changes, updatedAt: new Date().toISOString() };
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      `UPDATE orders SET
        status = $2, stripe_checkout_session_id = NULLIF($3, ''),
        stripe_payment_intent_id = NULLIF($4, ''), provider_label_id = NULLIF($5, ''),
        tracking_number = NULLIF($6, ''), error_message = NULLIF($7, ''),
        document = $8::jsonb, updated_at = $9
       WHERE id = $1::uuid RETURNING document`,
      [
        id,
        next.status,
        next.stripeCheckoutSessionId,
        next.stripePaymentIntentId,
        next.providerLabelId,
        next.trackingNumber,
        next.errorMessage,
        JSON.stringify(next),
        next.updatedAt,
      ],
    );
    return result.rows[0]?.document ?? null;
  }

  async findById(id: string) {
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      'SELECT document FROM orders WHERE id = $1::uuid',
      [id],
    );
    return result.rows[0]?.document ?? null;
  }

  async findBySelectionId(selectionId: string) {
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      'SELECT document FROM orders WHERE selection_id = $1::uuid',
      [selectionId],
    );
    return result.rows[0]?.document ?? null;
  }

  async create(order: OrderRecord) {
    const result = await this.database.pool.query<{ document: OrderRecord }>(
      `INSERT INTO orders (
        id, quote_id, selection_id, status, amount_cents, currency, shipment_snapshot,
        document, created_at, updated_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
      ON CONFLICT (selection_id) DO UPDATE SET selection_id = EXCLUDED.selection_id
      RETURNING document`,
      [
        order.id,
        order.quoteId,
        order.selectionId,
        order.status,
        order.amountCents,
        order.currency,
        JSON.stringify(order.shipmentSnapshot),
        JSON.stringify(order),
        order.createdAt,
        order.updatedAt,
      ],
    );
    return result.rows[0]?.document ?? order;
  }

  async updateCheckout(id: string, sessionId: string, url: string) {
    const order = await this.update(id, {
      stripeCheckoutSessionId: sessionId,
      stripeCheckoutUrl: url,
      status: 'payment_pending',
    });
    if (!order) throw new Error('Order not found.');
    return order;
  }

  markPaid(id: string, paymentIntentId: string) {
    return this.update(id, { status: 'paid', stripePaymentIntentId: paymentIntentId });
  }

  async claimLabelProcessing(id: string) {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await orderFrom(client, id);
      if (!current || ['label_processing', 'label_created', 'label_failed'].includes(current.status)) {
        await client.query('ROLLBACK');
        return null;
      }
      const next = {
        ...current,
        status: 'label_processing' as const,
        updatedAt: new Date().toISOString(),
      };
      await client.query(
        `UPDATE orders SET status = 'label_processing', document = $2::jsonb, updated_at = $3
         WHERE id = $1::uuid`,
        [id, JSON.stringify(next), next.updatedAt],
      );
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
    return this.update(id, {
      status: 'label_created',
      providerLabelId: label.id,
      trackingNumber: label.trackingNumber,
      label,
      errorMessage: '',
    });
  }
  markLabelFailed(id: string, message: string) {
    return this.update(id, { status: 'label_failed', errorMessage: message });
  }
  updateStatus(id: string, status: OrderStatus) {
    return this.update(id, { status });
  }
}

export class PostgresLabelRepository implements LabelRepository {
  constructor(private readonly database: Click2ShipPostgres) {}

  async findBySelectionId(selectionId: string) {
    const result = await this.database.pool.query<{ document: LabelRecord }>(
      'SELECT document FROM labels WHERE selection_id = $1::uuid',
      [selectionId],
    );
    return result.rows[0]?.document ?? null;
  }

  async findByLabelId(labelId: string) {
    const result = await this.database.pool.query<{ document: LabelRecord }>(
      'SELECT document FROM labels WHERE provider_label_id = $1',
      [labelId],
    );
    return result.rows[0]?.document ?? null;
  }

  async claimProcessing(selectionId: string) {
    const record: LabelRecord = {
      selectionId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      label: null,
    };
    const result = await this.database.pool.query(
      `INSERT INTO labels (id, selection_id, provider, status, document, created_at)
       VALUES ($1::uuid, $2::uuid, 'shipair', 'processing', $3::jsonb, $4)
       ON CONFLICT (selection_id) DO NOTHING RETURNING id`,
      [crypto.randomUUID(), selectionId, JSON.stringify(record), record.createdAt],
    );
    return result.rowCount === 1 ? null : this.findBySelectionId(selectionId);
  }

  async markCompleted(selectionId: string, label: CreatedLabel, orderId?: string) {
    const record: LabelRecord = {
      selectionId,
      orderId,
      providerLabelId: label.id,
      trackingNumber: label.trackingNumber,
      labelTypeId: label.labelTypeId,
      reference: label.reference,
      status: 'completed',
      createdAt: label.createdAt,
      label,
    };
    await this.database.pool.query(
      `UPDATE labels SET order_id = $2::uuid, provider_label_id = $3, tracking_number = $4,
       label_type_id = $5, reference = $6, status = 'completed', document = $7::jsonb
       WHERE selection_id = $1::uuid`,
      [selectionId, orderId ?? null, label.id, label.trackingNumber, label.labelTypeId, label.reference, JSON.stringify(record)],
    );
  }

  async markFailed(selectionId: string, errorCode: string, unknown = false) {
    const record: LabelRecord = {
      selectionId,
      status: unknown ? 'unknown' : 'failed',
      createdAt: new Date().toISOString(),
      label: null,
      errorCode,
    };
    await this.database.pool.query(
      `UPDATE labels SET status = $2, document = $3::jsonb WHERE selection_id = $1::uuid`,
      [selectionId, record.status, JSON.stringify(record)],
    );
  }
}
