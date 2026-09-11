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
  shipDimeDiscountPercent: number;
  databaseUrl: string;
  bookShippingEnabled: boolean;
  bookTargetPriceCents: number;
  bookMinMarginCents: number;
  shipAirMediaMailLabelTypeId: number | null;
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
    shipDimeDiscountPercent: Number(
      env.SHIPDIME_DISCOUNT_PERCENT ?? env.CLICK2SHIP_DISCOUNT_PERCENT ?? 20,
    ),
    databaseUrl: env.DATABASE_URL || '',
    bookShippingEnabled: (env.BOOK_SHIPPING_ENABLED ?? 'true').toLowerCase() === 'true',
    bookTargetPriceCents: Number(env.BOOK_TARGET_PRICE_CENTS ?? 399),
    bookMinMarginCents: Number(env.BOOK_MIN_MARGIN_CENTS ?? 25),
    shipAirMediaMailLabelTypeId: env.SHIPAIR_MEDIA_MAIL_LABEL_TYPE_ID
      ? Number(env.SHIPAIR_MEDIA_MAIL_LABEL_TYPE_ID)
      : null,
  };
}

export function assertBackendConfig(config: BackendConfig): void {
  if (
    !Number.isFinite(config.shipDimeDiscountPercent) ||
    config.shipDimeDiscountPercent < 0 ||
    config.shipDimeDiscountPercent >= 100
  ) {
    throw new Error('SHIPDIME_DISCOUNT_PERCENT must be a number from 0 up to, but not including, 100.');
  }
  console.log('PRICING_CONFIGURATION', {
    discountPercent: config.shipDimeDiscountPercent,
  });
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
  if (!Number.isInteger(config.bookTargetPriceCents) || config.bookTargetPriceCents <= 0)
    throw new Error('BOOK_TARGET_PRICE_CENTS must be a positive integer.');
  if (!Number.isInteger(config.bookMinMarginCents) || config.bookMinMarginCents < 0)
    throw new Error('BOOK_MIN_MARGIN_CENTS must be a non-negative integer.');
  if (
    config.shipAirMediaMailLabelTypeId !== null &&
    (!Number.isInteger(config.shipAirMediaMailLabelTypeId) || config.shipAirMediaMailLabelTypeId <= 0)
  ) throw new Error('SHIPAIR_MEDIA_MAIL_LABEL_TYPE_ID must be a positive integer when configured.');
  if (
    config.nodeEnv === 'production' &&
    (!config.publicBaseUrl.startsWith('https://') ||
      /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(config.publicBaseUrl))
  ) {
    throw new Error('PUBLIC_APP_URL must be a public HTTPS URL in production.');
  }
  if (config.nodeEnv === 'production' && !config.databaseUrl)
    throw new Error('DATABASE_URL is required in production.');
}
