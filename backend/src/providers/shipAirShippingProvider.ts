import type {
  CreateLabelInput,
  CreatedLabel,
  LabelDownload,
  LabelType,
  ShippingBalance,
  ShippingProvider,
} from '../types/shipping.js';

export class ShippingProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 502,
    public readonly shipAirResponse?: unknown,
  ) {
    super(message);
  }
}

const sanitizeProviderResponse = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeProviderResponse);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/api[-_]?key|authorization|token|secret/i.test(key))
      .map(([key, entry]) => [key, sanitizeProviderResponse(entry)]),
  );
};

export const normalizeShipAirPhone = (value = ''): string | undefined => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.slice(0, 10);
};

export const normalizeShipAirCountry = (value: string | undefined): 'US' => {
  const normalized = (value || 'US').trim().toUpperCase();
  if (!['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(normalized)) {
    throw new ShippingProviderError('INVALID_COUNTRY', 'Only U.S. addresses are supported.', 422);
  }
  return 'US';
};

const requiredPositiveNumber = (value: unknown, field: string): number => {
  if (value === undefined || value === null || value === '') {
    throw new ShippingProviderError('INVALID_DIMENSION', `${field} is required.`, 422);
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new ShippingProviderError(
      'INVALID_DIMENSION',
      `${field} must be greater than zero.`,
      422,
    );
  }
  return normalized;
};

export interface ShipAirCreateLabelPayload {
  label_type_id: number;
  weight: number;
  length_in: number;
  width_in: number;
  height_in: number;
  from_name: string;
  from_company: string;
  from_phone: string;
  from_address1: string;
  from_address2: string;
  from_city: string;
  from_state: string;
  from_zip: string;
  from_country: 'US';
  to_name: string;
  to_company: string;
  to_phone: string;
  to_address1: string;
  to_address2: string;
  to_city: string;
  to_state: string;
  to_zip: string;
  to_country: 'US';
  reference: string;
}

export const createShipAirLabelPayload = (input: CreateLabelInput): ShipAirCreateLabelPayload => {
  const length = requiredPositiveNumber(input.length, 'Length');
  const width = requiredPositiveNumber(input.width, 'Width');
  const height = requiredPositiveNumber(input.height, 'Height');
  return {
    label_type_id: input.labelTypeId,
    weight: requiredPositiveNumber(input.weight, 'Weight'),
    length_in: length,
    width_in: width,
    height_in: height,
    from_name: input.sender.fullName,
    from_company: input.sender.company || '',
    from_phone: normalizeShipAirPhone(input.sender.phone) || '',
    from_address1: input.sender.address1,
    from_address2: input.sender.address2 || '',
    from_city: input.sender.city,
    from_state: input.sender.state,
    from_zip: input.sender.zip,
    from_country: normalizeShipAirCountry(input.sender.country),
    to_name: input.recipient.fullName,
    to_company: input.recipient.company || '',
    to_phone: normalizeShipAirPhone(input.recipient.phone) || '',
    to_address1: input.recipient.address1,
    to_address2: input.recipient.address2 || '',
    to_city: input.recipient.city,
    to_state: input.recipient.state,
    to_zip: input.recipient.zip,
    to_country: normalizeShipAirCountry(input.recipient.country),
    reference: input.reference || '',
  };
};

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object')
    throw new ShippingProviderError('INVALID_RESPONSE', 'ShipAir returned an invalid response.');
  return value as Record<string, unknown>;
};
const string = (value: unknown, field: string) => {
  if (typeof value !== 'string' && typeof value !== 'number')
    throw new ShippingProviderError('INVALID_RESPONSE', `ShipAir response is missing ${field}.`);
  return String(value);
};
const payload = (value: unknown) => {
  const root = object(value);
  return root.data && typeof root.data === 'object' ? object(root.data) : root;
};

