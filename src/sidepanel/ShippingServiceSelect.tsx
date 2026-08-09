import type { BackendRateOption } from '../services/click2ShipBackendClient';
import { findShippingServiceOption } from './shippingServiceOptions';

interface ShippingServiceSelectProps {
  options: BackendRateOption[];
  selectedRateId: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  pricingReady: boolean;
  onSelect: (option: BackendRateOption) => void;
}

export function ShippingServiceSelect({
  options,
  selectedRateId,
  status,
  pricingReady,
  onSelect,
}: ShippingServiceSelectProps) {
  const unavailableLabel = !pricingReady
    ? 'Complete package details first'
    : status === 'loading'
      ? 'Calculating available rates...'
      : 'No shipping services available';
  const disabled = status !== 'success' || options.length === 0;

  return (
    <label className="wide shipping-service-select">
      <span>Shipping service</span>
      <select
        id="shipping-service"
        value={disabled ? '' : selectedRateId}
        disabled={disabled}
        onChange={(event) => {
          const option = findShippingServiceOption(options, event.target.value);
          if (option) onSelect(option);
        }}
      >
        {disabled && <option value="">{unavailableLabel}</option>}
        {!disabled &&
          options.map((option) => (
            <option key={option.rateId} value={option.rateId}>
              {option.serviceName} — {option.customerDisplayAmount}
            </option>
          ))}
      </select>
    </label>
  );
}
