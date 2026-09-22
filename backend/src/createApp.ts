import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { BackendConfig } from './config/env.js';
import { createShipAirLabelPayload } from './providers/shipAirShippingProvider.js';
import { parseCreateLabelRequest, RequestValidationError } from './schemas/createLabel.js';
import { parsePricingQuoteInput } from './schemas/pricingQuote.js';
import { parsePublicRateInput } from './schemas/publicRate.js';
import { PublicRateLimiter, publicRateClientIp, type RateLimitDatabase } from './services/publicRateLimiter.js';
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
import type { OrderRecord, PaymentProvider } from './types/payments.js';
import type { LabelProvider } from './types/shipping.js';
import { safeDatabaseError } from './services/postgresRepositories.js';
import { normalizeLabelProviderError } from './services/normalizeLabelProviderError.js';
import { getShippingServiceMapping } from './services/shippingServiceMapping.js';
import { LabelProviderError } from './services/labelProviderError.js';
import { buildLabelSuccessDetails } from './services/labelSuccessDetails.js';
import {
  DOMESTIC_SHIPPING_ONLY_RESPONSE,
  DomesticShippingOnlyError,
  validateDomesticShipment,
} from './services/domesticShipping.js';

export async function buildApp(
  config: BackendConfig,
  provider: LabelProvider,
  repository: LabelRepository,
  paymentProvider?: PaymentProvider,
  orderRepository?: OrderRepository,
  pricingService?: PricingService,
  database?: RateLimitDatabase,
) {
  const app = Fastify({
    logger: { redact: ['req.headers.authorization', 'req.body.sender', 'req.body.recipient'] },
  });
  const configuredExtensionId = process.env.CLICK2SHIP_EXTENSION_ID || config.extensionId;
  const extensionOrigin = `chrome-extension://${configuredExtensionId}`;
  const labelTypeNames = new Map<number, string>();
  const publicRateLimiter = new PublicRateLimiter(database, config.nodeEnv === 'production');
  const websiteOrigins = new Set(['https://www.shipdime.com', 'https://shipdime.com']);
  if (config.nodeEnv === 'development') websiteOrigins.add('http://localhost:3000');

  app.addHook('onRequest', async (request, reply) => {
    // Website origins only receive access to this read-only estimate endpoint.
    if (websiteOrigins.has(request.headers.origin ?? '') && request.url.split('?')[0] !== '/api/pricing/estimate') {
      return reply.code(403).send({ success: false, error: 'ORIGIN_NOT_ALLOWED' });
    }
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
        ...websiteOrigins,
        extensionOrigin,
        'chrome-extension://bigbipcdmphkgaajnjkhjdnkidcmplmg',
        'chrome-extension://cdpgindjbfdohkljljodighadpeoeefh',
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
  app.get<{ Querystring: { session_id?: string } }>('/payment/success', async (request, reply) => {
    let confirmedOrder: { orderId: string; amountCents: number; currency: string; status: string } | null = null;
    const sessionId = typeof request.query.session_id === 'string' ? request.query.session_id : '';
    if (sessionId && paymentProvider && orderRepository) {
      const session = await paymentProvider.getCheckoutSession(sessionId);
      const orderId = session?.metadata?.orderId;
      if (session?.paymentStatus === 'paid' && orderId) {
        const order = await orderRepository.findById(orderId);
        if (order?.stripeCheckoutSessionId === sessionId) {
          confirmedOrder = {
            orderId: order.id,
            amountCents: order.amountCents,
            currency: order.currency,
            status: order.status,
          };
        }
      }
    }
    const conversionState = JSON.stringify(confirmedOrder).replace(/</g, '\\u003c');
    return reply.type('text/html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment successful | ShipDime</title></head><body><main><h1>ShipDime</h1><h2>Payment successful</h2><p>Your payment was received.</p><p>We're creating your shipping label.</p><p>You can return to the ShipDime extension.</p></main><script async src="https://www.googletagmanager.com/gtag/js?id=AW-18426517051"></script><script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18426517051');
const purchase=${conversionState};
async function trackPurchase(order){
  if(!order)return;
  let current=order;
  for(let attempt=0;attempt<30&&current.status!=='label_created';attempt++){
    await new Promise(resolve=>setTimeout(resolve,2000));
    const response=await fetch('/api/orders/'+encodeURIComponent(current.orderId)+'/status');
    if(!response.ok)continue;
    const body=await response.json();
    if(body&&body.order)current={...current,status:body.order.status,amountCents:body.order.amountCents,currency:body.order.currency};
  }
  if(current.status!=='label_created'||!Number.isInteger(current.amountCents)||current.amountCents<=0)return;
  const key='shipdime-google-ads-purchase:'+current.orderId;
  if(localStorage.getItem(key))return;
  localStorage.setItem(key,'sent');
  gtag('event','conversion',{send_to:'AW-18426517051/jijcCK7Hhe0cELusudJE',value:current.amountCents/100,currency:'USD',transaction_id:current.orderId});
}
void trackPurchase(purchase);
</script></body></html>`);
  });
  app.get('/payment/cancel', async (_request, reply) =>
    reply.type('text/html').send('<main><h1>ShipDime</h1><h2>Payment canceled</h2><p>No payment was completed.</p><p>You can return to the ShipDime extension and try again.</p></main>'),
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
      const providerLabelTypes = await provider.getLabelTypes();
      const labelTypes = providerLabelTypes.map((labelType) => ({
        ...labelType,
        name: getShippingServiceMapping(labelType.id)?.displayName ?? labelType.name,
        ...(config.bookShippingEnabled && config.shipAirMediaMailLabelTypeId === labelType.id
          ? { bookService: 'media-mail', name: 'USPS Media Mail' } : {}),
      }));
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
    app.post('/api/pricing/estimate', { bodyLimit: 4096 }, async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      try {
        const allowed = await publicRateLimiter.allow(publicRateClientIp(request.ip, request.headers['x-forwarded-for']));
        if (!allowed) return reply.header('Retry-After', '60').code(429).send({ success: false, error: 'RATE_LIMITED' });
      } catch {
        return reply.code(503).send({ success: false, error: 'RATE_UNAVAILABLE' });
      }
      try {
        const { input, service } = parsePublicRateInput(request.body);
        if (!pricingService.getEstimate) return reply.code(503).send({ success: false, error: 'RATE_UNAVAILABLE' });
        const result = await pricingService.getEstimate(input, service);
        const display = (quote: Awaited<ReturnType<PricingService['getQuote']>>) => ({
          labelTypeId: quote.labelTypeId, serviceName: quote.serviceName,
          customerPriceCents: quote.customerPriceCents, customerDisplayAmount: quote.customerDisplayAmount,
          currency: quote.currency, shipmentCategory: quote.shipmentCategory, isMediaMail: quote.isMediaMail,
        });
        return { success: true, estimate: display(result.quote), options: result.options.map(display) };
      } catch (error) {
        if (error instanceof DomesticShippingOnlyError) return reply.code(422).send(DOMESTIC_SHIPPING_ONLY_RESPONSE);
        if (error instanceof RequestValidationError) return reply.code(422).send({ success: false, error: 'VALIDATION_ERROR', field: error.field });
        // Never expose provider, persistence, or configuration diagnostics publicly.
        return reply.code(503).send({ success: false, error: 'RATE_UNAVAILABLE' });
      }
    });
    app.post('/api/pricing/quote', async (request, reply) => {
      const candidate =
        request.body && typeof request.body === 'object'
          ? (request.body as Record<string, unknown>)
          : {};
      request.log.info(
        {
          selectedService: candidate.labelTypeId,
          weight: candidate.weight,
          weightUnit: 'lb',
          length: candidate.length,
          width: candidate.width,
          height: candidate.height,
          dimensionUnit: 'in',
        },
        'PRICING_QUOTE_INPUT_BEFORE_VALIDATION',
      );
      try {
        const input = parsePricingQuoteInput(request.body);
        return {
          success: true,
          quote: await pricingService.getQuote(input),
        };
      } catch (error) {
        if (error instanceof DomesticShippingOnlyError) {
          return reply.code(422).send(DOMESTIC_SHIPPING_ONLY_RESPONSE);
        }
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
            error: 'RATE_PROVIDER_ERROR',
            message: 'Unable to retrieve shipping rates.',
            ...(config.nodeEnv === 'development' ? { diagnostic: error.diagnostic } : {}),
          });
        }
        throw error;
      }
    });
  }

  if (orderRepository && pricingService) {
    const fulfillPaidOrder = async (order: OrderRecord, retry = false) => {
      const storedQuote = await pricingService.getStoredQuote(order.quoteId);
      if (!storedQuote) throw new Error('Stored fulfillment quote was not found.');

      if (retry) {
        const retryClaimed = await repository.claimRetryProcessing(order.selectionId);
        if (!retryClaimed) {
          const existingLabel = await repository.findBySelectionId(order.selectionId);
          if (existingLabel?.status === 'completed' && existingLabel.label) {
            await orderRepository.markLabelCreated(order.id, existingLabel.label);
            return existingLabel.label;
          }
          throw new Error('Label recovery is already in progress.');
        }
      } else {
        const existingLabel = await repository.claimProcessing(
          order.selectionId,
          storedQuote.fulfillmentProvider,
        );
        if (existingLabel?.status === 'completed' && existingLabel.label) {
          await orderRepository.markLabelCreated(order.id, existingLabel.label);
          return existingLabel.label;
        }
      }

      const domesticAddresses = validateDomesticShipment(
        order.shipmentSnapshot.sender,
        order.shipmentSnapshot.recipient,
      );
      const domesticShipment = { ...order.shipmentSnapshot, ...domesticAddresses };
      const purchased = { label: await provider.createLabel(domesticShipment), pdfUrl: '' };
      const providerLabel = purchased.label;
      const label = {
        ...providerLabel,
        labelTypeId: order.shipmentSnapshot.labelTypeId,
        labelTypeName:
          labelTypeNames.get(order.shipmentSnapshot.labelTypeId) ||
          providerLabel.labelTypeName ||
          'Shipping label',
        downloadUrl: `/api/shipping/labels/${encodeURIComponent(providerLabel.id)}/download`,
        reference: order.shipmentSnapshot.reference,
      };
      await repository.markCompleted(order.selectionId, label, order.id, purchased.pdfUrl);
      await orderRepository.markLabelCreated(order.id, label);
      return label;
    };

    app.post('/api/payments/checkout', async (request, reply) => {
      if (!paymentProvider) {
        return reply.code(503).send({
          success: false,
          error: 'PAYMENTS_NOT_CONFIGURED',
          message: 'Stripe payments are not configured.',
        });
      }
      const body = request.body as Record<string, unknown>;
      const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : '';
      if (!quoteId) {
        return reply.code(422).send({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'A pricing quote is required.',
          fieldErrors: { quoteId: 'A pricing quote is required.' },
        });
      }
      const quote = await pricingService.getStoredQuote(quoteId);
      if (!quote) {
        return reply.code(404).send({
          success: false,
          error: 'QUOTE_NOT_FOUND',
          message: 'Pricing quote was not found.',
        });
      }
      if (new Date(quote.expiresAt).getTime() <= Date.now()) {
        return reply.code(422).send({
          success: false,
          error: 'QUOTE_EXPIRED',
          message: 'Pricing quote has expired.',
        });
      }
      if (
        !Number.isInteger(quote.customerPriceCents) ||
        quote.customerPriceCents <= 0 ||
        !quote.currency ||
        !quote.shipmentSnapshot
      ) {
        return reply.code(422).send({
          success: false,
          error: 'INVALID_QUOTE',
          message: 'The stored pricing quote is incomplete.',
        });
      }
      let domesticAddresses;
      try {
        domesticAddresses = validateDomesticShipment(
          quote.shipmentSnapshot.sender,
          quote.shipmentSnapshot.recipient,
        );
      } catch (error) {
        if (error instanceof DomesticShippingOnlyError) {
          return reply.code(422).send(DOMESTIC_SHIPPING_ONLY_RESPONSE);
        }
        throw error;
      }
      const shipment = { ...quote.shipmentSnapshot, ...domesticAddresses };
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
        const session = await paymentProvider.getCheckoutSession(existing.stripeCheckoutSessionId);
        if (session?.paymentStatus === 'paid') {
          return { success: true, orderId: existing.id, status: existing.status };
        }
        const hasLocalRedirect = [session?.successUrl, session?.cancelUrl].some((url) =>
          /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url || ''),
        );
        const reusable =
          session?.status === 'open' &&
          session.paymentStatus === 'unpaid' &&
          Boolean(session.url) &&
          session.successUrl === config.checkoutSuccessUrl &&
          session.cancelUrl === config.checkoutCancelUrl &&
          !hasLocalRedirect;
        if (reusable) {
          return {
            success: true,
            orderId: existing.id,
            checkoutSessionId: session.id,
            checkoutUrl: session.url,
          };
        }
      }
      const now = new Date().toISOString();
      const order =
        existing ??
        (await orderRepository.create({
          id: crypto.randomUUID(),
          selectionId,
          quoteId,
          status: 'checkout_created',
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
      console.log('STRIPE_CHECKOUT_REDIRECTS', {
        successUrl: config.checkoutSuccessUrl,
        cancelUrl: config.checkoutCancelUrl,
        publicAppUrl: config.publicBaseUrl,
      });
      const checkout = await paymentProvider.createCheckoutSession({
        orderId: order.id,
        quoteId: quote.quoteId,
        selectionId,
        serviceName: quote.serviceName,
        amountCents: quote.customerPriceCents,
        currency: quote.currency,
        successUrl: config.checkoutSuccessUrl,
        cancelUrl: config.checkoutCancelUrl,
        replacementForSessionId: existing?.stripeCheckoutSessionId || undefined,
      });
      await orderRepository.updateCheckout(order.id, checkout.id, checkout.url);
      return {
        success: true,
        orderId: order.id,
        checkoutSessionId: checkout.id,
        checkoutUrl: checkout.url,
      };
    });

    app.get<{ Params: { orderId: string } }>(
      '/api/orders/:orderId/status',
      async (request, reply) => {
        const order = await orderRepository.findById(request.params.orderId);
        if (!order) return reply.code(404).send({ success: false, error: 'Order not found.' });
        const snapshot = order.shipmentSnapshot as unknown as Record<string, unknown>;
        const recipientSnapshot =
          snapshot?.recipient && typeof snapshot.recipient === 'object'
            ? (snapshot.recipient as Record<string, unknown>)
            : {};
        const serviceName =
          order.label?.labelTypeName ||
          getShippingServiceMapping(order.shipmentSnapshot.labelTypeId)?.displayName ||
          'USPS shipping label';
        const label = buildLabelSuccessDetails(order, serviceName);
        if (config.nodeEnv === 'development') {
          console.log('SUCCESS_SCREEN_SOURCE', {
            orderId: order.id,
            shipmentSnapshotKeys: Object.keys(snapshot ?? {}),
            recipientKeys: Object.keys(recipientSnapshot),
            packageKeys: ['weight', 'length', 'width', 'height'].filter((key) => key in snapshot),
            serviceName,
          });
        }
        return {
          success: true,
          label,
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
            quoteId: order.quoteId,
            selectionId: order.selectionId,
            serviceName,
            createdAt: order.createdAt,
          },
        };
      },
    );

    app.post<{ Params: { orderId: string } }>(
      '/api/orders/:orderId/retry-label',
      async (request, reply) => {
        const order = await orderRepository.findById(request.params.orderId);
        if (!order) {
          return reply.code(404).send({ success: false, error: 'ORDER_NOT_FOUND' });
        }
        if (order.status === 'label_created') {
          return { success: true, orderId: order.id, status: order.status };
        }
        if (order.status === 'label_processing') {
          return { success: true, orderId: order.id, status: order.status };
        }
        if (order.status !== 'label_failed') {
          return reply.code(409).send({
            success: false,
            error: 'ORDER_NOT_RECOVERABLE',
            message: 'This paid order is not eligible for label recovery.',
          });
        }
        const claimed = await orderRepository.claimLabelRetryProcessing(order.id);
        if (!claimed) {
          const current = await orderRepository.findById(order.id);
          return {
            success: true,
            orderId: order.id,
            status: current?.status ?? 'label_processing',
          };
        }
        try {
          await fulfillPaidOrder(claimed, true);
          return { success: true, orderId: claimed.id, status: 'label_created' };
        } catch {
          await repository.markFailed(claimed.selectionId, 'LABEL_CREATION_FAILED');
          await orderRepository.markLabelFailed(
            claimed.id,
            "Payment received, but we couldn't create your label. Contact support for help.",
          );
          return reply.code(502).send({
            success: false,
            error: 'LABEL_RECOVERY_FAILED',
            message: "Payment received, but we couldn't create your label.",
          });
        }
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
        if (!paymentProvider || !config.stripeWebhookSecret) {
          return reply.code(503).send({
            success: false,
            error: 'PAYMENTS_NOT_CONFIGURED',
          });
        }
        const signature = request.headers['stripe-signature'];
        if (typeof signature !== 'string')
          return reply.code(400).send({ error: 'Missing Stripe signature.' });
        let event;
        try {
          event = paymentProvider.verifyWebhook(request.body as Buffer, signature);
        } catch {
          return reply.code(400).send({ error: 'Invalid Stripe signature.' });
        }
        if (event.type === 'checkout.session.expired') {
          const orderId = event.metadata.orderId;
          if (orderId) {
            const order = await orderRepository.findById(orderId);
            if (
              order &&
              ['draft', 'checkout_created', 'payment_pending'].includes(order.status)
            ) {
              await orderRepository.updateStatus(orderId, 'payment_failed');
            }
          }
          return { received: true };
        }
        if (event.type === 'payment_intent.payment_failed') {
          const orderId = event.metadata.orderId;
          if (orderId) {
            const order = await orderRepository.findById(orderId);
            if (
              order &&
              ['draft', 'checkout_created', 'payment_pending'].includes(order.status)
            ) {
              await orderRepository.updateStatus(orderId, 'payment_failed');
            }
          }
          return { received: true };
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
          await fulfillPaidOrder(claimed);
        } catch {
          await repository.markFailed(claimed.selectionId, 'LABEL_CREATION_FAILED');
          await orderRepository.markLabelFailed(
            orderId,
            "Payment received, but we couldn't create your label. Please contact support. You will not be charged again.",
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
      const domesticAddresses = validateDomesticShipment(input.sender, input.recipient);
      const providerLabel = await provider.createLabel({ ...input, ...domesticAddresses });
      const label = {
        ...providerLabel,
        labelTypeId: input.labelTypeId,
        labelTypeName:
          labelTypeNames.get(input.labelTypeId) || providerLabel.labelTypeName || 'Shipping label',
        downloadUrl: `/api/shipping/labels/${encodeURIComponent(providerLabel.id)}/download`,
        reference: input.reference,
      };
      await repository.markCompleted(input.selectionId, label);
      return { success: true, label };
    } catch (error) {
      const code = error instanceof LabelProviderError ? error.code : 'UNKNOWN_ERROR';
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
      const providerDownloadUrl = record?.providerDownloadUrl;
      const download = providerDownloadUrl
        ? await (async () => {
            const response = await fetch(providerDownloadUrl);
            if (!response.ok) throw new Error('Unable to download the shipping label.');
            return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: 'application/pdf' as const };
          })()
        : await provider.downloadLabel(request.params.id);
      const tracking = record?.label?.trackingNumber || request.params.id;
      return reply
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="ShipDime-${tracking.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
        )
        .send(Buffer.from(download.bytes));
    },
  );

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomesticShippingOnlyError)
      return reply.code(422).send(DOMESTIC_SHIPPING_ONLY_RESPONSE);
    if (error instanceof RequestValidationError)
      return reply.code(422).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Shipment information is invalid.',
        fieldErrors: { [error.field]: error.message },
      });
    if (error instanceof LabelProviderError) {
      app.log.error(
        { provider: 'ShipAir', status: error.statusCode, code: error.code },
        'LABEL_PROVIDER_REQUEST_FAILED',
      );
      const normalized = normalizeLabelProviderError(error);
      return reply.code(normalized.statusCode).send(normalized.body);
    }
    app.log.error({ err: error }, 'Unhandled backend error');
    return reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected backend error.' } });
  });
  return app;
}
