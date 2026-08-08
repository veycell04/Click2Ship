import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

try {
  process.loadEnvFile?.();
} catch {
  /* .env is optional */
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to run migrations.');

const databaseUrl = new URL(connectionString);
const isLocal = ['localhost', '127.0.0.1'].includes(databaseUrl.hostname);
for (const parameter of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
  databaseUrl.searchParams.delete(parameter);
}

const pool = new Pool({
  connectionString: databaseUrl.toString(),
  // Scoped only to the managed PostgreSQL connection; global TLS verification stays enabled.
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  max: 1,
});

const migrationsDirectory = resolve(process.cwd(), 'migrations');
const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort();

const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS click2ship_schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  for (const file of files) {
    const applied = await client.query(
      'SELECT 1 FROM click2ship_schema_migrations WHERE name = $1',
      [file],
    );
    if (applied.rowCount) continue;
    const sql = await readFile(resolve(migrationsDirectory, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO click2ship_schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  const verification = await client.query<{
    quotes: string | null;
    orders: string | null;
    labels: string | null;
  }>(`SELECT
    to_regclass('public.quotes')::text AS quotes,
    to_regclass('public.orders')::text AS orders,
    to_regclass('public.labels')::text AS labels`);
  const relations = verification.rows[0];
  if (!relations?.quotes || !relations.orders || !relations.labels) {
    throw new Error('Database migration verification failed: required tables are missing.');
  }
  console.log('Migration verification complete', relations);
} finally {
  client.release();
  await pool.end();
}
