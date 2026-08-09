import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('production persistence migration', () => {
  it('defines durable quote, order, label, and selection idempotency storage', async () => {
    const sql = await readFile(new URL('../migrations/003_ensure_production_tables.sql', import.meta.url), 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.quotes');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.orders');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.labels');
    expect(sql).toMatch(/labels[\s\S]*selection_id uuid NOT NULL UNIQUE/);
    expect(sql).toContain('shipment_snapshot jsonb NOT NULL');
  });

  it('adds non-destructive multi-carrier quote and subsidy fields', async () => {
    const sql = await readFile(new URL('../migrations/004_multi_carrier_quotes.sql', import.meta.url), 'utf8');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS benchmark_price_cents');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS selected_rate_snapshot');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS gross_spread_cents');
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
  });
});
