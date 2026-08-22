import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyAddress } from '../domain/models';
import { BackendClientError } from '../services/click2ShipBackendClient';
import { AddressForm } from '../sidepanel/App';
import { mapBackendPricingFieldErrors } from '../sidepanel/pricingFieldErrors';
import { PriceCard } from '../sidepanel/PriceCard';

const validationError = (fieldErrors: Record<string, string>) =>
  new BackendClientError(
    'BACKEND_REQUEST_FAILED',
    'Backend returned 422',
    422,
    'https://click2-ship.vercel.app/api/pricing/quote',
    JSON.stringify({ success: false, error: 'VALIDATION_ERROR', fieldErrors }),
    true,
    false,
    { success: false, error: 'VALIDATION_ERROR', fieldErrors },
  );

const renderAddressError = (prefix: 'sender' | 'recipient', backendField: string, message: string) => {
  const mapped = mapBackendPricingFieldErrors(validationError({ [backendField]: message }));
  return renderToStaticMarkup(
    <AddressForm
      value={{ ...emptyAddress(), zipCode: '60101' }}
      onChange={() => undefined}
      onFieldEdited={() => undefined}
      prefix={prefix}
      missingByKey={new Map(mapped.map((error) => [error.key, error]))}
      touched={new Set(mapped.map((error) => error.key))}
      onTouched={() => undefined}
    />,
  );
};

describe('pricing backend field errors', () => {
  it('shows the exact sender ZIP validation message under the sender field', () => {
    const markup = renderAddressError('sender', 'sender.zip', 'Invalid ZIP code.');
    expect(markup).toContain('Invalid ZIP code.');
    expect(markup).toContain('sender-zipCode-pricing-error');
  });

  it('shows the recipient ZIP validation message under the recipient field', () => {
    const markup = renderAddressError(
      'recipient',
      'recipient.zip',
      'Enter a valid destination ZIP code.',
    );
    expect(markup).toContain('Enter a valid destination ZIP code.');
    expect(markup).toContain('recipient-zipCode-pricing-error');
  });

  it('shows validation guidance instead of the generic pricing error', () => {
    const markup = renderToStaticMarkup(
      <PriceCard
        serviceName=""
        retailPrice=""
        customerPrice=""
        savings=""
        savingsPercent={0}
        deliveryDays={null}
        expiresAt=""
        status="error"
        errorMessage="Please fix the highlighted fields."
        onRetry={() => undefined}
        onExpired={() => undefined}
        pricingReady
        missingRequirements={[]}
        onRequirementClick={() => undefined}
      />,
    );
    expect(markup).toContain('Please fix the highlighted fields.');
    expect(markup).not.toContain('Unable to calculate shipping price.');
  });
});
