const knownHeadingPattern =
  /^(?:ship\s*to|shipping\s+address|deliver\s+to|recipient)\s*:?\s*(.*)$/i;
const boundaryPattern = /^(?:address\s+type|contact\s+buyer|phone|seller\s+notes)\s*:?/i;
const metadataPattern = /(?:selectedShipDate|preferredDeliveryTime)|^(?:\{|\[)/i;
const phonePattern = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?:\s*(?:ext\.?|x)\s*\d+)?/i;

export interface PreprocessedAddressInput {
  cleanedInput: string;
  lines: string[];
  phone: string;
}

export function preprocessAddressInput(input: string): PreprocessedAddressInput {
  const normalizedLines = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .filter(Boolean);
  const phone = normalizedLines.join(' ').match(phonePattern)?.[0] ?? '';
  const lines: string[] = [];

  for (const line of normalizedLines) {
    const inlineBoundary = line.search(
      /\s+(?:address\s+type|contact\s+buyer|phone|seller\s+notes)\s*:?/i,
    );
    const addressPortion = inlineBoundary >= 0 ? line.slice(0, inlineBoundary).trim() : line;
    if (boundaryPattern.test(addressPortion) || metadataPattern.test(addressPortion)) break;
    const heading = line.match(knownHeadingPattern);
    if (heading) {
      if (heading[1]) lines.push(heading[1].trim());
      continue;
    }
    if (addressPortion) lines.push(addressPortion);
    if (inlineBoundary >= 0) break;
  }

  return { cleanedInput: lines.join('\n'), lines, phone };
}

export function extractPhone(input: string): string {
  return input.replace(/\r\n?/g, '\n').split('\n').join(' ').match(phonePattern)?.[0] ?? '';
}
