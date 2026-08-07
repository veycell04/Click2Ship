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

const pool = new Pool({
  connectionString,
  ssl:
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? undefined
      : { rejectUnauthorized: false },
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
} finally {
  client.release();
  await pool.end();
}
