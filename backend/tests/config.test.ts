import { describe, expect, it, vi } from 'vitest';
import { assertBackendConfig, loadConfig, paymentRedirectUrls } from '../src/config/env.js';

describe('backend environment validation', () => {
  it('prefers SHIPDIME_DISCOUNT_PERCENT and temporarily supports the legacy name', () => {
    expect(loadConfig({ SHIPDIME_DISCOUNT_PERCENT: '30', CLICK2SHIP_DISCOUNT_PERCENT: '20' })
      .shipDimeDiscountPercent).toBe(30);
    expect(loadConfig({ CLICK2SHIP_DISCOUNT_PERCENT: '25' }).shipDimeDiscountPercent).toBe(25);
    expect(loadConfig({}).shipDimeDiscountPercent).toBe(20);
  });

  it.each(['not-a-number', '-1', '100'])(
    'rejects invalid SHIPDIME_DISCOUNT_PERCENT %s',
    (value) => {
      const config = loadConfig({ SHIPDIME_DISCOUNT_PERCENT: value });
      expect(() => assertBackendConfig(config)).toThrow('SHIPDIME_DISCOUNT_PERCENT');
    },
  );

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
      PUBLIC_APP_URL: 'https://click2-ship.vercel.app',
    });
    expect(() => assertBackendConfig(config)).toThrow('DATABASE_URL is required in production.');
    log.mockRestore();
  });

  it('builds local redirect URLs and preserves Stripe session placeholder', () => {
    const config = loadConfig({ PUBLIC_APP_URL: 'http://127.0.0.1:3001/' });
    expect(config.publicBaseUrl).toBe('http://127.0.0.1:3001');
    expect(config.checkoutSuccessUrl).toBe('http://127.0.0.1:3001/payment/success?session_id={CHECKOUT_SESSION_ID}');
    expect(config.checkoutCancelUrl).toBe('http://127.0.0.1:3001/payment/cancel');
  });

  it('builds production redirect URLs from PUBLIC_APP_URL', () => {
    expect(paymentRedirectUrls('https://click2-ship.vercel.app/')).toEqual({
      successUrl: 'https://click2-ship.vercel.app/payment/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://click2-ship.vercel.app/payment/cancel',
    });
  });

  it.each(['http://localhost:3001', 'http://127.0.0.1:3001', 'http://0.0.0.0:3001'])(
    'rejects development redirect host %s in production',
    (publicAppUrl) => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const config = loadConfig({ NODE_ENV: 'production', PUBLIC_APP_URL: publicAppUrl,
        SHIPAIR_API_KEY: 'shipair-key', CLICK2SHIP_EXTENSION_ID: 'extension-id',
        EASYPOST_API_KEY: 'EZTKtest', DATABASE_URL: 'postgresql://configured' });
      expect(() => assertBackendConfig(config)).toThrow(
        'PUBLIC_APP_URL must be a public HTTPS URL in production.',
      );
      log.mockRestore();
    },
  );

  it('rejects a non-HTTPS public URL in production', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const config = loadConfig({
      NODE_ENV: 'production',
      PUBLIC_APP_URL: 'http://click2-ship.vercel.app',
      SHIPAIR_API_KEY: 'shipair-key',
      CLICK2SHIP_EXTENSION_ID: 'extension-id',
      EASYPOST_API_KEY: 'EZTKtest',
      DATABASE_URL: 'postgresql://configured',
    });
    expect(() => assertBackendConfig(config)).toThrow(
      'PUBLIC_APP_URL must be a public HTTPS URL in production.',
    );
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