export class ShipAirShippingProvider implements ShippingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 15_000,
  ) {}

  private async request(
    path: string,
    init: RequestInit = {},
    submitted = false,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const finalUrl = `${this.baseUrl.replace(/\/$/, '')}${path}`;
      if (path === '/label-types') {
        console.log('ShipAir label-types request', {
          shipAirBaseUrl: this.baseUrl,
          finalUrl,
        });
      }
      const response = await this.fetcher(finalUrl, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Click2Ship/0.1',
          ...init.headers,
        },
      });
      if (path === '/label-types') {
        console.log('ShipAir label-types response', {
          status: response.status,
          body: await response.clone().text(),
        });
      }
      if (!response.ok) {
        const responseText = await response.text();
        let parsedResponse: unknown = responseText;
        try {
          parsedResponse = responseText ? JSON.parse(responseText) : null;
        } catch {
          // Preserve a non-JSON ShipAir response as sanitized text.
        }
        const sanitizedResponse = sanitizeProviderResponse(parsedResponse);
        const codes: Record<number, [string, string]> = {
          401: ['AUTHENTICATION_FAILED', 'ShipAir authentication failed.'],
          402: ['INSUFFICIENT_BALANCE', 'The ShipAir account balance is insufficient.'],
          403: ['FORBIDDEN', 'ShipAir refused this request.'],
          422: ['VALIDATION_FAILED', 'ShipAir rejected the shipment details.'],
          429: ['RATE_LIMITED', 'ShipAir rate limit reached. Try again later.'],
          500: ['SHIPAIR_ERROR', 'ShipAir is temporarily unavailable.'],
        };
        const [defaultCode, defaultMessage] = codes[response.status] || [
          'SHIPAIR_ERROR',
          'ShipAir request failed.',
        ];
        const code = response.status === 422 ? 'SHIPAIR_VALIDATION_ERROR' : defaultCode;
        const message =
          response.status === 422 ? 'ShipAir rejected the label request.' : defaultMessage;
        throw new ShippingProviderError(code, message, response.status, sanitizedResponse);
      }
      return response;
    } catch (error) {
      if (error instanceof ShippingProviderError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ShippingProviderError(
          submitted ? 'LABEL_STATUS_UNKNOWN' : 'TIMEOUT',
          submitted
            ? 'Label creation timed out and its status is unknown.'
            : 'ShipAir request timed out.',
          504,
        );
      }
      throw new ShippingProviderError('NETWORK_ERROR', 'Unable to reach ShipAir.');
    } finally {
      clearTimeout(timer);
    }
  }

  async getBalance(): Promise<ShippingBalance> {
    const data = payload(await (await this.request('/balance')).json());
    const balance = Number(data.balance ?? data.amount);
    if (!Number.isFinite(balance))
      throw new ShippingProviderError('INVALID_RESPONSE', 'ShipAir balance response is invalid.');
    return { balance, currency: string(data.currency ?? 'USD', 'currency') };
  }

  async getLabelTypes(): Promise<LabelType[]> {
    const root = await (await this.request('/label-types')).json();
    const rootObject = Array.isArray(root) ? null : object(root);
    const candidate = rootObject?.data ?? rootObject?.labelTypes ?? rootObject?.label_types ?? root;
    const data = Array.isArray(candidate) ? candidate : null;
    if (!Array.isArray(data))
      throw new ShippingProviderError(
        'INVALID_RESPONSE',
        'ShipAir label-types response is invalid.',
      );
    return data.map((item) => {
      const row = object(item);
      return {
        id: Number(row.id),
        name: string(row.name ?? row.label_type ?? row.title, 'label type name'),
        description: typeof row.description === 'string' ? row.description : '',
      };
    });
  }

  private normalizeLabel(value: unknown, input?: CreateLabelInput): CreatedLabel {
    const data = payload(value);
    const id = string(data.id ?? data.label_id, 'label id');
    return {
      id,
      trackingNumber: string(
        data.trackingNumber ?? data.tracking_number ?? data.tracking,
        'tracking number',
      ),
      labelTypeId: Number(data.labelTypeId ?? data.label_type_id ?? input?.labelTypeId ?? 0),
      labelTypeName: string(
        data.labelTypeName ??
          data.label_type_name ??
          data.labelType ??
          data.label_type ??
          data.service ??
          '',
        'label type',
      ),
      downloadUrl: `/api/shipping/labels/${encodeURIComponent(id)}/download`,
      reference: string(data.reference ?? input?.reference ?? '', 'reference'),
      createdAt: string(
        data.createdAt ?? data.created_at ?? new Date().toISOString(),
        'created at',
      ),
    };
  }

  async createLabel(input: CreateLabelInput): Promise<CreatedLabel> {
    const shipAirPayload = createShipAirLabelPayload(input);
    const serializedBody = JSON.stringify(shipAirPayload);
    if (process.env.NODE_ENV === 'development') {
      console.log('Normalized ShipAir create-label payload', shipAirPayload);
      console.log('Final ShipAir dimensions', {
        length_in: shipAirPayload.length_in,
        width_in: shipAirPayload.width_in,
        height_in: shipAirPayload.height_in,
      });
      console.log('Serialized ShipAir body', serializedBody);
    }
    const response = await this.request('/labels', { method: 'POST', body: serializedBody }, true);
    return this.normalizeLabel(await response.json(), input);
  }
  async getLabel(id: string): Promise<CreatedLabel> {
    return this.normalizeLabel(
      await (await this.request(`/labels/${encodeURIComponent(id)}`)).json(),
    );
  }
  async downloadLabel(id: string): Promise<LabelDownload> {
    const response = await this.request(`/labels/${encodeURIComponent(id)}/download`, {
      headers: { Accept: 'application/pdf' },
    });
    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: 'application/pdf' };
  }
}
