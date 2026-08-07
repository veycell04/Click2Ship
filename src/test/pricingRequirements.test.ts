import { describe, expect, it } from 'vitest';
import { emptyAddress } from '../domain/models';
import {
  getPricingRequirements,
  groupMissingPricingRequirements,
  pricingRequirementControlId,
} from '../sidepanel/pricingRequirements';

const validDraft = () => ({
  selectedLabelTypeId: '87',
  sender: { ...emptyAddress(), addressLine1: '1 Main St', city: 'Addison', state: 'IL', zipCode: '60101' },
  recipient: { ...emptyAddress(), addressLine1: '2 Oak Ave', city: 'New York', state: 'NY', zipCode: '10001' },
  package: { preset: 'custom' as const, weight: '2', length: '12', width: '9', height: '1' },
});

describe('pricing readiness requirements', () => {
  it('adds and removes the Label Type requirement', () => {
    const draft = validDraft();
    draft.selectedLabelTypeId = '';
    expect(getPricingRequirements(draft).find((item) => item.key === 'service.labelType')?.valid).toBe(false);
    draft.selectedLabelTypeId = '78';
    expect(getPricingRequirements(draft).every((item) => item.valid)).toBe(true);
  });

  it('shows minimum weight and recipient ZIP guidance', () => {
    const draft = validDraft();
    draft.package.weight = '1.99';
    draft.recipient.zipCode = '';
    const missing = getPricingRequirements(draft).filter((item) => !item.valid);
    expect(missing.find((item) => item.key === 'package.weight')?.message).toBe('Minimum 2 lb');
    expect(missing.map((item) => item.key)).toContain('recipient.zipCode');
  });

  it('groups multiple missing dimensions', () => {
    const draft = validDraft();
    draft.package.length = '';
    draft.package.width = '';
    draft.package.height = '';
    expect(groupMissingPricingRequirements(getPricingRequirements(draft)).map((item) => item.label)).toContain('Enter package dimensions');
  });

  it('does not require optional phone or company fields', () => {
    const draft = validDraft();
    draft.sender.phone = '';
    draft.sender.company = '';
    draft.recipient.phone = '';
    draft.recipient.company = '';
    expect(getPricingRequirements(draft).every((item) => item.valid)).toBe(true);
  });

  it('maps a clicked grouped requirement to the focusable length control', () => {
    expect(pricingRequirementControlId({ key: 'package.dimensions', label: 'Enter package dimensions', section: 'package', valid: false })).toBe('package-length');
  });
});
