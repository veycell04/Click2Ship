import type { ChangeEvent } from 'react';
import type { BackendLabelType } from '../services/click2ShipBackendClient';

export function LabelTypeSelect({
  labelTypes,
  selectedLabelTypeId,
  onChange,
  id,
  describedBy,
  invalid = false,
  isBook = false,
}: {
  labelTypes: BackendLabelType[];
  selectedLabelTypeId: string;
  onChange: (value: string) => void;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  isBook?: boolean;
}) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <select id={id} value={selectedLabelTypeId} required onChange={handleChange} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      {isBook ? <option value="best">Best Rate / Cheapest</option> : <option value="">Select a label type</option>}
      {(isBook ? labelTypes.filter((type) => type.id === 120 || type.id === 87 || type.bookService === 'media-mail') : labelTypes).map((labelType) => (
        <option key={labelType.id} value={String(labelType.id)}>
          {isBook ? labelType.id === 120 ? 'USPS Ground Advantage' : labelType.id === 87 ? 'USPS Priority Mail' : 'USPS Media Mail' : labelType.name}
        </option>
      ))}
    </select>
  );
}
