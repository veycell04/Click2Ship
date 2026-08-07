import { API_BASE_URL, apiUrl } from '../config/api';
import type { Address, PackageDetails } from '../domain/models';
import type {
  BackendRequestMessage,
  BackendResponse,
  CreateLabelRequest,
  DownloadLabelData,
} from '../messaging/backendMessages';

export interface BackendLabelType {
  id: number;
  name: string;
  description?: string;
}
export interface BackendCreatedLabel {
  id: string;
  trackingNumber: string;
  labelTypeId: number;
  labelTypeName: string;
  downloadUrl: string;
  reference: string;
  createdAt: string;
}
export interface BackendConnectionDiagnostic {
  healthRequestUrl: string;
  healthHttpStatus: number | null;
  healthResult: string;
  labelTypesRequestUrl: string;
  labelTypesHttpStatus: number | null;
  rawLabelTypesResponse: string;
  parsedLabelTypes: BackendLabelType[];
  sidePanelMessageResult: string;
  backgroundFetchStatus: number | null;
  error: string;
}
export interface BackendPriceQuote {
  quoteId: string;
  carrier: 'USPS';
  serviceCode: string;
  serviceName: string;
  easyPostShipmentId: string;
  easyPostRateId: string;
  shipAirLabelTypeId: number;
  referencePriceType: 'EASYPOST_USPS_RETAIL';
  referencePriceCents: number;
  referenceDisplayAmount: string;
  customerPriceCents: number;
  customerDisplayAmount: string;
  savingsCents: number;
  savingsDisplayAmount: string;
  savingsPercent: number;
  currency: string;
  pricingMode: string;
  deliveryDays: number | null;
  expiresAt: string;
}
export type BackendOrderStatus =
  | 'draft'
  | 'checkout_created'
  | 'payment_pending'
  | 'paid'
  | 'label_processing'
  | 'label_created'
  | 'payment_failed'
  | 'label_failed';
export interface BackendOrderResult {
  id: string;
  status: BackendOrderStatus;
  amountCents: number;
  currency: string;
  trackingNumber: string;
  labelId: string;
  downloadUrl: string;
  errorMessage: string;
  label: BackendCreatedLabel | null;
}
export class BackendClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestedUrl = '',
    public readonly responseBody = '',
    public readonly isJson = false,
    public readonly corsLikely = false,
    public readonly parsedData?: unknown,
  ) {
    super(message);
  }
}

export type RuntimeMessenger = <T>(message: BackendRequestMessage) => Promise<BackendResponse<T>>;

const runtimeMessenger: RuntimeMessenger = <T>(message: BackendRequestMessage) =>
  new Promise<BackendResponse<T>>((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('Chrome runtime messaging is unavailable.'));
      return;
    }
    chrome.runtime.sendMessage(message, (response: BackendResponse<T> | undefined) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      if (!response) {
        reject(new Error('The background service worker returned no response.'));
        return;
      }
      resolve(response);
    });
  });

const shippingAddress = (address: Address) => ({
  fullName: address.fullName,
  company: address.company,
  phone: address.phone,
  address1: address.addressLine1,
  address2: address.addressLine2,
  city: address.city,
  state: address.state,
  zip: address.zipCode,
  country: address.country || 'US',
});

const responseText = (response: BackendResponse<unknown>): string =>
  response.responseBody || (response.data === undefined ? '' : JSON.stringify(response.data));

export class Click2ShipBackendClient {
  private readonly completedLabels = new Map<string, BackendCreatedLabel>();
  private readonly inFlightCreates = new Map<string, Promise<BackendCreatedLabel>>();

  constructor(
    private readonly messenger: RuntimeMessenger = runtimeMessenger,
    private readonly baseUrl = API_BASE_URL,
  ) {}

  get apiBaseUrl(): string {
    return this.baseUrl;
  }

  urlFor(path: string): string {
    return apiUrl(path, this.baseUrl);
  }

