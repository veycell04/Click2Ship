import type { AddressExtractionResult } from '../domain/models';
import { handleBackendRequest } from './backendFetch';
import { isBackendRequestMessage } from '../messaging/backendMessages';
import {
  SELECTION_DEBUG_KEY,
  SELECTION_ID_KEY,
  SELECTION_KEY,
  SELECTION_STATUS_KEY,
  SELECTED_AT_KEY,
  SOURCE_TAB_ID_KEY,
  EXTRACTION_RESULT_KEY,
  EXTRACTION_SESSION_ID_KEY,
  COMPLETED_SHIPMENT_KEY,
} from '../services/storage';

const MENU_ID = 'create-shipping-label';
const SELECTION_TIMEOUT_MS = 1250;

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isBackendRequestMessage(message)) return false;
  void handleBackendRequest(message)
    .then((result) => sendResponse(result))
    .catch((error: unknown) =>
      sendResponse({
        success: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  return true;
});

interface StructuredSelectionResponse {
  structuredText?: string;
  plainText?: string;
  detectedMarketplace?: string;
  extractionResult?: AddressExtractionResult | null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.error('Failed to clear existing context menus', chrome.runtime.lastError.message);
    }
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Create Shipping Label',
      contexts: ['selection'],
    });
    if (chrome.runtime.lastError) {
      console.error('Failed to create context menu', chrome.runtime.lastError.message);
    }
  });
});

async function captureStructuredSelection(
  tabId: number,
  fallbackText: string,
  selectionId: string,
): Promise<void> {
  console.log('Structured-selection request started', { tabId });

  try {
    const response = await Promise.race([
      chrome.tabs.sendMessage(tabId, {
        type: 'GET_STRUCTURED_SELECTION',
      }) as Promise<StructuredSelectionResponse>,
      new Promise<never>((_resolve, reject) => {
        globalThis.setTimeout(
          () =>
            reject(
              new Error(`Structured-selection request timed out after ${SELECTION_TIMEOUT_MS} ms`),
            ),
          SELECTION_TIMEOUT_MS,
        );
      }),
    ]);

    console.log('Content-script response', response);
    const structuredText = response?.structuredText?.trim() ?? '';
    const bestText = structuredText || response?.plainText?.trim() || fallbackText;
    const usedFallback = !structuredText && !response?.extractionResult;
    if (usedFallback) console.log('Fallback used');

    const current = await chrome.storage.local.get(SELECTION_ID_KEY);
    if (current[SELECTION_ID_KEY] !== selectionId) {
      console.log('Ignoring stale extraction result', {
        staleSelectionId: selectionId,
        currentSelectionId: current[SELECTION_ID_KEY],
      });
      return;
    }

    await chrome.storage.local.set({
      [SELECTION_ID_KEY]: selectionId,
      [SELECTION_KEY]: bestText,
      [SELECTION_STATUS_KEY]: usedFallback ? 'fallback' : 'ready',
      [EXTRACTION_RESULT_KEY]: response?.extractionResult ?? null,
      [EXTRACTION_SESSION_ID_KEY]: selectionId,
      [SOURCE_TAB_ID_KEY]: tabId,
      [SELECTION_DEBUG_KEY]: {
        rawSelectionText: fallbackText,
        structuredSelection: structuredText,
        parserInput: bestText,
        detectedMarketplace: response?.detectedMarketplace ?? '',
        extractionResult: response?.extractionResult ?? null,
      },
    });
    console.log('Storage update completed');
  } catch (error) {
    console.warn('Structured selection unavailable', error);
    console.log('Fallback used');
    const current = await chrome.storage.local.get(SELECTION_ID_KEY);
    if (current[SELECTION_ID_KEY] !== selectionId) {
      console.log('Ignoring stale extraction result', {
        staleSelectionId: selectionId,
        currentSelectionId: current[SELECTION_ID_KEY],
      });
      return;
    }
    await chrome.storage.local.set({
      [SELECTION_ID_KEY]: selectionId,
      [SELECTION_KEY]: fallbackText,
      [SELECTION_STATUS_KEY]: 'fallback',
      [EXTRACTION_RESULT_KEY]: null,
      [EXTRACTION_SESSION_ID_KEY]: selectionId,
      [SOURCE_TAB_ID_KEY]: tabId,
      [SELECTION_DEBUG_KEY]: {
        rawSelectionText: fallbackText,
        structuredSelection: '',
        parserInput: fallbackText,
        detectedMarketplace: '',
        extractionResult: null,
      },
    });
    console.log('Storage update completed');
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;

  const tabId = tab.id;
  const fallbackText = info.selectionText ?? '';
  const selectionId = crypto.randomUUID();
  console.log('Context-menu click received');
  console.log('Tab ID:', tabId);

  void chrome.storage.local
    .set({
      [SELECTION_KEY]: fallbackText,
      [SELECTION_ID_KEY]: selectionId,
      [SELECTION_STATUS_KEY]: 'loading',
      [SELECTED_AT_KEY]: Date.now(),
      [SOURCE_TAB_ID_KEY]: tabId,
      [EXTRACTION_RESULT_KEY]: null,
      [EXTRACTION_SESSION_ID_KEY]: null,
      [COMPLETED_SHIPMENT_KEY]: null,
      [SELECTION_DEBUG_KEY]: {
        rawSelectionText: fallbackText,
        structuredSelection: '',
        parserInput: fallbackText,
        detectedMarketplace: '',
        extractionResult: null,
      },
    })
    .then(() => console.log('Initial fallback storage update completed'))
    .catch((error: unknown) => console.error('Initial storage update failed', error));

  console.log('Side-panel open started');
  void chrome.sidePanel.open({ tabId }).then(
    () => console.log('Side-panel open succeeded'),
    (error: unknown) => console.error('Side-panel open failed', error),
  );

  void captureStructuredSelection(tabId, fallbackText, selectionId);
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  void chrome.sidePanel
    .open({ tabId: tab.id })
    .catch((error: unknown) => console.error('Side-panel open failed', error));
});
