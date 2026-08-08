import { describe, expect, it, vi } from 'vitest';
import { assertBackendConfig, loadConfig } from '../src/config/env.js';

describe('backend environment validation', () => {
  it('fails startup clearly when the ShipAir API key is missing', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const config = loadConfig({
      SHIPAIR_BASE_URL: 'https://shipair.site/api/v1',
      SHIPAIR_API_KEY: '',
      CLICK2SHIP_EXTENSION_ID: 'extension-id',
      EASYPOST_API_KEY: 'EZTKtest',
    });
    expect(() => assertBackendConfig(config)).toThrow(
      'SHIPAIR_API_KEY is missing. Add it to backend/.env.',
    );
    expect(log).toHaveBeenCalledWith('Click2Ship backend configuration', {
      shipAirBaseUrlConfigured: true,
      shipAirApiKeyConfigured: false,
      shipAirApiKeyLength: 0,
      stripeSecretKeyConfigured: false,
      stripeWebhookSecretConfigured: false,
      easyPostApiKeyConfigured: true,
      easyPostApiKeyLength: 8,
      databaseConfigured: false,
    });
    log.mockRestore();
  });

  it('refuses production startup without persistent Postgres storage', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const config = loadConfig({
      NODE_ENV: 'production',
      SHIPAIR_BASE_URL: 'https://shipair.site/api/v1',
      SHIPAIR_API_KEY: 'shipair-key',
      CLICK2SHIP_EXTENSION_ID: 'extension-id',
      EASYPOST_API_KEY: 'EZTKtest',
      STRIPE_SECRET_KEY: 'sk_test_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
    });
    expect(() => assertBackendConfig(config)).toThrow('DATABASE_URL is required in production.');
    log.mockRestore();
  });

  it('rejects a Stripe publishable key in the backend secret-key setting', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const config = loadConfig({
      SHIPAIR_BASE_URL: 'https://shipair.site/api/v1',
      SHIPAIR_API_KEY: 'shipair-key',
      CLICK2SHIP_EXTENSION_ID: 'extension-id',
      EASYPOST_API_KEY: 'EZTKtest',
      STRIPE_SECRET_KEY: 'pk_test_example',
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
    });

    expect(() => assertBackendConfig(config)).toThrow(
      'STRIPE_SECRET_KEY must be a Stripe secret key beginning with sk_test_ or sk_live_.',
    );
    log.mockRestore();
  });

  it('allows a Stripe secret key without requiring webhook configuration at startup', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const config = loadConfig({
      SHIPAIR_API_KEY: 'shipair-key',
      CLICK2SHIP_EXTENSION_ID: 'extension-id',
      EASYPOST_API_KEY: 'EZTKtest',
      STRIPE_SECRET_KEY: 'sk_live_example',
    });
    expect(() => assertBackendConfig(config)).not.toThrow();
    log.mockRestore();
  });
});
