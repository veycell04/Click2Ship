import { buildConfiguredApp } from './runtime.js';

try {
  process.loadEnvFile?.();
} catch {
  /* .env is optional */
}

const app = await buildConfiguredApp();

await app.listen({
  host: '127.0.0.1',
  port: Number(process.env.PORT ?? 3001),
});
