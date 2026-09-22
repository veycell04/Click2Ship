import { buildApp } from './createApp.js';
import { assertBackendConfig, loadConfig } from './config/env.js';
import { EasyPostRateProvider } from './providers/easyPostRateProvider.js';
import { ShipAirLabelProvider } from './providers/shipAirShippingProvider.js';
import { StripeCheckoutPaymentProvider } from './providers/stripeCheckoutPaymentProvider.js';
import { InMemoryLabelRepository } from './services/labelRepository.js';
import { InMemoryOrderRepository } from './services/orderRepository.js';
import {
  getClick2ShipPostgres,
  PostgresLabelRepository,
  PostgresOrderRepository,
  PostgresPricingQuoteRepository,
} from './services/postgresRepositories.js';
import {
  InMemoryPricingQuoteRepository,
  LiveEasyPostPricingService,
} from './services/pricingService.js';

export async function buildConfiguredApp() {
  const config = loadConfig();
  assertBackendConfig(config);

  console.log({
    configuredExtensionId: config.extensionId,
    allowedExtensionOrigin: `chrome-extension://${config.extensionId}`,
  });

  const shippingProvider = new ShipAirLabelProvider(
    config.shipAirBaseUrl,
    config.shipAirApiKey,
  );
  const paymentProvider =
    config.stripeSecretKey
      ? new StripeCheckoutPaymentProvider(
          config.stripeSecretKey,
          config.stripeWebhookSecret,
        )
      : undefined;
  const database = config.databaseUrl ? getClick2ShipPostgres(config.databaseUrl) : null;
  const quoteRepository = database
    ? new PostgresPricingQuoteRepository(database)
    : new InMemoryPricingQuoteRepository();
  const labelRepository = database
    ? new PostgresLabelRepository(database)
    : new InMemoryLabelRepository();
  const orderRepository = database
    ? new PostgresOrderRepository(database)
    : new InMemoryOrderRepository();
  const pricingService = new LiveEasyPostPricingService(
    new EasyPostRateProvider(config.easyPostApiKey),
    quoteRepository,
    config.shipDimeDiscountPercent,
    {
      enabled: config.bookShippingEnabled,
      discountPercent: config.bookDiscountPercent,
      targetPriceCents: config.bookTargetPriceCents,
      minimumMarginCents: config.bookMinMarginCents,
      mediaMailLabelTypeId: config.shipAirMediaMailLabelTypeId,
      confirmMediaMailSupport: async () => (await shippingProvider.getLabelTypes())
        .some((type) => type.id === config.shipAirMediaMailLabelTypeId),
    },
  );
  if (config.bookShippingEnabled && !config.shipAirMediaMailLabelTypeId) {
    console.warn('BOOK_MEDIA_MAIL_UNMAPPED: ShipAir currently exposes no verified Media Mail label type; book quotes will use the cheapest supported USPS fallback.');
  }

  return buildApp(
    config,
    shippingProvider,
    labelRepository,
    paymentProvider,
    orderRepository,
    pricingService,
    database?.pool,
  );
}
