import { BackendClientError } from './click2ShipBackendClient';

export interface CreateLabelDiagnostic {
  requestUrl: string;
  httpStatus: number | null;
  responseBody: string;
  parsedError: unknown;
  shipAirStatus: number | null;
  shipAirResponse: unknown;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export function describeCreateLabelError(
  error: unknown,
  includeRawResponse: boolean,
): { message: string; diagnostic: CreateLabelDiagnostic } {
  const backendError = error instanceof BackendClientError ? error : null;
  let parsed: unknown = backendError?.parsedData ?? null;
  if (parsed === null && backendError?.responseBody) {
    try {
      parsed = JSON.parse(backendError.responseBody);
    } catch {
      parsed = backendError.responseBody;
    }
  }
  const body = record(parsed);
  const backendMessage = typeof body?.message === 'string' ? body.message : backendError?.message;
  const fieldErrors = record(body?.fieldErrors);
  const shipAirResponse = body?.shipAirResponse ?? null;
  const shipAirMessage = record(shipAirResponse)?.message;
  const parts = [backendMessage || 'Unable to create the label.'];
  if (fieldErrors) parts.push(`Fields: ${JSON.stringify(fieldErrors)}`);
  if (typeof shipAirMessage === 'string') parts.push(`ShipAir: ${shipAirMessage}`);
  if (includeRawResponse && backendError?.responseBody) {
    parts.push(`Response: ${backendError.responseBody}`);
  }
  return {
    message: parts.join(' '),
    diagnostic: {
      requestUrl: backendError?.requestedUrl || '',
      httpStatus: backendError?.status ?? null,
      responseBody: backendError?.responseBody || '',
      parsedError: parsed,
      shipAirStatus: typeof body?.shipAirStatus === 'number' ? body.shipAirStatus : null,
      shipAirResponse,
    },
  };
}
