import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadCompletedShipment,
  loadRecentLabels,
  saveCompletedShipment,
  startAnotherShipment,
  type CompletedShipment,
} from '../services/storage';
import { LabelSuccessScreen } from '../sidepanel/LabelSuccessScreen';
import { copyText, openPdfForPrint } from '../sidepanel/labelActions';

const shipment: CompletedShipment = {
  selectionId: 'selection-a',
  label: {
    id: 'label-1',
    trackingNumber: '9400111899',
    labelTypeId: 87,
    labelTypeName: 'USPS APIs Priority Mail 9201',
    downloadUrl: '/api/shipping/labels/label-1/download',
    reference: 'Click2Ship-selection-a',
    createdAt: '2026-08-06T12:00:00.000Z',
  },
  recipientName: 'Mesut Alver',
  destinationCity: 'SALT LAKE',
  destinationState: 'UT',
  weight: '2',
  length: '12',
  width: '9',
  height: '1',
};

beforeEach(() => {
  const values: Record<string, unknown> = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: values[key] })),
        set: vi.fn(async (entries: Record<string, unknown>) => Object.assign(values, entries)),
      },
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('completed label workflow', () => {
  it('renders the successful tracking number and recent history', () => {
    const markup = renderToStaticMarkup(
      <LabelSuccessScreen
        shipment={shipment}
        recentLabels={[shipment]}
        copyStatus=""
        printStatus=""
        onCopy={() => undefined}
        onDownload={() => undefined}
        onPrint={() => undefined}
        onStartAnother={() => undefined}
        onHistoryCopy={() => undefined}
        onHistoryDownload={() => undefined}
      />,
    );
    expect(markup).toContain('Label created successfully');
    expect(markup).toContain('9400111899');
    expect(markup).toContain('Recent Labels');
    expect(markup).toContain('Mesut Alver');
  });

  it('copies tracking through the clipboard API', async () => {
    const writeText = vi.fn(async () => undefined);
    await expect(copyText(shipment.label.trackingNumber, { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('9400111899');
  });

  it('opens the backend PDF and prints after load', async () => {
    const print = vi.fn();
    let onLoad: () => void = () => undefined;
    const openedWindow = {
      location: { href: '' },
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        onLoad = listener;
      }),
      print,
      close: vi.fn(),
    };
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:label') });
    const opened = await openPdfForPrint(
      async () => new Blob(['%PDF'], { type: 'application/pdf' }),
      vi.fn(() => openedWindow as unknown as Window),
    );
    expect(opened).toBe(true);
    expect(openedWindow.location.href).toBe('blob:label');
    onLoad();
    expect(print).toHaveBeenCalledOnce();
  });

  it('restores the completed label and latest-ten history from local storage', async () => {
    await saveCompletedShipment(shipment);
    await expect(loadCompletedShipment()).resolves.toEqual(shipment);
    await expect(loadRecentLabels()).resolves.toEqual([shipment]);
  });

  it('starts another shipment with a new selection id', async () => {
    const nextSelectionId = await startAnotherShipment();
    expect(nextSelectionId).not.toBe(shipment.selectionId);
    expect(nextSelectionId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
