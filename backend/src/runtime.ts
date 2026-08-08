import { buildApp } from './createApp.js';
import { assertBackendConfig, loadConfig } from './config/env.js';
import { EasyPostRateProvider } from './providers/easyPostRateProvider.js';
import { ShipAirShippingProvider } from './providers/shipAirShippingProvider.js';
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

  const shippingProvider = new ShipAirShippingProvider(
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
    config.discountPercent,
  );

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
