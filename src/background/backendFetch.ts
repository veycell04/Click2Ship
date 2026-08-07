import { apiUrl } from '../config/api';
import type {
  BackendRequestMessage,
  BackendResponse,
  DownloadLabelData,
} from '../messaging/backendMessages';

export async function backendFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<BackendResponse<T>> {
  const url = apiUrl(path);
  try {
    const response = await fetch(url, init);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      const bytes = Array.from(new Uint8Array(await response.arrayBuffer()));
      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          error: `Backend returned ${response.status}`,
        };
      }
      return {
        success: true,
        status: response.status,
        data: { bytes, contentType } as T,
      };
    }

    const responseText = await response.text();
    let parsed: unknown = null;
    if (responseText) {
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = responseText;
      }
    }
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `Backend returned ${response.status}`,
        responseBody: responseText,
        data: parsed as T,
      };
    }
    return { success: true, status: response.status, data: parsed as T };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function backendRequestUrl(message: BackendRequestMessage): string {
  switch (message.type) {
    case 'BACKEND_HEALTH':
      return apiUrl('/api/health');
    case 'GET_LABEL_TYPES':
      return apiUrl('/api/shipping/label-types');
    case 'GET_PRICING_QUOTE':
      return apiUrl('/api/pricing/quote');
    case 'CREATE_CHECKOUT':
      return apiUrl('/api/payments/checkout');
    case 'GET_ORDER_STATUS':
      return apiUrl(`/api/orders/${encodeURIComponent(message.orderId)}/status`);
    case 'CREATE_LABEL':
      return apiUrl('/api/shipping/labels');
    case 'GET_LABEL_BY_SELECTION':
      return apiUrl(`/api/shipping/labels/by-selection/${encodeURIComponent(message.selectionId)}`);
    case 'DOWNLOAD_LABEL':
      return apiUrl(`/api/shipping/labels/${encodeURIComponent(message.labelId)}/download`);
  }
}

export async function handleBackendRequest(
  message: BackendRequestMessage,
): Promise<BackendResponse<unknown>> {
  const url = backendRequestUrl(message);
  console.log('Background backend request', { messageType: message.type, url });
  let result: BackendResponse<unknown>;
  switch (message.type) {
    case 'BACKEND_HEALTH':
      result = await backendFetch('/api/health');
      break;
    case 'GET_LABEL_TYPES':
      result = await backendFetch('/api/shipping/label-types');
      break;
    case 'GET_PRICING_QUOTE':
      result = await backendFetch('/api/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(message.payload),
      });
      break;
    case 'CREATE_CHECKOUT':
      result = await backendFetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ quoteId: message.quoteId }),
      });
      break;
    case 'GET_ORDER_STATUS':
      result = await backendFetch(`/api/orders/${encodeURIComponent(message.orderId)}/status`);
      break;
    case 'CREATE_LABEL':
      result = await backendFetch('/api/shipping/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(message.payload),
      });
      break;
    case 'GET_LABEL_BY_SELECTION':
      result = await backendFetch(
        `/api/shipping/labels/by-selection/${encodeURIComponent(message.selectionId)}`,
      );
      break;
    case 'DOWNLOAD_LABEL':
      result = await backendFetch<DownloadLabelData>(
        `/api/shipping/labels/${encodeURIComponent(message.labelId)}/download`,
      );
      break;
  }
  console.log('Background backend response', {
    status: result.status,
    success: result.success,
  });
  return result;
}
