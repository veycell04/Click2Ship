import type { CreateLabelInput, ShippingAddress } from '../types/shipping.js';

const stateCodes = new Set(
  'AL AK AS AZ AR CA CO CT DE DC FM FL GA GU HI ID IL IN IA KS KY LA ME MH MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND MP OH OK OR PW PA PR RI SC SD TN TX UT VT VI VA WA WV WI WY AE AA AP'.split(
    ' ',
  ),
);
const zipPattern = /^\d{5}(?:-\d{4})?$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const acceptedUnitedStatesNames = new Set([
  'US',
  'USA',
  'UNITED STATES',
  'UNITED STATES OF AMERICA',
]);

export class RequestValidationError extends Error {
  readonly statusCode = 422;

  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

const text = (value: unknown, field: string, required = true, max = 200) => {
  if (typeof value !== 'string') throw new RequestValidationError(field, 'Must be text.');
  const cleaned = [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (required && !cleaned) throw new RequestValidationError(field, 'Required.');
  if (cleaned.length > max) throw new RequestValidationError(field, 'Too long.');
  return cleaned;
};

function address(value: unknown, field: string): ShippingAddress {
  if (!value || typeof value !== 'object') throw new RequestValidationError(field, 'Required.');
  const input = value as Record<string, unknown>;
  const state = text(input.state, `${field}.state`).toUpperCase();
  const zip = text(input.zip, `${field}.zip`);
  const country = text(input.country ?? 'US', `${field}.country`).toUpperCase();
  if (!stateCodes.has(state)) throw new RequestValidationError(`${field}.state`, 'Invalid state.');
  if (!zipPattern.test(zip)) throw new RequestValidationError(`${field}.zip`, 'Invalid ZIP code.');
  if (!acceptedUnitedStatesNames.has(country))
    throw new RequestValidationError(`${field}.country`, 'Must be a United States address.');
  return {
    fullName: text(input.fullName, `${field}.fullName`),
    company: text(input.company ?? '', `${field}.company`, false),
    phone: text(input.phone ?? '', `${field}.phone`, false, 40),
    address1: text(input.address1, `${field}.address1`),
    address2: text(input.address2 ?? '', `${field}.address2`, false),
    city: text(input.city, `${field}.city`),
    state,
    zip,
    country: 'US',
  };
}

export function parseCreateLabelRequest(value: unknown): CreateLabelInput {
  if (!value || typeof value !== 'object')
    throw new RequestValidationError('body', 'Request body is required.');
  const input = value as Record<string, unknown>;
  const weight = Number(input.weight);
  const length = Number(input.length);
  const width = Number(input.width);
  const height = Number(input.height);
  const positiveDimension = (value: number, field: string) => {
    if (!Number.isFinite(value) || value <= 0)
      throw new RequestValidationError(field, 'Must be a number greater than zero.');
    return value;
  };
  if (!Number.isFinite(weight) || weight < 2)
    throw new RequestValidationError('weight', 'Must be a number of at least 2.');
  const selectionId = text(input.selectionId, 'selectionId', true, 64);
  if (!uuidPattern.test(selectionId))
    throw new RequestValidationError('selectionId', 'Must be a UUID.');
  const labelTypeId = Number(input.labelTypeId);
  if (!Number.isInteger(labelTypeId) || labelTypeId <= 0)
    throw new RequestValidationError('labelTypeId', 'Must be a positive integer.');
  return {
    selectionId,
    labelTypeId,
    weight,
    length: positiveDimension(length, 'length'),
    width: positiveDimension(width, 'width'),
    height: positiveDimension(height, 'height'),
    sender: address(input.sender, 'sender'),
    recipient: address(input.recipient, 'recipient'),
    reference: text(input.reference ?? '', 'reference', false, 100),
  };
}
