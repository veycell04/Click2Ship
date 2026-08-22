import { describe, expect, it } from 'vitest';
import { normalizeUsZip, US_ZIP_VALIDATION_MESSAGE, validateUsZip } from '../domain/usZip';

describe('validateUsZip', () => {
  it.each(['60101', '78704', '27609-2880'])('accepts %s', (zip) => {
    expect(validateUsZip(zip)).toBeNull();
  });

  it.each(['6010', '6010A', '123456', '60101-', ''])('rejects %s', (zip) => {
    expect(validateUsZip(zip)).toBe(US_ZIP_VALIDATION_MESSAGE);
  });

  it('trims surrounding whitespace without changing ZIP+4 formatting', () => {
    expect(validateUsZip(' 60101 ')).toBeNull();
    expect(normalizeUsZip(' 27609-2880 ')).toBe('27609-2880');
  });
});
