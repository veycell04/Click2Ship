import { useEffect, useState } from 'react';
import { getQuoteTimeLabel } from './priceCardTime';
import type { PricingRequirement } from './pricingRequirements';

export interface PriceCardProps {
  serviceName: string;
  retailPrice: string;
  customerPrice: string;
  savings: string;
  savingsPercent: number;
  expiresAt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
  onRetry: () => void;
  onExpired: () => void;
  pricingReady: boolean;
  missingRequirements: PricingRequirement[];
  onRequirementClick: (requirement: PricingRequirement) => void;
}

export function PriceCard({
  serviceName,
  retailPrice,
  customerPrice,
  savings,
  savingsPercent,
  expiresAt,
  status,
  errorMessage = '',
  onRetry,
  onExpired,
  pricingReady,
  missingRequirements,
  onRequirementClick,
}: PriceCardProps) {
  const [timeLabel, setTimeLabel] = useState(() => getQuoteTimeLabel(expiresAt));

  useEffect(() => {
    if (status !== 'success') return;
    let expirationReported = false;
    const updateTime = () => {
      const nextLabel = getQuoteTimeLabel(expiresAt);
      setTimeLabel(nextLabel);
      if (nextLabel === 'Quote expired' && !expirationReported) {
        expirationReported = true;
        onExpired();
      }
    };
    updateTime();
    const timer = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(timer);
  }, [expiresAt, onExpired, status]);

  return (
    <section className="card price-card" aria-labelledby="price-card-title">
      <header className="price-card-header">
        <span className="price-card-icon" aria-hidden="true">
          $
        </span>
        <div>
          <h2 id="price-card-title">Price</h2>
          <p>Calculated securely by Click2Ship</p>
        </div>
      </header>

      {!pricingReady ? (
        <div className="pricing-guidance" role="status">
          <strong>{missingRequirements.length === 1 ? missingRequirements[0].label.replace(/^Enter /, 'Enter ').replace(/^Select /, 'Select ') + ' to calculate your price.' : 'Almost ready'}</strong>
          {missingRequirements.length > 1 && (
            <p>Complete {missingRequirements.length} items to calculate your price:</p>
          )}
          <ul>
            {missingRequirements.map((requirement) => (
              <li key={requirement.key}>
                <button type="button" onClick={() => onRequirementClick(requirement)}>
                  <span aria-hidden="true">!</span> {requirement.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : status === 'loading' ? (
        <p className="price-card-status" aria-live="polite">
          Calculating price…
        </p>
      ) : status === 'error' ? (
        <div className="price-card-error" role="alert">
          <p>{errorMessage === 'Quote expired' ? 'Quote expired' : 'Unable to calculate shipping price.'}</p>
          <button type="button" className="secondary compact" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : status === 'idle' ? (
        <p className="price-card-status">Complete shipment details to calculate price.</p>
      ) : (
        <div className="price-card-content">
          <div className="price-service">
            <strong>{serviceName}</strong>
            <span className={timeLabel === 'Quote expired' ? 'expired' : ''}>{timeLabel}</span>
          </div>

          <dl className="price-comparison" aria-label="Shipping price comparison">
            <div className="price-comparison-row">
              <dt>USPS retail</dt>
              <dd>{retailPrice}</dd>
            </div>
            <div className="price-comparison-row customer-price-row">
              <dt>Click2Ship price</dt>
              <dd>{customerPrice}</dd>
            </div>
            <div className="price-comparison-row savings-row">
              <dt>You save</dt>
              <dd>{savings}</dd>
            </div>
          </dl>

          <div className="price-savings-banner">
            <span className="price-discount-icon" aria-hidden="true">
              %
            </span>
            <div>
              <strong>{savingsPercent}% below USPS retail</strong>
              <span>We pass the savings to you.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
