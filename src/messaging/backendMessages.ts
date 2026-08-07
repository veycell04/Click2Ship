export interface BackendShippingAddress {
  fullName: string;
  company: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface CreateLabelRequest {
  selectionId: string;
  labelTypeId: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  sender: BackendShippingAddress;
  recipient: BackendShippingAddress;
  reference: string;
}

export interface PricingQuoteRequest {
  selectionId: string;
  labelTypeId: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  sender: BackendShippingAddress;
  recipient: BackendShippingAddress;
}

export type BackendRequestMessage =
  | { type: 'BACKEND_HEALTH' }
  | { type: 'GET_LABEL_TYPES' }
  | { type: 'GET_PRICING_QUOTE'; payload: PricingQuoteRequest }
  | { type: 'CREATE_CHECKOUT'; quoteId: string }
  | { type: 'GET_ORDER_STATUS'; orderId: string }
  | { type: 'CREATE_LABEL'; payload: CreateLabelRequest }
  | { type: 'GET_LABEL_BY_SELECTION'; selectionId: string }
  | { type: 'DOWNLOAD_LABEL'; labelId: string };

export interface BackendResponse<T> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  responseBody?: string;
}

export interface DownloadLabelData {
  bytes: number[];
  contentType: string;
}

export const isBackendRequestMessage = (value: unknown): value is BackendRequestMessage => {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  return [
    'BACKEND_HEALTH',
    'GET_LABEL_TYPES',
    'GET_PRICING_QUOTE',
    'CREATE_CHECKOUT',
    'GET_ORDER_STATUS',
    'CREATE_LABEL',
    'GET_LABEL_BY_SELECTION',
    'DOWNLOAD_LABEL',
  ].includes(String(value.type));
};
