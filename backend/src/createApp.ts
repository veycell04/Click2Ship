import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { BackendConfig } from './config/env.js';
import {
  createShipAirLabelPayload,
  ShippingProviderError,
} from './providers/shipAirShippingProvider.js';
import { parseCreateLabelRequest, RequestValidationError } from './schemas/createLabel.js';
import { parsePricingQuoteInput } from './schemas/pricingQuote.js';
import type { LabelRepository } from './services/labelRepository.js';
import type { OrderRepository } from './services/orderRepository.js';
import {
  PricingRateUnavailableError,
  QuotePersistenceError,
  RetailRateUnavailableError,
  UnsupportedPricingServiceError,
  type PricingService,
} from './services/pricingService.js';
import { RateProviderError } from './services/rateProvider.js';
import type { PaymentProvider } from './types/payments.js';
import type { ShippingProvider } from './types/shipping.js';
import { safeDatabaseError } from './services/postgresRepositories.js';

export async function buildApp(
  config: BackendConfig,
  provider: ShippingProvider,
  repository: LabelRepository,
  paymentProvider?: PaymentProvider,
  orderRepository?: OrderRepository,
  pricingService?: PricingService,
  database?: { query(queryText: string): Promise<unknown> },
) {
  const app = Fastify({
    logger: { redact: ['req.headers.authorization', 'req.body.sender', 'req.body.recipient'] },
  });
  const configuredExtensionId = process.env.CLICK2SHIP_EXTENSION_ID || config.extensionId;
  const extensionOrigin = `chrome-extension://${configuredExtensionId}`;
  const labelTypeNames = new Map<number, string>();

  app.addHook('onRequest', async (request, reply) => {
    void reply;
    if (config.nodeEnv === 'development') {
      console.log({
        method: request.method,
        url: request.url,
        origin: request.headers.origin,
      });
    }
  });

  await app.register(cors, {
    origin(origin, callback) {
      const allowedOrigins = new Set([
        extensionOrigin,
        'http://127.0.0.1:3001',
        'http://localhost:3001',
      ]);
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      console.error('Blocked CORS origin:', origin);
      callback(new Error(`Origin not allowed: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Click2Ship-Dev-Token'],
  });

  app.get('/api/health', async (request, reply) => {
    if (!database) return { status: 'ok' };
    try {
      await database.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      const databaseError = safeDatabaseError(error);
      console.error('DATABASE_HEALTH_CHECK_FAILED', {
        name: databaseError.name,
        message: databaseError.message,
        code: databaseError.code,
        detail: databaseError.detail,
        hint: databaseError.hint,
        cause: databaseError.cause,
        stack: databaseError.stack,
      });
      request.log.error(
        {
          err: error,
          code: databaseError.code,
          detail: databaseError.detail,
          hint: databaseError.hint,
        },
        'DATABASE_HEALTH_CHECK_FAILED',
      );
      return reply.code(503).send({
        status: 'error',
        database: 'unavailable',
        databaseErrorCode: databaseError.code ?? 'UNKNOWN_DATABASE_ERROR',
        databaseErrorMessage: databaseError.message,
      });
    }
  });
  app.get('/', async () => ({ name: 'Click2Ship Backend', status: 'running' }));
  app.get('/payment/success', async (_request, reply) =>
    reply.type('text/html').send('<h1>Payment received</h1><p>You may return to Click2Ship.</p>'),
  );
  app.get('/payment/cancel', async (_request, reply) =>
    reply.type('text/html').send('<h1>Checkout canceled</h1><p>No label was created.</p>'),
  );
  app.get('/api/debug/origin', async (request) => ({
    receivedOrigin: request.headers.origin ?? null,
    allowedExtensionOrigin: extensionOrigin,
  }));
  app.get('/api/shipping/balance', async (_request, reply) => {
    if (config.nodeEnv !== 'development' && config.nodeEnv !== 'test') {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
    }
    return provider.getBalance();
  });
  app.get('/api/shipping/label-types', async () => {
    app.log.info(
      { route: '/api/shipping/label-types', shipAirBaseUrl: config.shipAirBaseUrl },
      'Label-types route entered',
    );
    try {
      const labelTypes = await provider.getLabelTypes();
      labelTypes.forEach((labelType) => labelTypeNames.set(labelType.id, labelType.name));
      app.log.info({ labelTypes }, 'Normalized label types');
      return { success: true, labelTypes };
    } catch (error) {
      app.log.error(
        {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Label-types route failed',
      );
      throw error;
    }
  });

  if (pricingService) {
    app.post('/api/pricing/quote', async (request, reply) => {
      try {
        const input = parsePricingQuoteInput(request.body);
        return {
          success: true,
          quote: await pricingService.getQuote(input),
        };
      } catch (error) {
        if (error instanceof RequestValidationError) {
          return reply.code(422).send({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Pricing information is invalid.',
            fieldErrors: { [error.field]: error.message },
          });
        }
        if (error instanceof UnsupportedPricingServiceError) {
          return reply.code(422).send({
            success: false,
            error: 'UNSUPPORTED_LABEL_TYPE',
            message: error.message,
          });
        }
        if (error instanceof PricingRateUnavailableError) {
          return reply.code(422).send({
            success: false,
            error: 'SERVICE_RATE_UNAVAILABLE',
            message: error.message,
            availableServices: error.availableServices,
          });
        }
        if (error instanceof RetailRateUnavailableError) {
          return reply.code(422).send({
            success: false,
            error: 'RETAIL_RATE_UNAVAILABLE',
            message: error.message,
          });
        }
        if (error instanceof QuotePersistenceError) {
          request.log.error({ diagnostic: error.diagnostic }, 'QUOTE_DATABASE_INSERT_FAILED');
          return reply.code(500).send({
            success: false,
            error: 'QUOTE_PERSISTENCE_FAILED',
            message: error.message,
          });
        }
        if (error instanceof RateProviderError) {
          app.log.error(
            { message: error.message, statusCode: error.statusCode, diagnostic: config.nodeEnv === 'development' ? error.diagnostic : undefined },
            'EasyPost rating failed',
          );
          return reply.code(error.statusCode).send({
            success: false,
            error: 'EASYPOST_ERROR',
            message: error.message,
            ...(config.nodeEnv === 'development' ? { diagnostic: error.diagnostic } : {}),
          });
        }
        throw error;
      }
    });
  }

  if (paymentProvider && orderRepository && pricingService) {
    app.post('/api/payments/checkout', async (request) => {
      const body = request.body as Record<string, unknown>;
      const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : '';
      if (!quoteId) throw new RequestValidationError('quoteId', 'A pricing quote is required.');
      const quote = await pricingService.getStoredQuote(quoteId);
      if (!quote) throw new RequestValidationError('quoteId', 'Pricing quote was not found.');
      if (new Date(quote.expiresAt).getTime() <= Date.now()) {
        throw new RequestValidationError('quoteId', 'Pricing quote has expired.');
      }
      const shipment = quote.shipmentSnapshot;
      const selectionId = shipment.selectionId;
      const existing = await orderRepository.findBySelectionId(selectionId);
      if (
        existing?.status === 'label_created' ||
        existing?.status === 'paid' ||
        existing?.status === 'label_processing' ||
        existing?.status === 'label_failed'
      ) {
        return { success: true, orderId: existing.id, status: existing.status };
      }
      if (
        existing?.stripeCheckoutSessionId &&
        ['checkout_created', 'payment_pending'].includes(existing.status)
      ) {
        return {
          success: true,
          orderId: existing.id,
          checkoutSessionId: existing.stripeCheckoutSessionId,
          checkoutUrl: existing.stripeCheckoutUrl,
        };
      }
      const now = new Date().toISOString();
      const order =
        existing ??
        (await orderRepository.create({
          id: crypto.randomUUID(),
          selectionId,
          quoteId,
          status: 'draft',
          amountCents: quote.customerPriceCents,
          currency: quote.currency,
          stripeCheckoutSessionId: '',
          stripeCheckoutUrl: '',
          stripePaymentIntentId: '',
          providerLabelId: '',
          trackingNumber: '',
          shipmentSnapshot: shipment,
          label: null,
          errorMessage: '',
          createdAt: now,
          updatedAt: now,
        }));
      const checkout = await paymentProvider.createCheckoutSession({
        orderId: order.id,
        quoteId: quote.quoteId,
        selectionId,
        serviceName: quote.serviceName,
        amountCents: quote.customerPriceCents,
        currency: quote.currency,
        successUrl: config.checkoutSuccessUrl,
        cancelUrl: config.checkoutCancelUrl,
      });
      await orderRepository.updateCheckout(order.id, checkout.id, checkout.url);
      return {
        success: true,
        orderId: order.id,
        checkoutSessionId: checkout.id,
        checkoutUrl: checkout.url,
        price: quote,
      };
    });

    app.get<{ Params: { orderId: string } }>(
      '/api/orders/:orderId/status',
      async (request, reply) => {
        const order = await orderRepository.findById(request.params.orderId);
        if (!order) return reply.code(404).send({ success: false, error: 'Order not found.' });
        return {
          success: true,
          order: {
            id: order.id,
            status: order.status,
            amountCents: order.amountCents,
            currency: order.currency,
            trackingNumber: order.trackingNumber,
            labelId: order.providerLabelId,
            downloadUrl: order.label?.downloadUrl || '',
            errorMessage: order.errorMessage,
            label: order.label,
          },
        };
      },
    );

    await app.register(async (webhookApp) => {
      webhookApp.removeContentTypeParser('application/json');
      webhookApp.addContentTypeParser(
        'application/json',
        { parseAs: 'buffer' },
        (_request, body, done) => done(null, body),
      );
      webhookApp.post('/api/webhooks/stripe', async (request, reply) => {
        const signature = request.headers['stripe-signature'];
        if (typeof signature !== 'string')
          return reply.code(400).send({ error: 'Missing Stripe signature.' });
        let event;
        try {
          event = paymentProvider.verifyWebhook(request.body as Buffer, signature);
        } catch {
          return reply.code(400).send({ error: 'Invalid Stripe signature.' });
        }
        if (event.type !== 'checkout.session.completed' || event.paymentStatus !== 'paid') {
          return { received: true };
        }
        const orderId = event.metadata.orderId;
        if (!orderId) return reply.code(400).send({ error: 'Missing order metadata.' });
        const existing = await orderRepository.findById(orderId);
        if (!existing) return reply.code(404).send({ error: 'Order not found.' });
        if (event.metadata.quoteId !== existing.quoteId || event.metadata.selectionId !== existing.selectionId) {
          return reply.code(400).send({ error: 'Webhook metadata did not match the order.' });
        }
        if (
          existing.status === 'label_created' ||
          existing.status === 'label_processing' ||
          existing.status === 'label_failed'
        ) return { received: true };
        await orderRepository.markPaid(orderId, event.paymentIntentId);
        const claimed = await orderRepository.claimLabelProcessing(orderId);
        if (!claimed) return { received: true };
        try {
          const providerLabel = await provider.createLabel(claimed.shipmentSnapshot);
          const label = {
            ...providerLabel,
            labelTypeId: claimed.shipmentSnapshot.labelTypeId,
            labelTypeName:
              providerLabel.labelTypeName ||
              labelTypeNames.get(claimed.shipmentSnapshot.labelTypeId) ||
              'Shipping label',
            downloadUrl: `/api/shipping/labels/${encodeURIComponent(providerLabel.id)}/download`,
            reference: claimed.shipmentSnapshot.reference,
          };
          await repository.markCompleted(claimed.selectionId, label, orderId);
          await orderRepository.markLabelCreated(orderId, label);
        } catch (error) {
          await orderRepository.markLabelFailed(
            orderId,
            error instanceof Error ? error.message : 'Label creation failed.',
          );
        }
        return { received: true };
      });
    });
  }
  app.post('/api/shipping/labels', async (request, reply) => {
    if (paymentProvider && orderRepository && pricingService) {
      return reply.code(409).send({
        success: false,
        error: 'PAYMENT_REQUIRED',
        message: 'Create a paid Checkout order before generating a label.',
      });
    }
    const routeBody = request.body as Record<string, unknown>;
    if (config.nodeEnv === 'development') {
      console.log('Route dimensions', {
        length: routeBody?.length,
        width: routeBody?.width,
        height: routeBody?.height,
        types: {
          length: typeof routeBody?.length,
          width: typeof routeBody?.width,
          height: typeof routeBody?.height,
        },
      });
    }
    const input = parseCreateLabelRequest(request.body);
    if (config.nodeEnv === 'development') {
      console.log('Normalized dimensions', {
        length: input.length,
        width: input.width,
        height: input.height,
      });
    }
    const existing = await repository.claimProcessing(input.selectionId);
    if (existing?.status === 'completed' && existing.label)
      return { success: true, label: existing.label };
    if (existing?.status === 'processing' || existing?.status === 'unknown') {
      return reply.code(202).send({ success: false, status: existing.status });
    }
    try {
      const providerLabel = await provider.createLabel(input);
      const label = {
        ...providerLabel,
        labelTypeId: input.labelTypeId,
        labelTypeName:
          providerLabel.labelTypeName || labelTypeNames.get(input.labelTypeId) || 'Shipping label',
        downloadUrl: `/api/shipping/labels/${encodeURIComponent(providerLabel.id)}/download`,
        reference: input.reference,
      };
      await repository.markCompleted(input.selectionId, label);
      return { success: true, label };
    } catch (error) {
      const code = error instanceof ShippingProviderError ? error.code : 'UNKNOWN_ERROR';
      await repository.markFailed(input.selectionId, code, code === 'LABEL_STATUS_UNKNOWN');
      throw error;
    }
  });
  app.get<{ Params: { selectionId: string } }>(
    '/api/shipping/labels/by-selection/:selectionId',
    async (request, reply) => {
      const record = await repository.findBySelectionId(request.params.selectionId);
      if (!record) return reply.code(404).send({ success: false, status: 'not_found' });
      if (record.status === 'completed' && record.label) {
        return { success: true, label: record.label };
      }
      return reply.code(202).send({ success: false, status: record.status });
    },
  );
  if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
    app.post('/api/debug/shipair-payload', async (request) => {
      const normalized = parseCreateLabelRequest(request.body);
      const shipAirPayload = createShipAirLabelPayload(normalized);
      console.log('Final ShipAir dimensions', {
        length_in: shipAirPayload.length_in,
        width_in: shipAirPayload.width_in,
        height_in: shipAirPayload.height_in,
      });
      console.log('Serialized ShipAir body', JSON.stringify(shipAirPayload));
      return { success: true, payload: shipAirPayload };
    });
  }
  app.get<{ Params: { id: string } }>('/api/shipping/labels/:id', async (request) =>
    provider.getLabel(request.params.id),
  );
  app.get<{ Params: { id: string } }>(
    '/api/shipping/labels/:id/download',
    async (request, reply) => {
      const record = await repository.findByLabelId(request.params.id);
      const download = await provider.downloadLabel(request.params.id);
      const tracking = record?.label?.trackingNumber || request.params.id;
      return reply
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="Click2Ship-${tracking.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
        )
        .send(Buffer.from(download.bytes));
    },
  );

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RequestValidationError)
      return reply.code(422).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Shipment information is invalid.',
        fieldErrors: { [error.field]: error.message },
      });
    if (error instanceof ShippingProviderError) {
      if (error.statusCode === 422)
        return reply.code(422).send({
          success: false,
          error: 'SHIPAIR_VALIDATION_ERROR',
          message: 'ShipAir rejected the label request.',
          shipAirStatus: 422,
          shipAirResponse: error.shipAirResponse ?? null,
        });
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }
    app.log.error({ err: error }, 'Unhandled backend error');
    return reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected backend error.' } });
  });
  return app;
}
