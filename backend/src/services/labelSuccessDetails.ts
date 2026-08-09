import type { OrderRecord } from '../types/payments.js';

export interface LabelSuccessDetails {
  orderId: string;
  recipientName: string;
  destination: string;
  weightLb: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  serviceName: string;
  trackingNumber: string;
  reference: string | null;
  labelUrl?: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const number = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export function buildLabelSuccessDetails(
  order: OrderRecord,
  fallbackServiceName = 'USPS shipping label',
): LabelSuccessDetails {
  const snapshot = record(order.shipmentSnapshot);
  const recipient = record(snapshot.recipient ?? snapshot.to ?? snapshot.toAddress);
  const city = text(recipient.city);
  const state = text(recipient.state);
  const zip = text(recipient.zip ?? recipient.zipCode ?? recipient.postalCode);
  const locality = [city, state].filter(Boolean).join(', ');
  const destination = [locality, zip].filter(Boolean).join(' ');
  const label = order.label;

  return {
    orderId: order.id,
    recipientName: text(recipient.fullName ?? recipient.name),
    destination,
    weightLb: number(snapshot.weight ?? snapshot.weightLb),
    lengthIn: number(snapshot.length ?? snapshot.lengthIn),
    widthIn: number(snapshot.width ?? snapshot.widthIn),
    heightIn: number(snapshot.height ?? snapshot.heightIn),
    serviceName: text(label?.labelTypeName) || fallbackServiceName,
    trackingNumber: text(label?.trackingNumber ?? order.trackingNumber),
    reference: text(label?.reference ?? snapshot.reference) || null,
    ...(label?.downloadUrl ? { labelUrl: label.downloadUrl } : {}),
  };
}
