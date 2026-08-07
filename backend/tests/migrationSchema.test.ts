import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('production persistence migration', () => {
  it('defines durable quote, order, label, and selection idempotency storage', async () => {
    const sql = await readFile(
      resolve(process.cwd(), 'migrations/002_production_persistence.sql'),
      'utf8',
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS quotes');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS orders');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS labels');
    expect(sql).toMatch(/labels[\s\S]*selection_id uuid NOT NULL UNIQUE/);
    expect(sql).toContain('shipment_snapshot jsonb NOT NULL');
  });
});
