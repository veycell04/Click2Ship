import { describe, expect, it } from 'vitest';
import { createSupportMailto } from '../sidepanel/support';

describe('label support email', () => {
  it('includes safe order context without addresses, secrets, or provider IDs', () => {
    const url = createSupportMailto({
      orderId: 'order-123',
      trackingNumber: '9400111899',
      serviceName: 'USPS Priority Mail',
    });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('mailto:info@veycell.org');
    expect(decoded).toContain('ShipDime support — Order order-123');
    expect(decoded).toContain('Order ID: order-123');
    expect(decoded).toContain('Tracking number: 9400111899');
    expect(decoded).toContain('Service: USPS Priority Mail');
    expect(decoded).not.toMatch(/recipient address|sender address|card|ShipAir|EasyPost|provider ID|secret/i);
  });
});
