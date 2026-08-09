import { LabelProviderError } from './labelProviderError.js';

export interface PublicLabelError {
  statusCode: number;
  body: {
    success: false;
    error: string;
    message: string;
    fieldErrors?: Record<string, unknown>;
  };
}

const fieldErrorsFrom = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const response = value as Record<string, unknown>;
  const candidate = response.errors ?? response.fieldErrors;
  return candidate && typeof candidate === 'object'
    ? (candidate as Record<string, unknown>)
    : undefined;
};

export function normalizeLabelProviderError(error: unknown): PublicLabelError {
  if (!(error instanceof LabelProviderError)) {
    return {
      statusCode: 500,
      body: {
        success: false,
        error: 'LABEL_CREATION_FAILED',
        message: 'Unable to create the shipping label.',
      },
    };
  }

  if (error.statusCode === 422 || /VALIDATION|INVALID_(?:COUNTRY|DIMENSION)/.test(error.code)) {
    return {
      statusCode: 422,
      body: {
        success: false,
        error: 'LABEL_VALIDATION_ERROR',
        message: 'Some shipment information is invalid.',
        ...(fieldErrorsFrom(error.providerResponse)
          ? { fieldErrors: fieldErrorsFrom(error.providerResponse) }
          : {}),
      },
    };
  }
  if (['AUTHENTICATION_FAILED', 'FORBIDDEN', 'INSUFFICIENT_BALANCE'].includes(error.code)) {
    return {
      statusCode: 503,
      body: {
        success: false,
        error: 'SHIPPING_SERVICE_UNAVAILABLE',
        message: 'The shipping service is temporarily unavailable.',
      },
    };
  }
  if (error.code === 'LABEL_STATUS_UNKNOWN') {
    return {
      statusCode: 202,
      body: {
        success: false,
        error: 'LABEL_STATUS_UNKNOWN',
        message: 'Label creation is still being confirmed. Do not submit another payment.',
      },
    };
  }
  return {
    statusCode: error.statusCode >= 500 ? error.statusCode : 503,
    body: {
      success: false,
      error: 'LABEL_PROVIDER_UNAVAILABLE',
      message: 'Unable to create the shipping label right now.',
    },
  };
}
