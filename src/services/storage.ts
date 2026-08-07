import { emptyAddress, type Address, type AddressExtractionResult } from '../domain/models';
import { isAddressExtractionResult } from './addressMapping';
import type { BackendCreatedLabel } from './click2ShipBackendClient';

const SENDER_KEY = 'savedSender';
export const SELECTION_KEY = 'selectedAddressText';
export const SELECTION_DEBUG_KEY = 'selectionDebug';
export const SELECTION_STATUS_KEY = 'selectionStatus';
export const SELECTION_ID_KEY = 'selectionId';
export const SELECTED_AT_KEY = 'selectedAt';
export const EXTRACTION_RESULT_KEY = 'extractionResult';
export const EXTRACTION_SESSION_ID_KEY = 'extractionSessionId';
export const SOURCE_TAB_ID_KEY = 'sourceTabId';
export const COMPLETED_SHIPMENT_KEY = 'completedShipment';
export const RECENT_LABELS_KEY = 'recentLabels';
export const PAYMENT_ORDER_KEY = 'paymentOrder';
export type SelectionStatus = 'idle' | 'loading' | 'ready' | 'fallback';

export interface SelectionDebugData {
  rawSelectionText: string;
  structuredSelection: string;
  parserInput: string;
  detectedMarketplace: string;
  extractionResult: AddressExtractionResult | null;
}

export interface CompletedShipment {
  selectionId: string;
  label: BackendCreatedLabel;
  recipientName: string;
  destinationCity: string;
  destinationState: string;
  weight: string;
  length: string;
  width: string;
  height: string;
}

const isCompletedShipment = (value: unknown): value is CompletedShipment => {
  if (!value || typeof value !== 'object') return false;
  const shipment = value as CompletedShipment;
  const label = shipment.label;
  return (
    typeof shipment.selectionId === 'string' &&
    typeof shipment.recipientName === 'string' &&
    typeof shipment.destinationCity === 'string' &&
    typeof shipment.destinationState === 'string' &&
    typeof shipment.weight === 'string' &&
    typeof shipment.length === 'string' &&
    typeof shipment.width === 'string' &&
    typeof shipment.height === 'string' &&
    Boolean(label) &&
    typeof label.id === 'string' &&
    typeof label.trackingNumber === 'string' &&
    typeof label.labelTypeId === 'number' &&
    typeof label.labelTypeName === 'string' &&
    typeof label.downloadUrl === 'string' &&
    typeof label.reference === 'string' &&
    typeof label.createdAt === 'string'
  );
};

const hasChromeStorage = () => typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
const addressKeys: Array<keyof Address> = [
  'fullName',
  'company',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'zipCode',
  'country',
  'phone',
];

const isAddress = (value: unknown): value is Address =>
  Boolean(value) &&
  typeof value === 'object' &&
  addressKeys.every((key) => typeof (value as Record<string, unknown>)[key] === 'string');

const isSelectionDebugData = (value: unknown): value is SelectionDebugData => {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.rawSelectionText === 'string' &&
    typeof data.structuredSelection === 'string' &&
    typeof data.parserInput === 'string' &&
    typeof data.detectedMarketplace === 'string' &&
    (data.extractionResult === null || isAddressExtractionResult(data.extractionResult))
  );
};

export async function loadSender(): Promise<Address> {
  if (!hasChromeStorage()) return emptyAddress();
  try {
    const result = await chrome.storage.local.get(SENDER_KEY);
    const stored = result[SENDER_KEY];
    if (stored && typeof stored === 'object' && !('country' in stored)) {
      return { ...emptyAddress(), ...(stored as Omit<Address, 'country'>) };
    }
    return isAddress(stored) ? stored : emptyAddress();
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return emptyAddress();
  }
}

export async function loadSelectionId(): Promise<string> {
  if (!hasChromeStorage()) return '';
  try {
    const result = await chrome.storage.local.get(SELECTION_ID_KEY);
    return typeof result[SELECTION_ID_KEY] === 'string' ? result[SELECTION_ID_KEY] : '';
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return '';
  }
}

export async function loadSelectedAt(): Promise<number> {
  if (!hasChromeStorage()) return 0;
  try {
    const result = await chrome.storage.local.get(SELECTED_AT_KEY);
    return typeof result[SELECTED_AT_KEY] === 'number' ? result[SELECTED_AT_KEY] : 0;
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return 0;
  }
}

export async function loadExtractionResult(): Promise<AddressExtractionResult | null> {
  if (!hasChromeStorage()) return null;
  try {
    const result = await chrome.storage.local.get(EXTRACTION_RESULT_KEY);
    return isAddressExtractionResult(result[EXTRACTION_RESULT_KEY])
      ? result[EXTRACTION_RESULT_KEY]
      : null;
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return null;
  }
}

