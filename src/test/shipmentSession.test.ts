import { describe, expect, it } from 'vitest';
import type { AddressExtractionResult } from '../domain/models';
import { parseFallbackAddress } from '../sidepanel/fallbackAddressParsing';
import { emptyShipmentSession, shipmentSessionReducer } from '../sidepanel/shipmentSession';

const extraction = (fullName: string, address1: string, city: string): AddressExtractionResult => ({
  fullName,
  company: '',
  address1,
  address2: '',
  city,
  state: 'IL',
  zip: '60101',
  country: 'US',
  phone: '',
  source: 'address-library',
  confidence: 0.9,
  originalText: `${fullName}\n${address1}`,
});

describe('ShipmentSession', () => {
  it('discards session A immediately when session B starts', () => {
    const resultA = extraction('Mesut Alver', '1740 W GERTIE AVE', 'SALT LAKE');
    let session = shipmentSessionReducer(emptyShipmentSession(), {
      type: 'new',
      id: 'A',
      rawSelection: resultA.originalText,
      createdAt: 1,
    });
    session = shipmentSessionReducer(session, {
      type: 'ready',
      id: 'A',
      rawSelection: resultA.originalText,
      result: resultA,
    });
    session = shipmentSessionReducer(session, {
      type: 'new',
      id: 'B',
      rawSelection: 'veycel yildirim, 47 w commercial Ave Addison, IL 60101',
      createdAt: 2,
    });
    expect(session).toMatchObject({ id: 'B', status: 'reading', createdAt: 2 });
    expect(session.parsedRecipient.fullName).toBe('');
    expect(session.parsedRecipient.addressLine1).toBe('');
  });

  it('replaces the whole recipient with session B and ignores late session A', () => {
    const resultA = extraction('Mesut Alver', '1740 W GERTIE AVE', 'SALT LAKE');
    const resultB = extraction('veycel yildirim', '47 w commercial Ave', 'Addison');
    let session = shipmentSessionReducer(emptyShipmentSession(), {
      type: 'new',
      id: 'B',
      rawSelection: resultB.originalText,
      createdAt: 2,
    });
    session = shipmentSessionReducer(session, {
      type: 'ready',
      id: 'B',
      rawSelection: resultB.originalText,
      result: resultB,
    });
    const afterStaleA = shipmentSessionReducer(session, {
      type: 'ready',
      id: 'A',
      rawSelection: resultA.originalText,
      result: resultA,
    });
    expect(afterStaleA).toBe(session);
    expect(afterStaleA.parsedRecipient).toEqual({
      fullName: 'veycel yildirim',
      company: '',
      addressLine1: '47 w commercial Ave',
      addressLine2: '',
      city: 'Addison',
      state: 'IL',
      zipCode: '60101',
      country: 'US',
      phone: '',
    });
  });

  it('parses selected text and reaches ready when the content script is unavailable', async () => {
    const selectedAddressText =
      'Daniel Carter 1847 Oakwood Drive Austin, TX 78704 United States';
    let session = shipmentSessionReducer(emptyShipmentSession(), {
      type: 'new',
      id: 'fallback-selection',
      rawSelection: selectedAddressText,
      createdAt: 3,
    });
    session = shipmentSessionReducer(session, {
      type: 'parsing',
      id: 'fallback-selection',
    });

    const result = await parseFallbackAddress(selectedAddressText);
    session = shipmentSessionReducer(session, {
      type: 'ready',
      id: 'fallback-selection',
      rawSelection: selectedAddressText,
      result,
    });

    expect(session.status).toBe('ready');
    expect(session.parsedRecipient).toEqual({
      fullName: 'Daniel Carter',
      company: '',
      addressLine1: '1847 Oakwood Drive',
      addressLine2: '',
      city: 'Austin',
      state: 'TX',
      zipCode: '78704',
      country: 'US',
      phone: '',
    });
  });
});
