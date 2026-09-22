import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export interface RateLimitDatabase { query(sql: string, values?: unknown[]): Promise<unknown> }

// Only trust Vercel's overwritten client-IP header while running on Vercel.
// Other deployments use the socket IP, never arbitrary forwarded headers.
export function publicRateClientIp(socketIp: string, forwarded: string | string[] | undefined, onVercel = process.env.VERCEL === '1') {
  return onVercel && typeof forwarded === 'string' && isIP(forwarded.trim()) ? forwarded.trim() : socketIp;
}

export class PublicRateLimiter {
  private readonly buckets = new Map<string, { count: number; minute: number }>();
  constructor(private readonly database?: RateLimitDatabase, private readonly production = false) {}
  async allow(ip: string, now = Date.now()): Promise<boolean> {
    const minute = Math.floor(now / 60_000);
    const key = createHash('sha256').update(`public-rate:${minute}:${ip}`).digest('hex');
    if (this.database) {
      // Atomic fixed-window counter shared across serverless instances. Only
      // minute-salted hashes are retained; no raw IP or shipment data is stored.
      const result = await this.database.query(`
        WITH cleanup AS (DELETE FROM public_rate_limits WHERE expires_at < now())
        INSERT INTO public_rate_limits (key, count, expires_at)
        VALUES ($1, 1, now() + interval '2 minutes')
        ON CONFLICT (key) DO UPDATE SET count = public_rate_limits.count + 1
        RETURNING count`, [key]) as { rows: { count: number }[] };
      return Number(result.rows[0]?.count) <= 10;
    }
    // Public production traffic must not bypass distributed abuse protection.
    if (this.production) throw new Error('Public rate limiter requires PostgreSQL.');
    for (const [key, bucket] of this.buckets) if (bucket.minute !== minute) this.buckets.delete(key);
    const bucket = this.buckets.get(key) ?? { count: 0, minute };
    if (!this.buckets.has(key) && this.buckets.size >= 10_000) return false;
    bucket.count++;
    this.buckets.set(key, bucket);
    return bucket.count <= 10;
  }
}
