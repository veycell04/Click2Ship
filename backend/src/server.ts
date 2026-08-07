import { buildApp } from './app.js';
import { assertBackendConfig, loadConfig } from './config/env.js';
import { ShipAirShippingProvider } from './providers/shipAirShippingProvider.js';
import { StripeCheckoutPaymentProvider } from './providers/stripeCheckoutPaymentProvider.js';
import { EasyPostRateProvider } from './providers/easyPostRateProvider.js';
import { InMemoryLabelRepository } from './services/labelRepository.js';
import { InMemoryOrderRepository } from './services/orderRepository.js';
import {
  Click2ShipPostgres,
  PostgresLabelRepository,
  PostgresOrderRepository,
  PostgresPricingQuoteRepository,
} from './services/postgresRepositories.js';
import {
  InMemoryPricingQuoteRepository,
  LiveEasyPostPricingService,
} from './services/pricingService.js';

try {
  process.loadEnvFile?.();
} catch {
  /* .env is optional */
}
const config = loadConfig();
assertBackendConfig(config);
console.log({
  configuredExtensionId: process.env.CLICK2SHIP_EXTENSION_ID,
  allowedExtensionOrigin: `chrome-extension://${process.env.CLICK2SHIP_EXTENSION_ID}`,
});
const provider = new ShipAirShippingProvider(config.shipAirBaseUrl, config.shipAirApiKey);
const paymentProvider =
  config.stripeSecretKey && config.stripeWebhookSecret
    ? new StripeCheckoutPaymentProvider(
        process.env.STRIPE_SECRET_KEY!,
        process.env.STRIPE_WEBHOOK_SECRET!,
      )
    : undefined;
const database = config.databaseUrl ? new Click2ShipPostgres(config.databaseUrl) : null;
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
const app = await buildApp(
  config,
  provider,
  labelRepository,
  paymentProvider,
  paymentProvider ? orderRepository : undefined,
  pricingService,
);
await app.listen({ host: config.nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1', port: config.port });
