import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/createApp.js';
import { loadConfig } from '../src/config/env.js';
import { InMemoryLabelRepository } from '../src/services/labelRepository.js';
import { InMemoryPricingQuoteRepository, LiveEasyPostPricingService } from '../src/services/pricingService.js';
import type { ReferenceRate, RateRequest } from '../src/services/rateProvider.js';
import type { LabelProvider } from '../src/types/shipping.js';
import { fetchRateEstimate, rateRequest, type RateInputs } from '../../website/lib/rateCalculator';
import { Click2ShipBackendClient, type RuntimeMessenger } from '../../src/services/click2ShipBackendClient';
import { emptyAddress } from '../../src/domain/models';
import { PublicRateLimiter, publicRateClientIp } from '../src/services/publicRateLimiter.js';
import { EasyPostRateProvider } from '../src/providers/easyPostRateProvider.js';
import { parsePublicRateInput } from '../src/schemas/publicRate.js';

const base: RateInputs = { originZip: '60101', destinationZip: '48047', weight: 3, length: 14, width: 10, height: 5, shipmentCategory: 'standard', service: 'best' };
const origin = 'https://www.shipdime.com';
const rate = (serviceCode: string, rateCents: number): ReferenceRate => ({ providerShipmentId: 'shp_fixture', providerRateId: `rate_${serviceCode}`, carrier: 'USPS', providerCarrier: 'USPS', serviceCode, serviceName: `USPS ${serviceCode}`, rateCents, currency: 'USD', deliveryDays: 2, deliveryDate: null, guaranteed: false });
const provider = { getLabelTypes: async () => [{ id: 120, name: 'Ground', description: '' }, { id: 87, name: 'Priority', description: '' }] } as LabelProvider;
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });
async function setup(rates = [rate('GroundAdvantage', 751), rate('Priority', 923), rate('MediaMail', 310)], mediaSupported = false, bookDiscountPercent?: number) {
  const repository = new InMemoryPricingQuoteRepository();
  const save = vi.spyOn(repository, 'save');
  const getRates = vi.fn(async (input: RateRequest) => { void input; return rates; });
  const service = new LiveEasyPostPricingService({ getRates }, repository, 20, {
    discountPercent: bookDiscountPercent,
    enabled: true, targetPriceCents: 399, minimumMarginCents: 25, mediaMailLabelTypeId: mediaSupported ? 321 : null,
    confirmMediaMailSupport: async () => mediaSupported,
  });
  const app = await buildApp(loadConfig({ NODE_ENV: 'test' }), provider, new InMemoryLabelRepository(), undefined, undefined, service);
  apps.push(app);
  const fetcher = (async (_url, options) => {
    const response = await app.inject({ method: 'POST', url: '/api/pricing/estimate', headers: { origin, 'content-type': 'application/json' }, payload: options?.body as string });
    return new Response(response.body, { status: response.statusCode });
  }) as typeof fetch;
  const messenger: RuntimeMessenger = async (message) => {
    if (message.type !== 'GET_PRICING_QUOTE') throw new Error('Unexpected message');
    const response = await app.inject({ method: 'POST', url: '/api/pricing/quote', headers: { origin: 'chrome-extension://cdpgindjbfdohkljljodighadpeoeefh' }, payload: message.payload });
    return { success: response.statusCode === 200, status: response.statusCode, data: response.json() };
  };
  return { app, service, getRates, save, fetcher, client: new Click2ShipBackendClient(messenger, 'https://test') };
}

