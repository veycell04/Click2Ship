import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('production persistence migration', () => {
  it('defines durable quote, order, label, and selection idempotency storage', async () => {
    const sql = await readFile(
      resolve(process.cwd(), 'migrations/003_ensure_production_tables.sql'),
      'utf8',
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.quotes');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.orders');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.labels');
    expect(sql).toMatch(/labels[\s\S]*selection_id uuid NOT NULL UNIQUE/);
    expect(sql).toContain('shipment_snapshot jsonb NOT NULL');
  });
});
