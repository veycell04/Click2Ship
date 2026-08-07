import type { Address, PackageDetails } from '../domain/models';

export interface ShipmentDraft {
  selectedLabelTypeId: string;
  sender: Address;
  recipient: Address;
  package: PackageDetails;
}

export interface PricingRequirement {
  key: string;
  label: string;
  section: 'sender' | 'recipient' | 'package' | 'service';
  valid: boolean;
  message?: string;
}

const present = (value: string) => value.trim() !== '';
const positive = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;

export function getPricingRequirements(shipment: ShipmentDraft): PricingRequirement[] {
  const addressRequirements = (section: 'sender' | 'recipient', address: Address) => [
    { key: `${section}.addressLine1`, label: `${section === 'sender' ? 'Sender' : 'Recipient'} address line 1`, section, valid: present(address.addressLine1), message: 'Required to calculate price' },
    { key: `${section}.city`, label: `${section === 'sender' ? 'Sender' : 'Recipient'} city`, section, valid: present(address.city), message: 'Required to calculate price' },
    { key: `${section}.state`, label: `${section === 'sender' ? 'Sender' : 'Recipient'} state`, section, valid: present(address.state), message: 'Required to calculate price' },
    { key: `${section}.zipCode`, label: `${section === 'sender' ? 'Sender' : 'Recipient'} ZIP`, section, valid: present(address.zipCode), message: 'Required to calculate price' },
    { key: `${section}.country`, label: `${section === 'sender' ? 'Sender' : 'Recipient'} country`, section, valid: present(address.country), message: 'Required to calculate price' },
  ] satisfies PricingRequirement[];

  return [
    { key: 'service.labelType', label: 'Select a shipping service', section: 'service', valid: Number(shipment.selectedLabelTypeId) > 0, message: 'Required to calculate price' },
    ...addressRequirements('sender', shipment.sender),
    ...addressRequirements('recipient', shipment.recipient),
    { key: 'package.weight', label: 'Enter package weight', section: 'package', valid: Number.isFinite(Number(shipment.package.weight)) && Number(shipment.package.weight) >= 2, message: 'Minimum 2 lb' },
    { key: 'package.length', label: 'Enter package length', section: 'package', valid: positive(shipment.package.length), message: 'Must be greater than 0' },
    { key: 'package.width', label: 'Enter package width', section: 'package', valid: positive(shipment.package.width), message: 'Must be greater than 0' },
    { key: 'package.height', label: 'Enter package height', section: 'package', valid: positive(shipment.package.height), message: 'Must be greater than 0' },
  ];
}

export function groupMissingPricingRequirements(
  requirements: PricingRequirement[],
): PricingRequirement[] {
  const missing = requirements.filter((requirement) => !requirement.valid);
  const dimensions = missing.filter((requirement) =>
    ['package.length', 'package.width', 'package.height'].includes(requirement.key),
  );
  if (dimensions.length < 2) return missing;
  return [
    ...missing.filter((requirement) => !dimensions.includes(requirement)),
    {
      key: 'package.dimensions',
      label: 'Enter package dimensions',
      section: 'package',
      valid: false,
      message: 'Length, width, and height must be greater than 0',
    },
  ];
}

export function pricingRequirementControlId(requirement: PricingRequirement): string {
  const key = requirement.key === 'package.dimensions' ? 'package.length' : requirement.key;
  return key.replace('.', '-');
}
