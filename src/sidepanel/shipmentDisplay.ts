import type { CompletedShipment } from '../services/storage';

export const shipmentDestination = (shipment: CompletedShipment): string => {
  if (shipment.destination?.trim()) return shipment.destination.trim();
  const locality = [shipment.destinationCity, shipment.destinationState].filter(Boolean).join(', ');
  return [locality, shipment.destinationZip].filter(Boolean).join(' ');
};

export const shipmentPackage = (shipment: CompletedShipment): string => {
  const parts: string[] = [];
  if (shipment.weight) parts.push(`${shipment.weight} lb`);
  const dimensions = [shipment.length, shipment.width, shipment.height].filter(Boolean);
  if (dimensions.length === 3) parts.push(`${dimensions.join(' × ')} in`);
  return parts.join(' · ');
};
