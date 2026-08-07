import { emptyAddress, type Address, type AddressExtractionResult } from '../domain/models';
import { extractionResultToAddress } from '../services/addressMapping';

export type Recipient = Address;
export type ShipmentSessionStatus = 'idle' | 'reading' | 'parsing' | 'ready' | 'error';

export interface ShipmentSession {
  id: string;
  rawSelection: string;
  parsedRecipient: Recipient;
  status: ShipmentSessionStatus;
  createdAt: number;
}

export type ShipmentSessionAction =
  | { type: 'new'; id: string; rawSelection: string; createdAt: number }
  | { type: 'new-empty'; id: string; createdAt: number }
  | { type: 'selection-read'; id: string; rawSelection: string }
  | { type: 'parsing'; id: string }
  | { type: 'ready'; id: string; rawSelection: string; result: AddressExtractionResult }
  | { type: 'error'; id: string; rawSelection: string }
  | { type: 'edit-recipient'; id: string; recipient: Recipient }
  | { type: 'clear' };

export const emptyShipmentSession = (): ShipmentSession => ({
  id: '',
  rawSelection: '',
  parsedRecipient: emptyAddress(),
  status: 'idle',
  createdAt: 0,
});

export function shipmentSessionReducer(
  session: ShipmentSession,
  action: ShipmentSessionAction,
): ShipmentSession {
  if (action.type === 'clear') return emptyShipmentSession();
  if (action.type === 'new') {
    return {
      id: action.id,
      rawSelection: action.rawSelection,
      parsedRecipient: emptyAddress(),
      status: 'reading',
      createdAt: action.createdAt,
    };
  }
  if (action.type === 'new-empty') {
    return {
      id: action.id,
      rawSelection: '',
      parsedRecipient: emptyAddress(),
      status: 'idle',
      createdAt: action.createdAt,
    };
  }
  if (action.id !== session.id) return session;
  if (action.type === 'selection-read') {
    return {
      ...session,
      rawSelection: action.rawSelection,
      parsedRecipient: emptyAddress(),
      status: 'parsing',
    };
  }
  if (action.type === 'parsing') return { ...session, status: 'parsing' };
  if (action.type === 'ready') {
    return {
      id: session.id,
      rawSelection: action.rawSelection,
      parsedRecipient: extractionResultToAddress(action.result),
      status: 'ready',
      createdAt: session.createdAt,
    };
  }
  if (action.type === 'error') {
    return {
      id: session.id,
      rawSelection: action.rawSelection,
      parsedRecipient: emptyAddress(),
      status: 'error',
      createdAt: session.createdAt,
    };
  }
  return { ...session, parsedRecipient: action.recipient };
}
