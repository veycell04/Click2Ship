import type { ChangeEvent } from 'react';
import type { BackendLabelType } from '../services/click2ShipBackendClient';

export function LabelTypeSelect({
  labelTypes,
  selectedLabelTypeId,
  onChange,
  id,
  describedBy,
  invalid = false,
}: {
  labelTypes: BackendLabelType[];
  selectedLabelTypeId: string;
  onChange: (value: string) => void;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <select id={id} value={selectedLabelTypeId} required onChange={handleChange} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <option value="">Select a label type</option>
      {labelTypes.map((labelType) => (
        <option key={labelType.id} value={String(labelType.id)}>
          {labelType.name}
        </option>
      ))}
    </select>
  );
}
