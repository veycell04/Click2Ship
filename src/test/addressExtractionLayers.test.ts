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

describe('UniversalAddressExtractor', () => {
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
});
