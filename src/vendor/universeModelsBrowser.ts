// Browser-safe subset required by @universe/address-parser's parser entry point.
import directionalAliases from '../../node_modules/@universe/models/esm/src/enums/Directional.js';
import facilityTypeAliases from '../../node_modules/@universe/models/esm/src/enums/FacilityType.js';
import stateAliases from '../../node_modules/@universe/models/esm/src/enums/State.js';
import streetTypeAliases from '../../node_modules/@universe/models/esm/src/enums/StreetType.js';
import unitAbbrAliases from '../../node_modules/@universe/models/esm/src/enums/UnitAbbr.js';
import {
  Country,
  Directional,
  FacilityType,
  State,
  StreetType,
  UnitAbbr,
  isPersonalIdentifier,
} from '../../node_modules/@universe/models/esm/src/types/enums.js';

export { Country, Directional, FacilityType, State, StreetType, UnitAbbr, isPersonalIdentifier };

function createLookup(values: Record<string, Array<string | number>>): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const [key, alternatives] of Object.entries(values)) {
    lookup[key.toUpperCase()] = key;
    for (const alternative of alternatives) lookup[String(alternative).toUpperCase()] = key;
  }
  return lookup;
}

export const aliases = {
  Directional: directionalAliases,
  FacilityType: facilityTypeAliases,
  State: stateAliases,
  StreetType: streetTypeAliases,
  UnitAbbr: unitAbbrAliases,
  DirectionalLookup: createLookup(directionalAliases),
  FacilityTypeLookup: createLookup(facilityTypeAliases),
  StateLookup: createLookup(stateAliases),
  StreetTypeLookup: createLookup(streetTypeAliases),
  UnitAbbrLookup: createLookup(unitAbbrAliases),
};

export function toCountry(value: unknown): Country | null {
  const normalized = String(value).trim().toUpperCase();
  return ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA', 'AMERICA'].includes(normalized)
    ? Country.USA
    : null;
}

export function getCountryDesc(country: Country): { sovereignty: Country } | null {
  return country === Country.USA ? { sovereignty: Country.USA } : null;
}
