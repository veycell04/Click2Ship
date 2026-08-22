const usZipPattern = /^\d{5}(-\d{4})?$/;

export const US_ZIP_VALIDATION_MESSAGE = 'Enter a valid 5-digit ZIP code or ZIP+4.';

export function normalizeUsZip(zip: string): string {
  return zip.trim();
}

export function validateUsZip(zip: string): string | null {
  return usZipPattern.test(normalizeUsZip(zip)) ? null : US_ZIP_VALIDATION_MESSAGE;
}
