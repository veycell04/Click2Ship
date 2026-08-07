import EasyPostClientImport, { type IShipment, type IShipmentCreateParameters } from '@easypost/api';
import type { RateProvider, RateRequest, ReferenceRate } from '../services/rateProvider.js';
import { RateProviderError } from '../services/rateProvider.js';

export interface EasyPostShipmentClient {
  create(parameters: IShipmentCreateParameters): Promise<IShipment>;
}

const EasyPostClient = EasyPostClientImport as unknown as new (
  apiKey: string,
  options?: { timeout?: number },
) => { Shipment: EasyPostShipmentClient };

const address = (value: RateRequest['sender']) => ({
  name: value.fullName,
  company: value.company || undefined,
  street1: value.address1,
  street2: value.address2 || undefined,
  city: value.city,
  state: value.state,
  zip: value.zip,
  country: value.country || 'US',
  phone: value.phone || undefined,
});

const cents = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [dollars, fraction = ''] = value.split('.');
  return Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
};

const normalizedStatus = (error: unknown): number => {
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) return 504;
  if (!error || typeof error !== 'object') return 503;
  const candidate = error as { statusCode?: unknown; status?: unknown };
  const status = Number(candidate.statusCode ?? candidate.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 503;
};

export class EasyPostRateProvider implements RateProvider {
  private readonly shipmentClient: EasyPostShipmentClient;

  constructor(apiKey: string, shipmentClient?: EasyPostShipmentClient) {
    this.shipmentClient = shipmentClient ?? new EasyPostClient(apiKey, { timeout: 8_000 }).Shipment;
  }

  async getRates(input: RateRequest): Promise<ReferenceRate[]> {
    const parameters: IShipmentCreateParameters = {
      from_address: address(input.sender),
      to_address: address(input.recipient),
      parcel: {
        weight: input.weight * 16,
        length: input.length,
        width: input.width,
        height: input.height,
      },
    };
    try {
      const shipment = await this.shipmentClient.create(parameters);
      return (shipment.rates ?? []).flatMap((rate): ReferenceRate[] => {
        if (rate.carrier !== 'USPS') return [];
        const retailPriceCents = cents(rate.retail_rate);
        if (retailPriceCents === null || retailPriceCents <= 0) return [];
        return [
          {
            providerShipmentId: shipment.id,
            providerRateId: rate.id,
            carrier: 'USPS',
            serviceCode: rate.service,
            serviceName: rate.service,
            retailPriceCents,
            deliveryDays: Number.isInteger(rate.delivery_days) ? rate.delivery_days : null,
            deliveryDate: rate.delivery_date || null,
            guaranteed: rate.delivery_date_guaranteed === true,
          },
        ];
      });
    } catch (error) {
      if (error instanceof RateProviderError) throw error;
      const status = normalizedStatus(error);
      const message = status === 401 ? 'EasyPost API key is invalid.' : status === 422 ? 'EasyPost rejected the address or parcel.' : status === 504 ? 'EasyPost rating timed out.' : 'Unable to retrieve the current USPS retail rate.';
      throw new RateProviderError(message, status, status === 504 ? 'EASYPOST_TIMEOUT' : `EASYPOST_${status}`, {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
