import { parse } from '@universe/address-parser';
import type { AddressExtractionResult } from '../domain/models';
import type { AddressParserProvider } from '../domain/providers';
import { preprocessAddressInput } from './addressPreprocessing';

const value = (input: unknown): string => (input == null ? '' : String(input));

export class UniverseAddressParser implements AddressParserProvider {
  async parse(input: string): Promise<AddressExtractionResult> {
    const preprocessed = preprocessAddressInput(input);
    const parsed = parse(...preprocessed.lines);
    const zip = [value(parsed.zip), value(parsed.zip4)].filter(Boolean).join('-');
    let address1 = [
      value(parsed.number),
      value(parsed.streetPreDir),
      value(parsed.streetName),
      value(parsed.streetType),
      value(parsed.streetPostDir),
    ]
      .filter(Boolean)
      .join(' ');
    let address2 = [value(parsed.unitAbbr), value(parsed.unitNum)].filter(Boolean).join(' ');
    let city = value(parsed.city);
    if (preprocessed.lines.length >= 3) {
      const streetLine = preprocessed.lines.at(-2) ?? '';
      const cityLine = preprocessed.lines.at(-1) ?? '';
      if (address2) {
        const escapedUnit = address2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const unitSuffix = new RegExp(`\\s+${escapedUnit}\\s*$`, 'i');
        if (unitSuffix.test(streetLine)) {
          address1 = streetLine.replace(unitSuffix, '').trim();
          address2 = streetLine.match(unitSuffix)?.[0].trim() ?? address2;
        }
      } else {
        address1 = streetLine;
      }
      const cityMatch = cityLine.match(/^(.+?),?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?$/i);
      if (cityMatch) city = cityMatch[1].replace(/,$/, '').trim();
    }
    const hasPostalAddress = Boolean(address1 && parsed.city && parsed.state && zip);

    return {
      fullName: value(parsed.care),
      company: value(parsed.facility),
      address1,
      address2,
      city,
      state: value(parsed.state),
      zip,
      country: 'US',
      phone: preprocessed.phone,
      source: 'address-library',
      confidence: hasPostalAddress
        ? preprocessed.lines.length >= 3
          ? parsed.care
            ? 0.9
            : 0.75
          : 0.5
        : 0.35,
      originalText: input,
    };
  }
}

export const universeAddressParser = new UniverseAddressParser();
