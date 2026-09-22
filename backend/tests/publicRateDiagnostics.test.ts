import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/createApp.js';
import { loadConfig } from '../src/config/env.js';
import { InMemoryLabelRepository } from '../src/services/labelRepository.js';
import { LiveEasyPostPricingService, InMemoryPricingQuoteRepository } from '../src/services/pricingService.js';
import { EasyPostRateProvider } from '../src/providers/easyPostRateProvider.js';
import { PublicRateLimiter } from '../src/services/publicRateLimiter.js';
import { classifyProviderFailure, safeDatabaseCode } from '../src/services/rateDiagnostics.js';
import type { LabelProvider } from '../src/types/shipping.js';

const payload = { originZip: '60630', destinationZip: '48047', weight: 3, length: 14, width: 10, height: 10, shipmentCategory: 'standard', service: 'best' };
const missing = Object.assign(new Error('relation missing'), { code: '42P01' });
describe('public ZIP-only rate regression', () => {
  it.each([['60630', 10], ['60101', 5]] as const)('rates %s to 48047 through schema, real provider adapter, and shared pricing engine', async (originZip, height) => {
    const create = vi.fn(async () => ({ id: 'shp_mock', rates: [
      { id: 'ground', carrier: 'USPS', service: 'GroundAdvantage', rate: '8.01', currency: 'USD', delivery_days: 3 },
      { id: 'priority', carrier: 'USPS', service: 'Priority', rate: '10.02', currency: 'USD', delivery_days: 2 },
    ], messages: [{ carrier: 'OtherCarrier', message: 'street1 required' }] }) as never);
    const engine = new LiveEasyPostPricingService(new EasyPostRateProvider('test', { create }), new InMemoryPricingQuoteRepository(), 20);
    let tableExists = false;
    const db = { query: vi.fn(async (sql: string) => {
      if (sql.startsWith('CREATE TABLE')) { tableExists = true; return { rows: [] }; }
      if (sql.startsWith('CREATE INDEX')) return { rows: [] };
      if (!tableExists) throw missing;
      return { rows: [{ count: 1 }] };
    }) };
    const app = await buildApp(loadConfig({ NODE_ENV: 'test' }), {} as LabelProvider, new InMemoryLabelRepository(), undefined, undefined, engine, db);
    try {
      const response = await app.inject({ method: 'POST', url: '/api/pricing/estimate', headers: { origin: 'https://www.shipdime.com' }, payload: { ...payload, originZip, height } });
      expect(response.statusCode).toBe(200);
      expect(response.json().estimate).toMatchObject({ labelTypeId: 120, customerPriceCents: 641 });
      expect(response.json().options).toHaveLength(2);
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ from_address: expect.objectContaining({ zip: originZip, country: 'US', street1: undefined }), to_address: expect.objectContaining({ zip: '48047', country: 'US' }), parcel: { weight: 48, length: 14, width: 10, height } }));
      const address = { fullName: 'Test', address1: '1 Main St', city: 'Chicago', state: 'IL', zip: originZip, country: 'US' };
      const extension = await app.inject({ method: 'POST', url: '/api/pricing/quote', payload: { selectionId: crypto.randomUUID(), labelTypeId: 120, weight: 3, length: 14, width: 10, height, shipmentCategory: 'standard', sender: address, recipient: { ...address, zip: '48047', state: 'MI' } } });
      expect(extension.statusCode).toBe(200);
      expect(extension.json().quote.customerPriceCents).toBe(response.json().estimate.customerPriceCents);
    } finally { await app.close(); }
  });
  it('reproduces rate-limit database failures before ZIP validation without leaking details', async () => {
    const getEstimate = vi.fn();
    const engine = { getEstimate, getQuote: vi.fn(), getStoredQuote: vi.fn() };
    const db = { query: vi.fn(async () => { throw Object.assign(new Error('secret DB credentials'), { code: '42501' }); }) };
    const app = await buildApp(loadConfig({ NODE_ENV: 'test' }), {} as LabelProvider, new InMemoryLabelRepository(), undefined, undefined, engine, db);
    try {
      const response = await app.inject({ method: 'POST', url: '/api/pricing/estimate', payload: { ...payload, originZip: 'BAD' } });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ success: false, error: 'RATE_UNAVAILABLE' });
      expect(getEstimate).not.toHaveBeenCalled();
      expect(db.query).toHaveBeenCalledTimes(1);
    } finally { await app.close(); }
  });
});
describe('safe public rate diagnostics and limiter recovery', () => {
  it.each([
    [{ message: 'from_address.street1 required' }, 'INVALID_ADDRESS'],
    [{ code: 'PARCEL.INVALID', message: 'weight invalid' }, 'INVALID_PACKAGE'],
    [{ message: 'unsupported service' }, 'UNSUPPORTED_SERVICE'],
    [{ message: 'secret credential denied' }, 'PROVIDER_ERROR'],
  ])('classifies without returning upstream text', (error, reason) => expect(classifyProviderFailure(error)).toBe(reason));
  it('does not log arbitrary database error text as a code', () => {
    expect(safeDatabaseCode({ code: 'secret password' })).toBeNull();
    expect(safeDatabaseCode(missing)).toBe('42P01');
  });
  it('recovers missing schema and retries the atomic counter without disabling rate limiting', async () => {
    let count = 0, tableExists = false;
    const db = { query: vi.fn(async (sql: string) => {
      if (sql.startsWith('CREATE TABLE')) { tableExists = true; return { rows: [] }; }
      if (sql.startsWith('CREATE INDEX')) return { rows: [] };
      if (!tableExists) throw missing;
      return { rows: [{ count: ++count }] };
    }) };
    const limiter = new PublicRateLimiter(db, true);
    for (let i = 0; i < 10; i++) expect(await limiter.allow('1.2.3.4', 0)).toBe(true);
    expect(await limiter.allow('1.2.3.4', 0)).toBe(false);
    expect(db.query.mock.calls.filter(([sql]) => sql.startsWith('CREATE TABLE'))).toHaveLength(1);
  });
  it('does not fall back to unrestricted access when schema creation is denied', async () => {
    const db = { query: vi.fn(async (sql: string) => { if (sql.startsWith('CREATE')) throw Object.assign(new Error('denied'), { code: '42501' }); throw missing; }) };
    await expect(new PublicRateLimiter(db, true).allow('a')).rejects.toMatchObject({ code: '42501' });
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
