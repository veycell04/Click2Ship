import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { BackendRateOption } from '../services/click2ShipBackendClient';
import { ShippingServiceSelect } from '../sidepanel/ShippingServiceSelect';
import {
  findShippingServiceOption,
  selectShippingService,
} from '../sidepanel/shippingServiceOptions';

const option = (
  rateId: string,
  carrier: BackendRateOption['carrier'],
  serviceName: string,
  customerDisplayAmount: string,
): BackendRateOption => ({
  quoteId: `quote-${rateId}`,
  rateId,
  shipmentId: 'shp-current',
  carrier,
  serviceCode: serviceName.replaceAll(' ', ''),
  serviceName,
  benchmarkPriceCents: 900,
  benchmarkDisplayAmount: '$9.00',
  customerPriceCents: Number(customerDisplayAmount.replace(/\D/g, '')),
  customerDisplayAmount,
  savingsCents: 180,
  savingsDisplayAmount: '$1.80',
  savingsPercent: 20,
  deliveryDays: 3,
  deliveryDate: null,
  guaranteed: false,
});

const rates = [
  option('rate-fedex', 'FedEx', 'FedEx Ground Economy', '$6.84'),
  option('rate-usps', 'USPS', 'USPS Ground Advantage', '$7.04'),
  option('rate-ups', 'UPS', 'UPS Ground', '$7.32'),
];

describe('ShippingServiceSelect', () => {
  it('renders carrier options with discounted prices and the cheapest selected', () => {
    const markup = renderToStaticMarkup(
      <ShippingServiceSelect
        options={rates}
        selectedRateId="rate-fedex"
        status="success"
        pricingReady
        onSelect={vi.fn()}
      />,
    );
    expect(markup).toContain('Shipping service');
    expect(markup).toContain('value="rate-fedex" selected=""');
    expect(markup).toContain('FedEx Ground Economy — $6.84');
    expect(markup).toContain('USPS Ground Advantage — $7.04');
    expect(markup).toContain('UPS Ground — $7.32');
    expect(markup).not.toMatch(/ShipAir/i);
  });

  it('selects an existing option locally by its unique rate ID', () => {
    expect(findShippingServiceOption(rates, 'rate-ups')).toBe(rates[2]);
    expect(findShippingServiceOption(rates, 'missing')).toBeUndefined();
  });

  it('replaces the active quote and price without requesting new rates', () => {
    const best = rates[0];
    const quote = {
      ...best,
      bestRate: best,
      alternatives: rates.slice(1),
      referencePriceCents: best.benchmarkPriceCents,
      referenceDisplayAmount: best.benchmarkDisplayAmount,
      currency: 'usd',
      pricingMode: 'live',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    const selected = selectShippingService(quote, rates[2]);
    expect(selected.rateId).toBe('rate-ups');
    expect(selected.quoteId).toBe('quote-rate-ups');
    expect(selected.customerDisplayAmount).toBe('$7.32');
    expect(selected.bestRate).toBe(best);
  });

  it('shows contextual disabled states before rates exist', () => {
    const missing = renderToStaticMarkup(
      <ShippingServiceSelect options={[]} selectedRateId="" status="idle" pricingReady={false} onSelect={vi.fn()} />,
    );
    const loading = renderToStaticMarkup(
      <ShippingServiceSelect options={[]} selectedRateId="" status="loading" pricingReady onSelect={vi.fn()} />,
    );
    const empty = renderToStaticMarkup(
      <ShippingServiceSelect options={[]} selectedRateId="" status="error" pricingReady onSelect={vi.fn()} />,
    );
    expect(missing).toContain('Complete package details first');
    expect(loading).toContain('Calculating available rates...');
    expect(empty).toContain('No shipping services available');
  });
});
