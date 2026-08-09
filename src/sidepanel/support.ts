export interface LabelSupportContext {
  orderId?: string;
  trackingNumber?: string;
  serviceName?: string;
}

export function createSupportMailto(context: LabelSupportContext): string {
  const orderId = context.orderId?.trim() || 'Not available';
  const trackingNumber = context.trackingNumber?.trim() || 'Not available';
  const serviceName = context.serviceName?.trim() || 'Not available';
  const subject = `ShipDime support — Order ${orderId}`;
  const body = [
    'Hi ShipDime Support,',
    '',
    'I need help with my shipping label.',
    '',
    `Order ID: ${orderId}`,
    `Tracking number: ${trackingNumber}`,
    `Service: ${serviceName}`,
    '',
    'Issue:',
    '[Please describe what happened]',
  ].join('\n');
  return `mailto:info@veycell.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
