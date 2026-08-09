import { describe, expect, it, vi } from 'vitest';
import { EasyPostLabelProvider } from '../src/providers/easyPostLabelProvider.js';
import type { StoredPricingQuote } from '../src/services/pricingService.js';

const quote = {
  easyPostShipmentId: 'shp_exact', easyPostRateId: 'rate_exact', labelTypeId: 87,
  serviceName: 'FedEx Ground Economy', shipmentSnapshot: { reference: 'ShipDime-test' },
} as StoredPricingQuote;

describe('EasyPostLabelProvider', () => {
  it('purchases the exact stored rate and returns tracking plus PDF', async () => {
    const buy = vi.fn(async () => ({ id: 'shp_exact', tracking_code: 'TRACK123', postage_label: { label_url: 'https://labels.test/label.pdf' } }));
    const provider = new EasyPostLabelProvider('test', { retrieve: async () => ({ id: 'shp_exact' }) as never, buy: buy as never });
    const result = await provider.purchaseLabel(quote);
    expect(buy).toHaveBeenCalledWith('shp_exact', 'rate_exact');
    expect(result).toMatchObject({ label: { trackingNumber: 'TRACK123', labelTypeName: 'FedEx Ground Economy' }, pdfUrl: 'https://labels.test/label.pdf' });
  });
  it('returns an already purchased shipment without buying twice', async () => {
    const buy = vi.fn();
    const provider = new EasyPostLabelProvider('test', { retrieve: async () => ({ id: 'shp_exact', tracking_code: 'TRACK123', postage_label: { label_url: 'https://labels.test/label.pdf' } }) as never, buy: buy as never });
    await provider.purchaseLabel(quote);
    expect(buy).not.toHaveBeenCalled();
  });
});
