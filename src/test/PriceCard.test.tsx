import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PriceCard } from '../sidepanel/PriceCard';
import { getQuoteTimeLabel } from '../sidepanel/priceCardTime';

const quoteProps = {
  serviceName: 'USPS Priority Mail',
  retailPrice: '$13.45',
  customerPrice: '$10.76',
  savings: '$2.69',
  savingsPercent: 20,
  expiresAt: '2026-08-06T12:10:00.000Z',
  status: 'success' as const,
  onRetry: () => undefined,
  onExpired: () => undefined,
  pricingReady: true,
  missingRequirements: [],
  onRequirementClick: () => undefined,
};

describe('PriceCard', () => {
  it('renders the normalized quote in a clear three-row comparison', () => {
    const markup = renderToStaticMarkup(<PriceCard {...quoteProps} />);
    expect(markup).toContain('USPS Priority Mail');
    expect(markup).toContain('USPS retail');
    expect(markup).toContain('$13.45');
    expect(markup).toContain('Click2Ship price');
    expect(markup).toContain('$10.76');
    expect(markup).toContain('You save');
    expect(markup).toContain('$2.69');
    expect(markup).toContain('20% below USPS retail');
    expect(markup.match(/Calculated securely by Click2Ship/g)).toHaveLength(1);
  });

  it('renders focused loading and error states without stale prices', () => {
    const loading = renderToStaticMarkup(<PriceCard {...quoteProps} status="loading" />);
    const error = renderToStaticMarkup(<PriceCard {...quoteProps} status="error" />);
    expect(loading).toContain('Calculating price…');
    expect(loading).not.toContain('$13.45');
    expect(error).toContain('Unable to calculate shipping price.');
    expect(error).toContain('Retry');
    expect(error).not.toContain('$13.45');
  });

  it('derives the remaining validity from expiresAt', () => {
    const now = Date.parse('2026-08-06T12:01:00.000Z');
    expect(getQuoteTimeLabel(quoteProps.expiresAt, now)).toBe('Quote valid for 9 min');
    expect(getQuoteTimeLabel(quoteProps.expiresAt, Date.parse(quoteProps.expiresAt))).toBe(
      'Quote expired',
    );
  });
});
