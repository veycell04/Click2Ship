import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LabelTypeSelect } from '../sidepanel/LabelTypeSelect';
import { emptyShipmentSession, shipmentSessionReducer } from '../sidepanel/shipmentSession';

const backendLabelTypes = [{ id: 87, name: 'USPS APIs Priority Mail 9201', description: '' }];

describe('LabelTypeSelect', () => {
  it.each([false, true])('shows book services with confirmed Media Mail support = %s', (supported) => {
    const markup = renderToStaticMarkup(<LabelTypeSelect isBook selectedLabelTypeId="best" onChange={() => {}}
      labelTypes={[{ id: 120, name: 'Ground' }, { id: 87, name: 'Priority' },
        { id: 321, name: 'Media Mail', ...(supported ? { bookService: 'media-mail' as const } : {}) }]} />);
    expect(markup).toContain('Best Rate / Cheapest');
    expect(markup).toContain('USPS Ground Advantage');
    expect(markup).toContain('USPS Priority Mail');
    expect(markup.includes('USPS Media Mail')).toBe(supported);
    expect(markup).toContain('value="best" selected=""');
  });
  it('renders only backend-provided label types and no diagnostic option', () => {
    const markup = renderToStaticMarkup(
      <LabelTypeSelect
        labelTypes={backendLabelTypes}
        selectedLabelTypeId=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('value="87"');
    expect(markup).toContain('USPS APIs Priority Mail 9201');
    expect(markup).not.toContain('Diagnostic');
    expect(markup.match(/value="87"/g) ?? []).toHaveLength(1);
  });

  it('reports the selected HTML value as string 87', () => {
    const onChange = vi.fn();
    const select = LabelTypeSelect({
      labelTypes: backendLabelTypes,
      selectedLabelTypeId: '',
      onChange,
    });

    select.props.onChange({ target: { value: '87' } });
    expect(onChange).toHaveBeenCalledWith('87');
  });

  it('keeps label selection independent from a new recipient session', () => {
    const selectedLabelTypeId = '87';
    const session = shipmentSessionReducer(emptyShipmentSession(), {
      type: 'new',
      id: 'selection-b',
      rawSelection: 'Recipient B\n2 Main St',
      createdAt: 2,
    });

    expect(session.id).toBe('selection-b');
    expect(selectedLabelTypeId).toBe('87');
  });
});
