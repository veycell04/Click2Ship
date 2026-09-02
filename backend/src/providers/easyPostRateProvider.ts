import EasyPostClientImport, { type IShipment, type IShipmentCreateParameters } from '@easypost/api';
import type { RateProvider, RateRequest, ReferenceRate, SupportedCarrier } from '../services/rateProvider.js';
import { RateProviderError } from '../services/rateProvider.js';

export interface EasyPostShipmentClient { create(parameters: IShipmentCreateParameters): Promise<IShipment>; }
const EasyPostClient = EasyPostClientImport as unknown as new (apiKey: string, options?: { timeout?: number }) => { Shipment: EasyPostShipmentClient };

const address = (value: RateRequest['sender']) => ({
  name: value.fullName, company: value.company || undefined, street1: value.address1,
  street2: value.address2 || undefined, city: value.city, state: value.state, zip: value.zip,
  country: value.country || 'US', phone: value.phone || undefined,
});

export const parseRateCents = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [dollars, fraction = ''] = value.split('.');
  const result = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
};

export const normalizeCarrier = (value: string): SupportedCarrier | null => {
  const normalized = value.toUpperCase();
  if (normalized === 'USPS') return 'USPS';
  if (normalized === 'UPS' || normalized === 'UPSDAP') return 'UPS';
  if (normalized === 'FEDEX' || normalized === 'FEDEXDEFAULT') return 'FedEx';
  return null;
};

export const poundsToOunces = (weightLb: number): number => weightLb * 16;

const SERVICE_NAMES: Record<string, string> = {
  'USPS:Priority': 'USPS Priority Mail', 'USPS:GroundAdvantage': 'USPS Ground Advantage',
  'USPS:Express': 'USPS Priority Mail Express', 'FedEx:FEDEX_GROUND': 'FedEx Ground',
  'FedEx:SMART_POST': 'FedEx Ground Economy', 'FedEx:GROUND_HOME_DELIVERY': 'FedEx Home Delivery',
  'FedEx:FEDEX_2_DAY': 'FedEx 2Day', 'FedEx:FEDEX_EXPRESS_SAVER': 'FedEx Express Saver',
  'UPS:Ground': 'UPS Ground', 'UPS:UPS_GROUND': 'UPS Ground', 'UPS:GroundSaver': 'UPS Ground Saver',
  'UPS:UPS_2ND_DAY_AIR': 'UPS 2nd Day Air',
};
export const serviceDisplayName = (carrier: SupportedCarrier, code: string) =>
  SERVICE_NAMES[`${carrier}:${code}`] ?? `${carrier} ${code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;

const ineligibleService = (service: string) => /freight|pickup|return/i.test(service);
const normalizedStatus = (error: unknown): number => {
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return 504;
  const candidate = error as { statusCode?: unknown; status?: unknown } | null;
  const status = Number(candidate?.statusCode ?? candidate?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 503;
};

export class EasyPostRateProvider implements RateProvider {
  private readonly shipmentClient: EasyPostShipmentClient;
  constructor(apiKey: string, shipmentClient?: EasyPostShipmentClient) {
    this.shipmentClient = shipmentClient ?? new EasyPostClient(apiKey, { timeout: 8_000 }).Shipment;
  }
  async getRates(input: RateRequest): Promise<ReferenceRate[]> {
    if (input.sender.country !== 'US' || input.recipient.country !== 'US') return [];
    try {
      const shipment = await this.shipmentClient.create({
        from_address: address(input.sender), to_address: address(input.recipient),
        parcel: { weight: poundsToOunces(input.weight), length: input.length, width: input.width, height: input.height },
      });
      const rawRates = shipment.rates ?? [];
      const rates = rawRates.flatMap((rate): ReferenceRate[] => {
        const carrier = normalizeCarrier(rate.carrier);
        const rateCents = parseRateCents(rate.rate);
        const currency = String((rate as { currency?: unknown }).currency ?? 'USD').toUpperCase();
        if (!carrier || !rate.id || !rateCents || currency !== 'USD' || ineligibleService(rate.service)) return [];
        return [{ providerShipmentId: shipment.id, providerRateId: rate.id, carrier,
          providerCarrier: rate.carrier, serviceCode: rate.service,
          serviceName: serviceDisplayName(carrier, rate.service), rateCents, currency: 'USD',
          deliveryDays: Number.isInteger(rate.delivery_days) ? rate.delivery_days : null,
          deliveryDate: rate.delivery_date || null, guaranteed: rate.delivery_date_guaranteed === true }];
      });
      const cheapest = [...rates].sort((a, b) => a.rateCents - b.rateCents)[0];
      console.log('RATE_SHOP_RESULT', { totalRates: rawRates.length, supportedRates: rates.length,
        cheapest: cheapest ? { carrier: cheapest.carrier, service: cheapest.serviceCode,
          rateCents: cheapest.rateCents } : null });
      return rates;
    } catch (error) {
      const status = normalizedStatus(error);
      throw new RateProviderError('Unable to retrieve shipping rates.', status, status === 504 ? 'RATE_TIMEOUT' : 'RATE_PROVIDER_ERROR');
    }
  }
}
