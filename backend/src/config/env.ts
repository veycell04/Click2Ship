export interface BackendConfig {
  shipAirBaseUrl: string;
  shipAirApiKey: string;
  extensionId: string;
  nodeEnv: string;
  port: number;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  publicBaseUrl: string;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
  easyPostApiKey: string;
  discountPercent: number;
  databaseUrl: string;
}

export const normalizePublicAppUrl = (value: string): string => value.trim().replace(/\/+$/, '');

export const paymentRedirectUrls = (publicAppUrl: string) => {
  const baseUrl = normalizePublicAppUrl(publicAppUrl);
  return {
    successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/payment/cancel`,
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const publicBaseUrl = normalizePublicAppUrl(env.PUBLIC_APP_URL || 'http://127.0.0.1:3001');
  const redirects = paymentRedirectUrls(publicBaseUrl);
  return {
    shipAirBaseUrl: env.SHIPAIR_BASE_URL || 'https://shipair.site/api/v1',
    shipAirApiKey: env.SHIPAIR_API_KEY || '',
    extensionId: env.CLICK2SHIP_EXTENSION_ID || '',
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3001),
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    publicBaseUrl,
    checkoutSuccessUrl: redirects.successUrl,
    checkoutCancelUrl: redirects.cancelUrl,
    easyPostApiKey: env.EASYPOST_API_KEY || '',
    discountPercent: Number(env.CLICK2SHIP_DISCOUNT_PERCENT ?? 20),
    databaseUrl: env.DATABASE_URL || '',
  };
}

export function assertBackendConfig(config: BackendConfig): void {
  console.log('Click2Ship backend configuration', {
    shipAirBaseUrlConfigured: Boolean(config.shipAirBaseUrl),
    shipAirApiKeyConfigured: Boolean(config.shipAirApiKey),
    shipAirApiKeyLength: config.shipAirApiKey.length,
    stripeSecretKeyConfigured: Boolean(config.stripeSecretKey),
    stripeWebhookSecretConfigured: Boolean(config.stripeWebhookSecret),
    easyPostApiKeyConfigured: Boolean(config.easyPostApiKey),
    easyPostApiKeyLength: config.easyPostApiKey.length,
    databaseConfigured: Boolean(config.databaseUrl),
  });
  if (!config.shipAirBaseUrl) throw new Error('SHIPAIR_BASE_URL is required.');
  if (!config.shipAirApiKey) throw new Error('SHIPAIR_API_KEY is missing. Add it to backend/.env.');
  if (!config.extensionId)
    throw new Error('CLICK2SHIP_EXTENSION_ID is missing. Add it to backend/.env.');
  if (
    config.stripeSecretKey &&
    !config.stripeSecretKey.startsWith('sk_test_') &&
    !config.stripeSecretKey.startsWith('sk_live_')
  ) {
    throw new Error('STRIPE_SECRET_KEY must be a Stripe secret key beginning with sk_test_ or sk_live_.');
  }
  if (!config.easyPostApiKey)
    throw new Error('EASYPOST_API_KEY is missing. Add it to backend/.env.');
  if (
    config.nodeEnv === 'production' &&
    /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(config.publicBaseUrl)
  ) {
    throw new Error('PUBLIC_APP_URL must be a public HTTPS URL in production and cannot use localhost, 127.0.0.1, or 0.0.0.0.');
  }
  if (config.nodeEnv === 'production' && !config.databaseUrl)
    throw new Error('DATABASE_URL is required in production.');
}