export async function loadExtractionSessionId(): Promise<string> {
  if (!hasChromeStorage()) return '';
  try {
    const result = await chrome.storage.local.get(EXTRACTION_SESSION_ID_KEY);
    return typeof result[EXTRACTION_SESSION_ID_KEY] === 'string'
      ? result[EXTRACTION_SESSION_ID_KEY]
      : '';
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return '';
  }
}

export async function saveSender(sender: Address): Promise<void> {
  if (hasChromeStorage()) await chrome.storage.local.set({ [SENDER_KEY]: sender });
}

export async function loadCompletedShipment(): Promise<CompletedShipment | null> {
  if (!hasChromeStorage()) return null;
  try {
    const result = await chrome.storage.local.get(COMPLETED_SHIPMENT_KEY);
    return isCompletedShipment(result[COMPLETED_SHIPMENT_KEY])
      ? result[COMPLETED_SHIPMENT_KEY]
      : null;
  } catch (error) {
    console.error('Failed to load completed shipment', error);
    return null;
  }
}

export async function loadRecentLabels(): Promise<CompletedShipment[]> {
  if (!hasChromeStorage()) return [];
  try {
    const result = await chrome.storage.local.get(RECENT_LABELS_KEY);
    return Array.isArray(result[RECENT_LABELS_KEY])
      ? result[RECENT_LABELS_KEY].filter(isCompletedShipment).slice(0, 10)
      : [];
  } catch (error) {
    console.error('Failed to load recent labels', error);
    return [];
  }
}

export async function saveCompletedShipment(shipment: CompletedShipment): Promise<void> {
  if (!hasChromeStorage()) return;
  const history = await loadRecentLabels();
  const nextHistory = [
    shipment,
    ...history.filter((entry) => entry.label.id !== shipment.label.id),
  ].slice(0, 10);
  await chrome.storage.local.set({
    [COMPLETED_SHIPMENT_KEY]: shipment,
    [RECENT_LABELS_KEY]: nextHistory,
  });
}

export async function startAnotherShipment(): Promise<string> {
  const selectionId = crypto.randomUUID();
  if (hasChromeStorage()) {
    await chrome.storage.local.set({
      [SELECTION_ID_KEY]: selectionId,
      [SELECTION_KEY]: '',
      [SELECTION_STATUS_KEY]: 'idle',
      [SELECTED_AT_KEY]: Date.now(),
      [EXTRACTION_RESULT_KEY]: null,
      [EXTRACTION_SESSION_ID_KEY]: null,
      [COMPLETED_SHIPMENT_KEY]: null,
      [PAYMENT_ORDER_KEY]: null,
    });
  }
  return selectionId;
}

export async function savePaymentOrder(selectionId: string, orderId: string): Promise<void> {
  if (hasChromeStorage())
    await chrome.storage.local.set({ [PAYMENT_ORDER_KEY]: { selectionId, orderId } });
}

export async function loadPaymentOrder(): Promise<{ selectionId: string; orderId: string } | null> {
  if (!hasChromeStorage()) return null;
  const result = await chrome.storage.local.get(PAYMENT_ORDER_KEY);
  const value = result[PAYMENT_ORDER_KEY] as Record<string, unknown> | null;
  return value && typeof value.selectionId === 'string' && typeof value.orderId === 'string'
    ? { selectionId: value.selectionId, orderId: value.orderId }
    : null;
}

export async function loadSelection(): Promise<string> {
  if (!hasChromeStorage()) return '';
  try {
    const result = await chrome.storage.local.get(SELECTION_KEY);
    return typeof result[SELECTION_KEY] === 'string' ? result[SELECTION_KEY] : '';
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return '';
  }
}

export async function loadSelectionDebug(): Promise<SelectionDebugData | null> {
  if (!hasChromeStorage()) return null;
  try {
    const result = await chrome.storage.local.get(SELECTION_DEBUG_KEY);
    return isSelectionDebugData(result[SELECTION_DEBUG_KEY]) ? result[SELECTION_DEBUG_KEY] : null;
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return null;
  }
}

export async function loadSelectionStatus(): Promise<SelectionStatus> {
  if (!hasChromeStorage()) return 'idle';
  try {
    const result = await chrome.storage.local.get(SELECTION_STATUS_KEY);
    const status = result[SELECTION_STATUS_KEY];
    return status === 'loading' || status === 'ready' || status === 'fallback' ? status : 'idle';
  } catch (error) {
    console.error('Failed to load shipment data', error);
    return 'idle';
  }
}
