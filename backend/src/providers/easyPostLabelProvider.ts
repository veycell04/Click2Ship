import EasyPostClientImport, { type IShipment } from '@easypost/api';
import type { StoredPricingQuote } from '../services/pricingService.js';
import type { CreatedLabel } from '../types/shipping.js';
import { LabelProviderError } from '../services/labelProviderError.js';

export interface EasyPostPurchaseClient {
  buy(id: string, rate: string): Promise<IShipment>;
  retrieve(id: string): Promise<IShipment>;
}
export interface PurchasedLabel { label: CreatedLabel; pdfUrl: string; }
const EasyPostClient = EasyPostClientImport as unknown as new (key: string) => { Shipment: EasyPostPurchaseClient };

const purchased = (shipment: IShipment, quote: StoredPricingQuote): PurchasedLabel | null => {
  const tracking = shipment.tracking_code;
  const pdfUrl = shipment.postage_label?.label_url;
  if (!tracking || !pdfUrl) return null;
  return { label: { id: shipment.id, trackingNumber: tracking, labelTypeId: quote.labelTypeId,
    labelTypeName: quote.serviceName, downloadUrl: `/api/shipping/labels/${encodeURIComponent(shipment.id)}/download`,
    reference: quote.shipmentSnapshot.reference, createdAt: new Date().toISOString() }, pdfUrl };
};

export class EasyPostLabelProvider {
  private readonly client: EasyPostPurchaseClient;
  constructor(apiKey: string, client?: EasyPostPurchaseClient) {
    this.client = client ?? new EasyPostClient(apiKey).Shipment;
  }
  async purchaseLabel(quote: StoredPricingQuote): Promise<PurchasedLabel> {
    try {
      const existing = await this.client.retrieve(quote.easyPostShipmentId);
      const prior = purchased(existing, quote);
      if (prior) return prior;
      const shipment = await this.client.buy(quote.easyPostShipmentId, quote.easyPostRateId);
      const result = purchased(shipment, quote);
      if (!result) throw new LabelProviderError('INVALID_LABEL_RESPONSE', 'The label response was incomplete.');
      return result;
    } catch (error) {
      if (error instanceof LabelProviderError) throw error;
      throw new LabelProviderError('LABEL_PURCHASE_FAILED', 'Unable to purchase the selected shipping label.');
    }
  }
}
