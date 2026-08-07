# Click2Ship backend deployment

## PostgreSQL

Production requires `DATABASE_URL`. The backend uses the lightweight `pg` driver and a small, reusable connection pool. Vercel warm invocations reuse the configured Fastify application and PostgreSQL pool.

Set these Vercel environment variables for the backend project:

- `NODE_ENV=production`
- `DATABASE_URL`
- `SHIPAIR_BASE_URL`
- `SHIPAIR_API_KEY`
- `EASYPOST_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLICK2SHIP_EXTENSION_ID`
- `CLICK2SHIP_PUBLIC_BASE_URL`
- `CLICK2SHIP_SUCCESS_URL`
- `CLICK2SHIP_CANCEL_URL`

Apply migrations intentionally from a trusted workstation or deployment job:

```bash
cd backend
npm install
npm run db:migrate
```

The migration runner records applied SQL files in `click2ship_schema_migrations`. It does not drop tables or reset data. Application startup performs only a `SELECT 1` readiness check and never runs migrations.

## Vercel

Use `backend` as the Vercel project root. The callable serverless entry is `api/index.ts`; `vercel.json` rewrites the API and payment callback paths to that cached Fastify handler.

After deployment, verify:

```text
GET https://YOUR-PROJECT.vercel.app/api/health
```

A healthy production response includes `"database":"connected"`. A database connectivity failure returns HTTP 503 without exposing credentials.