  private async request<T>(
    message: BackendRequestMessage,
    path: string,
  ): Promise<BackendResponse<T>> {
    const requestedUrl = this.urlFor(path);
    try {
      const response = await this.messenger<T>(message);
      console.log('Side-panel backend message result', { message, response });
      if (!response.success) {
        throw new BackendClientError(
          'BACKEND_REQUEST_FAILED',
          response.error || 'Background backend request failed.',
          response.status,
          requestedUrl,
          response.responseBody || '',
          Boolean(response.responseBody),
          false,
          response.data,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof BackendClientError) throw error;
      throw new BackendClientError(
        'MESSAGE_ERROR',
        error instanceof Error ? error.message : String(error),
        0,
        requestedUrl,
      );
    }
  }

  async getLabelTypes(): Promise<BackendLabelType[]> {
    const result = await this.request<{ success?: boolean; labelTypes?: BackendLabelType[] }>(
      { type: 'GET_LABEL_TYPES' },
      '/api/shipping/label-types',
    );
    const body = result.data;
    if (!body || !Array.isArray(body.labelTypes)) {
      throw new BackendClientError(
        'INVALID_RESPONSE',
        `Expected labelTypes array, received: ${JSON.stringify(body)}`,
        result.status,
        this.urlFor('/api/shipping/label-types'),
        responseText(result),
        true,
      );
    }
    return body.labelTypes;
  }

  async testConnection(): Promise<BackendConnectionDiagnostic> {
    const diagnostic: BackendConnectionDiagnostic = {
      healthRequestUrl: this.urlFor('/api/health'),
      healthHttpStatus: null,
      healthResult: 'not requested',
      labelTypesRequestUrl: this.urlFor('/api/shipping/label-types'),
      labelTypesHttpStatus: null,
      rawLabelTypesResponse: '',
      parsedLabelTypes: [],
      sidePanelMessageResult: 'not received',
      backgroundFetchStatus: null,
      error: '',
    };
    try {
      const health = await this.request<{ status?: string }>(
        { type: 'BACKEND_HEALTH' },
        '/api/health',
      );
      diagnostic.healthHttpStatus = health.status;
      diagnostic.healthResult = responseText(health);
      diagnostic.sidePanelMessageResult = JSON.stringify(health);
      diagnostic.backgroundFetchStatus = health.status;

      const labelTypes = await this.request<{
        success?: boolean;
        labelTypes?: BackendLabelType[];
      }>({ type: 'GET_LABEL_TYPES' }, '/api/shipping/label-types');
      diagnostic.labelTypesHttpStatus = labelTypes.status;
      diagnostic.backgroundFetchStatus = labelTypes.status;
      diagnostic.rawLabelTypesResponse = responseText(labelTypes);
      diagnostic.sidePanelMessageResult = JSON.stringify(labelTypes);
      const body = labelTypes.data;
      if (!body || !Array.isArray(body.labelTypes)) {
        throw new Error(`Expected labelTypes array, received: ${JSON.stringify(body)}`);
      }
      diagnostic.parsedLabelTypes = body.labelTypes;
    } catch (error) {
      if (error instanceof BackendClientError) {
        if (error.requestedUrl === diagnostic.healthRequestUrl) {
          diagnostic.healthHttpStatus = error.status;
          diagnostic.healthResult = error.responseBody || error.message;
        } else {
          diagnostic.labelTypesHttpStatus = error.status;
          diagnostic.rawLabelTypesResponse = error.responseBody;
        }
        diagnostic.backgroundFetchStatus = error.status;
        diagnostic.error = `message/fetch exception: ${error.message}; URL: ${error.requestedUrl}; HTTP status: ${error.status}; response text: ${error.responseBody || '(empty)'}`;
      } else {
        diagnostic.error = `message/fetch exception: ${error instanceof Error ? error.message : String(error)}; URL: ${diagnostic.labelTypesRequestUrl}; HTTP status: ${diagnostic.labelTypesHttpStatus ?? 0}; response text: ${diagnostic.rawLabelTypesResponse || '(empty)'}`;
      }
    }
    console.log('Click2Ship backend connection diagnostic', diagnostic);
    return diagnostic;
  }

  async getHealth(): Promise<string> {
    const result = await this.request<{ status?: string }>(
      { type: 'BACKEND_HEALTH' },
      '/api/health',
    );
    return result.data?.status || 'unexpected response';
  }

  async getPricingQuote(
    selectionId: string,
    selectedLabelTypeId: string,
    sender: Address,
    recipient: Address,
    parcel: PackageDetails,
  ): Promise<BackendPriceQuote> {
    const path = '/api/pricing/quote';
    const requestedUrl = this.urlFor(path);
    const startedAt = performance.now();
    console.log('Pricing request URL', requestedUrl);
    let result: BackendResponse<{ success?: boolean; quote?: BackendPriceQuote }>;
    try {
      const shipmentSnapshot = this.createShipmentPayload(
        selectionId,
        selectedLabelTypeId,
        sender,
        recipient,
        parcel,
      );
      result = await this.request<{ success?: boolean; quote?: BackendPriceQuote }>(
        {
          type: 'GET_PRICING_QUOTE',
          payload: {
            selectionId,
            labelTypeId: Number(selectedLabelTypeId),
            weight: Number(parcel.weight),
            length: Number(parcel.length),
            width: Number(parcel.width),
            height: Number(parcel.height),
            sender: shipmentSnapshot.sender,
            recipient: shipmentSnapshot.recipient,
          },
        },
        path,
      );
    } catch (error) {
      const clientError = error instanceof BackendClientError ? error : null;
      console.error('Pricing request failed', {
        requestedUrl,
        httpStatus: clientError?.status ?? 0,
        responseBody: clientError?.responseBody ?? '',
        requestDurationMs: Math.round(performance.now() - startedAt),
        error,
      });
      throw error;
    }
    console.log('Complete pricing response', {
      requestedUrl,
      httpStatus: result.status,
      responseBody: responseText(result),
      response: result.data,
      requestDurationMs: Math.round(performance.now() - startedAt),
    });
    if (!result.data?.success || !result.data.quote) {
      throw new BackendClientError(
        'INVALID_PRICING_RESPONSE',
        'Invalid pricing response.',
        result.status,
        requestedUrl,
        responseText(result),
        true,
        false,
        result.data,
      );
    }
    return result.data.quote;
  }

  async createCheckout(
    quoteId: string,
  ): Promise<{
    orderId: string;
    checkoutSessionId?: string;
    checkoutUrl?: string;
    status?: string;
  }> {
    const result = await this.request<{
      success?: boolean;
      orderId?: string;
      checkoutSessionId?: string;
      checkoutUrl?: string;
      status?: string;
    }>({ type: 'CREATE_CHECKOUT', quoteId }, '/api/payments/checkout');
    if (!result.data?.success || !result.data.orderId)
      throw new Error('Invalid Checkout response.');
    return {
      orderId: result.data.orderId,
      checkoutSessionId: result.data.checkoutSessionId,
      checkoutUrl: result.data.checkoutUrl,
      status: result.data.status,
    };
  }

  async getOrderStatus(orderId: string): Promise<BackendOrderResult> {
    const result = await this.request<{ success?: boolean; order?: BackendOrderResult }>(
      { type: 'GET_ORDER_STATUS', orderId },
      `/api/orders/${encodeURIComponent(orderId)}/status`,
    );
    if (!result.data?.success || !result.data.order) throw new Error('Invalid order response.');
    return result.data.order;
  }

  private createShipmentPayload(
    selectionId: string,
    selectedLabelTypeId: number | string,
    sender: Address,
    recipient: Address,
    parcel: PackageDetails,
  ): CreateLabelRequest {
    const labelTypeId = Number(selectedLabelTypeId);
    const weight = Number(parcel.weight);
    const length = Number(parcel.length);
    const width = Number(parcel.width);
    const height = Number(parcel.height);
    if (!Number.isInteger(labelTypeId) || labelTypeId <= 0) throw new Error('Select a label type.');
    return {
      selectionId,
      labelTypeId,
      weight,
      length,
      width,
      height,
      sender: shippingAddress(sender),
      recipient: shippingAddress(recipient),
      reference: `Click2Ship-${selectionId}`,
    };
  }

  createLabel(
    selectionId: string,
    selectedLabelTypeId: number | string,
    sender: Address,
    recipient: Address,
    parcel: PackageDetails,
  ): Promise<BackendCreatedLabel> {
    const completed = this.completedLabels.get(selectionId);
    if (completed) return Promise.resolve(completed);
    const existingRequest = this.inFlightCreates.get(selectionId);
    if (existingRequest) return existingRequest;
    const request = this.createLabelOnce(
      selectionId,
      selectedLabelTypeId,
      sender,
      recipient,
      parcel,
    );
    this.inFlightCreates.set(selectionId, request);
    void request.then(
      () => this.inFlightCreates.delete(selectionId),
      () => this.inFlightCreates.delete(selectionId),
    );
    return request;
  }

  private async createLabelOnce(
    selectionId: string,
    selectedLabelTypeId: number | string,
    sender: Address,
    recipient: Address,
    parcel: PackageDetails,
  ): Promise<BackendCreatedLabel> {
    const labelTypeId = Number(selectedLabelTypeId);
    const weight = Number(parcel.weight);
    const length = Number(parcel.length);
    const width = Number(parcel.width);
    const height = Number(parcel.height);
    const numericValues = { labelTypeId, weight, length, width, height };
    if (!Number.isInteger(labelTypeId) || labelTypeId <= 0) {
      throw new BackendClientError(
        'INVALID_LABEL_TYPE',
        'Select a label type.',
        0,
        this.urlFor('/api/shipping/labels'),
      );
    }
    if (
      !Number.isFinite(weight) ||
      weight < 2 ||
      !Number.isFinite(length) ||
      length <= 0 ||
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      throw new BackendClientError(
        'INVALID_NUMERIC_VALUE',
        `Invalid numeric shipment values: ${JSON.stringify(numericValues)}`,
        0,
        this.urlFor('/api/shipping/labels'),
      );
    }
    const payload: CreateLabelRequest = {
      selectionId,
      labelTypeId,
      weight,
      length,
      width,
      height,
      sender: shippingAddress(sender),
      recipient: shippingAddress(recipient),
      reference: `Click2Ship-${selectionId}`,
    };
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      console.log('Outgoing Click2Ship create-label payload', {
        ...payload,
        labelTypeIdType: typeof payload.labelTypeId,
        weightType: typeof payload.weight,
      });
    }
    try {
      const result = await this.request<{ success?: boolean; label?: BackendCreatedLabel }>(
        { type: 'CREATE_LABEL', payload },
        '/api/shipping/labels',
      );
      if (result.data?.success && result.data.label) {
        this.completedLabels.set(selectionId, result.data.label);
        return result.data.label;
      }
    } catch (createError) {
      const recovered = await this.getLabelBySelection(selectionId);
      if (recovered) return recovered;
      throw createError;
    }
    const recovered = await this.getLabelBySelection(selectionId);
    if (recovered) return recovered;
    throw new BackendClientError(
      'LABEL_STATUS_UNKNOWN',
      'Label creation status is unknown. Check the existing shipment before retrying.',
      202,
      this.urlFor('/api/shipping/labels'),
    );
  }

