import type { AddressExtractionResult } from '../domain/models';
import type {
  AddressParserProvider,
  AIExtractionProvider,
  UniversalAddressExtractor as UniversalAddressExtractorContract,
} from '../domain/providers';
import { preprocessAddressInput } from './addressPreprocessing';
import { universeAddressParser } from './universeAddressParser';

const states: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
};
const stateNames = Object.keys(states).sort((a, b) => b.length - a.length);
const zipPattern = /\b\d{5}(?:-\d{4})?\b/;
const phonePattern =
  /(?:\(\+?1\)|\+?1)?[\s.-]*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}(?:\s*(?:ext\.?|x)\s*\d+)?/i;
const streetPattern =
  /(?:^|\s)(P\.?\s*O\.?\s+BOX\s+[A-Z0-9-]+|\d+\s+.*?\b(?:STREET|ST|AVENUE|AVE|ROAD|RD|BOULEVARD|BLVD|LANE|LN|DRIVE|DR|COURT|CT|CIRCLE|CIR|WAY|PARKWAY|PKWY|HIGHWAY|HWY|PLACE|PL|TERRACE|TER|TRAIL|TRL)\b)/i;
const unitPattern =
  /\s*\(?\b(APT|APARTMENT|UNIT|STE|SUITE|FLOOR|FL|BLDG)\b\s*#?\s*([A-Z0-9-]+)\)?/i;
const countryPattern = /\b(?:UNITED STATES(?: OF AMERICA)?|USA|US)\b/i;

const emptyResult = (originalText: string): AddressExtractionResult => ({
  fullName: '',
  company: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
  phone: '',
  source: 'fallback',
  confidence: 0,
  originalText,
});

function findState(text: string): { state: string; token: string } | null {
  const upper = text.toUpperCase();
  for (const name of stateNames) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(upper)) return { state: states[name], token: name };
  }
  const abbreviations = new Set(Object.values(states));
  const matches = upper.match(/\b[A-Z]{2}\b/g) ?? [];
  const abbreviation = matches.find((value) => abbreviations.has(value));
  return abbreviation ? { state: abbreviation, token: abbreviation } : null;
}

function structuralExtraction(rawText: string): AddressExtractionResult {
  const result = emptyResult(rawText);
  const preprocessed = preprocessAddressInput(rawText);
  result.phone = rawText.replace(/\r\n?/g, '\n').replace(/\n/g, ' ').match(phonePattern)?.[0] ?? '';
  const lines = preprocessed.lines
    .map((line) => line.replace(phonePattern, '').trim())
    .filter(Boolean);
  const flattened = lines.join(' ').replace(/\s+/g, ' ').trim();
  result.zip = flattened.match(zipPattern)?.[0] ?? '';

  const streetLineIndex =
    lines.length > 1 ? lines.findIndex((line) => streetPattern.test(line)) : -1;
  const streetSource = streetLineIndex >= 0 ? lines[streetLineIndex] : flattened;
  const streetMatch = streetSource.match(streetPattern);
  if (!streetMatch) return result;

  const streetAndUnit = streetSource.slice(streetMatch.index ?? 0);
  const unitMatch = streetAndUnit.match(unitPattern);
  const streetEnd = unitMatch?.index ?? streetMatch[0].length;
  result.address1 = streetAndUnit.slice(0, streetEnd).trim();
  if (unitMatch) result.address2 = `${unitMatch[1].toUpperCase()} ${unitMatch[2]}`;

  const prefix =
    streetLineIndex >= 0
      ? lines.slice(0, streetLineIndex)
      : [flattened.slice(0, streetMatch.index ?? 0).trim()];
  const identities = prefix.map((line) => line.replace(phonePattern, '').trim()).filter(Boolean);
  result.fullName = identities[0] ?? '';
  result.company = identities[1] ?? '';

  let locationText =
    streetLineIndex >= 0
      ? lines.slice(streetLineIndex + 1).join(' ')
      : streetAndUnit.slice(
          (unitMatch?.index ?? streetMatch[0].length) + (unitMatch?.[0].length ?? 0),
        );
  locationText = locationText.replace(zipPattern, '').replace(countryPattern, '').trim();
  const stateMatch = findState(locationText);
  if (stateMatch) {
    result.state = stateMatch.state;
    locationText = locationText.replace(new RegExp(`\\b${stateMatch.token}\\b`, 'i'), '');
  }
  result.city = locationText
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .replace(/\s*,\s*/g, ' ')
    .trim();

  const required = [result.fullName, result.address1, result.city, result.state, result.zip];
  result.confidence = required.every(Boolean) ? 0.92 : required.filter(Boolean).length * 0.15;
  return result;
}

class NoopAIExtractionProvider implements AIExtractionProvider {
  async extract(): Promise<null> {
    return null;
  }
}

export class SharedUniversalAddressExtractor implements UniversalAddressExtractorContract {
  constructor(
    private readonly addressParser: AddressParserProvider = universeAddressParser,
    private readonly aiProvider: AIExtractionProvider = new NoopAIExtractionProvider(),
  ) {}

  async extract(rawText: string): Promise<AddressExtractionResult> {
    const structuralResult = structuralExtraction(rawText);
    let libraryResult: AddressExtractionResult | null = null;
    try {
      libraryResult = await this.addressParser.parse(preprocessAddressInput(rawText).cleanedInput);
    } catch (error) {
      console.warn('Universal address library provider failed', error);
    }

    const merged: AddressExtractionResult = {
      ...libraryResult,
      ...structuralResult,
      fullName: structuralResult.fullName || libraryResult?.fullName || '',
      company: structuralResult.company || libraryResult?.company || '',
      address1: structuralResult.address1 || libraryResult?.address1 || '',
      address2: structuralResult.address2 || libraryResult?.address2 || '',
      city: structuralResult.city || libraryResult?.city || '',
      state: structuralResult.state || libraryResult?.state || '',
      zip: structuralResult.zip || libraryResult?.zip || '',
      phone: structuralResult.phone || libraryResult?.phone || '',
      source: libraryResult ? 'address-library' : 'fallback',
      confidence: Math.max(structuralResult.confidence, libraryResult?.confidence ?? 0),
      originalText: rawText,
    };

    const complete = Boolean(
      merged.fullName && merged.address1 && merged.city && merged.state && merged.zip,
    );
    if (!complete || merged.confidence < 0.65) {
      try {
        const aiResult = await this.aiProvider.extract(rawText);
        if (aiResult) return { ...aiResult, source: 'ai-provider', originalText: rawText };
      } catch (error) {
        console.warn('AI address extraction provider failed', error);
      }
    }
    return merged;
  }
}

export const universalAddressExtractor = new SharedUniversalAddressExtractor();
