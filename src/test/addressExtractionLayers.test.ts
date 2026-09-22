import { describe, expect, it } from 'vitest';
import { universeAddressParser } from '../services/universeAddressParser';
import { universalAddressExtractor } from '../services/universalAddressExtractor';

const mesut = `Mesut Alver
1740 W GERTIE AVE APT 438
SALT LAKE, UT 84116-4771`;

const aminu = `Aminu Mohammed
(+1)9295314556
1694 DAVIDSON AVE(Apt 3C)
Bronx,New York,United States
10453`;

const alejandro = `Alejandro Milan
6201 N HILLS DR APT C
RALEIGH, NC 27609-2880`;

describe('UniversalAddressExtractor', () => {
  it.each([
    ['Jamison Computers 24233 CREEKSIDE RD UNIT 101 VALENCIA, CA 91355-1737', {
      fullName: 'Jamison Computers', address1: '24233 CREEKSIDE RD', address2: 'UNIT 101',
      city: 'VALENCIA', state: 'CA', zip: '91355-1737', country: 'US',
    }],
    ['John Smith\n12345 Main St\nChicago, IL 60630', { zip: '60630' }],
    ['Jane Doe\n60630 W Example Rd\nDallas, TX 75201', { zip: '75201' }],
    ['ABC Company\n10001 West Street\nMiami, FL 33101-1234', { zip: '33101-1234' }],
    ['John Smith\n12345 Main St\nChicago IL 60630', { zip: '60630' }],
    ['ABC Company\n10001 West Street\nMiami FL 33101-1234', { zip: '33101-1234' }],
    ['ABC Company\n10001 West Street\nMiami FL 33101-1234\nReference CA 90210', { zip: '33101-1234' }],
  ] as const)('prefers the state-associated postal code over a five-digit street number: %s', async (input, expected) => {
    await expect(universalAddressExtractor.extract(input)).resolves.toMatchObject(expected);
  });
  it('does not treat a five-digit street number as a ZIP when no postal code is present', async () => {
    const result = await universalAddressExtractor.extract('John Smith\n12345 Main St\nChicago, IL');
    expect(result.zip).toBe('');
  });
  it.each([
    ['multiline', mesut],
    ['flattened', mesut.replace(/\n/g, ' ')],
  ])('extracts the Mesut address from %s input', async (_format, input) => {
    await expect(universalAddressExtractor.extract(input)).resolves.toMatchObject({
      fullName: 'Mesut Alver',
      company: '',
      address1: '1740 W GERTIE AVE',
      address2: 'APT 438',
      city: 'SALT LAKE',
      state: 'UT',
      zip: '84116-4771',
      phone: '',
    });
  });

  it.each([
    ['multiline', aminu],
    ['flattened', aminu.replace(/\n/g, ' ')],
  ])('extracts the Aminu address from %s input', async (_format, input) => {
    await expect(universalAddressExtractor.extract(input)).resolves.toMatchObject({
      fullName: 'Aminu Mohammed',
      company: '',
      address1: '1694 DAVIDSON AVE',
      address2: 'APT 3C',
      city: 'Bronx',
      state: 'NY',
      zip: '10453',
      phone: '(+1)9295314556',
    });
  });

  it('keeps the address library behind the provider interface', async () => {
    const result = await universeAddressParser.parse(
      'Jane Doe\n42 Oak Avenue Apt 3B\nDenver, CO 80202',
    );
    expect(result).toMatchObject({
      fullName: 'Jane Doe',
      city: 'Denver',
      state: 'CO',
      zip: '80202',
    });
  });

  it('extracts the selected Alejandro address without platform-specific rules', async () => {
    await expect(universalAddressExtractor.extract(alejandro)).resolves.toMatchObject({
      fullName: 'Alejandro Milan',
      address1: '6201 N HILLS DR',
      address2: 'APT C',
      city: 'RALEIGH',
      state: 'NC',
      zip: '27609-2880',
      country: 'US',
    });
  });
});