describe('website / extension shared pricing boundary', () => {
  it.each([0, 20, 40, 50, 100])('returns identical Book prices to the website and actual extension client at %s percent', async (discount) => {
    const { fetcher, client } = await setup([rate('GroundAdvantage', 600)], false, discount);
    const website = await fetchRateEstimate({ ...base, shipmentCategory: 'book' }, fetcher);
    const address = { ...emptyAddress(), fullName: 'Test', addressLine1: '1 Main', city: 'Addison', state: 'IL', zipCode: '60101', country: 'US' };
    const extension = await client.getPricingQuote(crypto.randomUUID(), 'best', address, { ...address, zipCode: '48047', state: 'MI' }, { weight: '3', length: '14', width: '10', height: '5', preset: 'book-poly-mailer' });
    expect(website.estimate.customerPriceCents).toBe(extension.customerPriceCents);
    expect(website.estimate.customerPriceCents).toBe(Math.round(600 * (100 - discount) / 100));
  });
  it.each([
    ['A: standard Best Rate', {}],
    ['B: lightweight', { weight: 0.5 }],
    ['C: book Best Rate', { shipmentCategory: 'book' }],
    ['D: explicit Ground', { service: 'ground' }],
    ['E: explicit Priority', { service: 'priority' }],
  ] as [string, Partial<RateInputs>][])('%s returns the same customer price for the same provider rates', async (_name, changes) => {
    const { client, fetcher, getRates, save } = await setup();
    const input = { ...base, ...changes };
    const website = await fetchRateEstimate(input, fetcher);
    expect(getRates).toHaveBeenCalledTimes(1); // Best Rate reuses one provider response.
    expect(save).not.toHaveBeenCalled(); // ZIP-only estimates can never enter checkout.
    const isBook = input.shipmentCategory === 'book';
    const sender = { ...emptyAddress(), fullName: 'Sender', addressLine1: '1 Main St', city: 'Addison', state: 'IL', zipCode: input.originZip, country: 'US' };
    const recipient = { ...sender, fullName: 'Recipient', city: 'Chesterfield', state: 'MI', zipCode: input.destinationZip };
    const extension = await client.getPricingQuote(crypto.randomUUID(), isBook && input.service === 'best' ? 'best' : String(website.estimate.labelTypeId), sender, recipient,
      { weight: String(input.weight), length: String(input.length), width: String(input.width), height: String(input.height), preset: isBook ? 'book-poly-mailer' : 'custom' });
    expect(website.estimate).toMatchObject({ customerPriceCents: extension.customerPriceCents, customerDisplayAmount: extension.customerDisplayAmount, labelTypeId: extension.labelTypeId, shipmentCategory: input.shipmentCategory });
    expect(website.estimate).not.toHaveProperty('quoteId');
    expect(save).toHaveBeenCalledTimes(1);
    expect(getRates.mock.calls[0]![0]).toMatchObject({ weight: input.weight, length: input.length, shipmentCategory: input.shipmentCategory, sender: { zip: '60101', address1: '' }, recipient: { zip: '48047', address1: '' } });
  });

  it('Best Rate can choose Priority while explicit Ground stays Ground', async () => {
    const { fetcher } = await setup([rate('GroundAdvantage', 1000), rate('Priority', 600)]);
    expect((await fetchRateEstimate(base, fetcher)).estimate.labelTypeId).toBe(87);
    expect((await fetchRateEstimate({ ...base, service: 'ground' }, fetcher)).estimate.labelTypeId).toBe(120);
    expect((await fetchRateEstimate({ ...base, shipmentCategory: 'book', service: 'ground' }, fetcher)).estimate.labelTypeId).toBe(120);
  });
  it('does not substitute Ground when explicit Priority is unavailable', async () => {
    const { fetcher } = await setup([rate('GroundAdvantage', 700)]);
    await expect(fetchRateEstimate({ ...base, service: 'priority' }, fetcher)).rejects.toThrow("couldn't find a rate");
    expect((await fetchRateEstimate(base, fetcher)).estimate.labelTypeId).toBe(120);
  });
  it.each([false, true])('uses Media Mail only when support is confirmed: %s', async (supported) => {
    const { fetcher, client } = await setup(undefined, supported);
    const website = await fetchRateEstimate({ ...base, shipmentCategory: 'book' }, fetcher);
    expect(website.estimate.isMediaMail).toBe(supported);
    const address = { ...emptyAddress(), fullName: 'Test', addressLine1: '1 Main', city: 'Addison', state: 'IL', zipCode: '60101', country: 'US' };
    const quote = await client.getPricingQuote(crypto.randomUUID(), 'best', address, { ...address, zipCode: '48047', state: 'MI' }, { weight: '3', length: '14', width: '10', height: '5', preset: 'book-poly-mailer' });
    expect(website.estimate.customerPriceCents).toBe(quote.customerPriceCents);
  });
  it.each([{ originZip: 'BAD' }, { destinationCountry: 'CA' }, { weight: 0.09 }, { weight: 71 }, { length: 0 }, { service: 'media-mail' }, { shipmentCategory: 'other' }])('rejects invalid/non-US inputs before calling providers: %j', async (change) => {
    const { app, getRates } = await setup();
    const response = await app.inject({ method: 'POST', url: '/api/pricing/estimate', payload: { ...rateRequest(base), ...change } });
    expect(response.statusCode).toBe(422);
    expect(getRates).not.toHaveBeenCalled();
  });
  it('sends ZIP-only provider payloads with exact ounce conversion, without fake street data', async () => {
    const create = vi.fn(async () => ({ id: 'shp_fixture', rates: [] }) as never);
    const provider = new EasyPostRateProvider('test', { create });
    await provider.getRates(parsePublicRateInput({ ...base, weight: 0.5 }).input);
    const payload = JSON.parse(JSON.stringify(create.mock.calls[0]?.[0]));
    expect(payload.from_address).toEqual({ zip: '60101', country: 'US' });
    expect(payload.to_address).toEqual({ zip: '48047', country: 'US' });
    expect(payload.parcel).toEqual({ weight: 8, length: 14, width: 10, height: 5 });
  });
  it('restricts website CORS to estimates and preserves extension access', async () => {
    const { app } = await setup();
    const preflight = await app.inject({ method: 'OPTIONS', url: '/api/pricing/estimate', headers: { origin, 'access-control-request-method': 'POST' } });
    expect(preflight.headers['access-control-allow-origin']).toBe(origin);
    expect((await app.inject({ method: 'POST', url: '/api/pricing/quote', headers: { origin }, payload: {} })).statusCode).toBe(403);
    const blocked = await app.inject({ method: 'OPTIONS', url: '/api/pricing/estimate', headers: { origin: 'https://untrusted.example', 'access-control-request-method': 'POST' } });
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('throttles public requests and never exposes provider errors', async () => {
    const { app, getRates } = await setup();
    getRates.mockRejectedValue(new Error('secret provider credential'));
    for (let i = 0; i < 10; i++) {
      const response = await app.inject({ method: 'POST', url: '/api/pricing/estimate', payload: base });
      expect(response.statusCode).toBe(503);
      expect(response.body).not.toContain('secret');
    }
    const blocked = await app.inject({ method: 'POST', url: '/api/pricing/estimate', payload: base });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['retry-after']).toBe('60');
    expect(getRates).toHaveBeenCalledTimes(10);
  });
});

describe('public estimate abuse protection', () => {
  it('limits per client, resets each minute, and does not trust arbitrary forwarded IPs', async () => {
    const limiter = new PublicRateLimiter();
    for (let i = 0; i < 10; i++) expect(await limiter.allow('a', 0)).toBe(true);
    expect(await limiter.allow('a', 0)).toBe(false);
    expect(await limiter.allow('b', 0)).toBe(true);
    expect(await limiter.allow('a', 60000)).toBe(true);
    expect(publicRateClientIp('127.0.0.1', '1.2.3.4', false)).toBe('127.0.0.1');
    expect(publicRateClientIp('127.0.0.1', '1.2.3.4', true)).toBe('1.2.3.4');
  });
  it('uses parameterized atomic database counters across instances and fails closed without a production store', async () => {
    let count = 0;
    const database = { query: vi.fn(async () => ({ rows: [{ count: ++count }] })) };
    const first = new PublicRateLimiter(database, true), second = new PublicRateLimiter(database, true);
    for (let i = 0; i < 10; i++) expect(await (i % 2 ? first : second).allow('1.2.3.4', 0)).toBe(true);
    expect(await second.allow('1.2.3.4', 0)).toBe(false);
    expect(database.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), [expect.stringMatching(/^[a-f0-9]{64}$/)]);
    await expect(new PublicRateLimiter(undefined, true).allow('a')).rejects.toThrow('PostgreSQL');
  });
});