  async getLabelBySelection(selectionId: string): Promise<BackendCreatedLabel | null> {
    const cached = this.completedLabels.get(selectionId);
    if (cached) return cached;
    try {
      const result = await this.request<{ success?: boolean; label?: BackendCreatedLabel }>(
        { type: 'GET_LABEL_BY_SELECTION', selectionId },
        `/api/shipping/labels/by-selection/${encodeURIComponent(selectionId)}`,
      );
      if (!result.data?.success || !result.data.label) return null;
      this.completedLabels.set(selectionId, result.data.label);
      return result.data.label;
    } catch (error) {
      if (error instanceof BackendClientError && [202, 404].includes(error.status)) return null;
      throw error;
    }
  }

  async downloadLabel(id: string): Promise<Blob> {
    const path = `/api/shipping/labels/${encodeURIComponent(id)}/download`;
    const result = await this.request<DownloadLabelData>(
      { type: 'DOWNLOAD_LABEL', labelId: id },
      path,
    );
    if (!result.data || !Array.isArray(result.data.bytes)) {
      throw new BackendClientError(
        'INVALID_DOWNLOAD',
        'The background service worker returned an invalid label file.',
        result.status,
        this.urlFor(path),
      );
    }
    if (!result.data.contentType.toLowerCase().includes('application/pdf')) {
      throw new BackendClientError(
        'INVALID_DOWNLOAD_TYPE',
        `Expected application/pdf, received ${result.data.contentType || 'unknown'}.`,
        result.status,
        this.urlFor(path),
      );
    }
    return new Blob([new Uint8Array(result.data.bytes)], {
      type: result.data.contentType || 'application/pdf',
    });
  }
}

export const click2ShipBackendClient = new Click2ShipBackendClient();
