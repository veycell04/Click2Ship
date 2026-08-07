import type { AddressExtractionResult } from '../domain/models';
import { AmazonMarketplaceAdapter } from '../marketplace/amazonMarketplaceAdapter';
import { GenericMarketplaceAdapter } from '../marketplace/genericMarketplaceAdapter';
import { TikTokMarketplaceAdapter } from '../marketplace/tiktokMarketplaceAdapter';
import { universalAddressExtractor } from '../services/universalAddressExtractor';

interface StructuredSelectionResponse {
  structuredText: string;
  plainText: string;
  detectedMarketplace?: string;
  extractionResult?: AddressExtractionResult | null;
}

const blockElements = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
]);

function fragmentToStructuredText(fragment: DocumentFragment): string {
  let output = '';
  const appendBoundary = () => {
    if (output && !output.endsWith('\n')) output += '\n';
  };

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      output += node.textContent ?? '';
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === 'BR') {
      appendBoundary();
      return;
    }

    const isBlock = blockElements.has(node.tagName);
    if (isBlock) appendBoundary();
    node.childNodes.forEach(visit);
    if (isBlock) appendBoundary();
  };

  fragment.childNodes.forEach(visit);
  return output
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t\f\v ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function getStructuredSelection(): StructuredSelectionResponse {
  const selection = window.getSelection();
  const plainText = selection?.toString() ?? '';
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { structuredText: '', plainText };
  }

  const fragment = selection.getRangeAt(0).cloneContents();
  return { structuredText: fragmentToStructuredText(fragment), plainText };
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    message.type !== 'GET_STRUCTURED_SELECTION'
  ) {
    return;
  }

  const selection = getStructuredSelection();
  const selectedText = selection.structuredText || selection.plainText;
  const marketplaceAdapters = [new AmazonMarketplaceAdapter(), new TikTokMarketplaceAdapter()];
  const matchedAdapter = marketplaceAdapters.find((adapter) =>
    adapter.matches(window.location.href),
  );
  const detectedMarketplace =
    matchedAdapter instanceof AmazonMarketplaceAdapter
      ? 'amazon'
      : matchedAdapter instanceof TikTokMarketplaceAdapter
        ? 'tiktok'
        : '';

  void (async () => {
    let rawAddressBlock: string | null = null;
    if (matchedAdapter) {
      try {
        rawAddressBlock = await matchedAdapter.extractRawAddressBlock();
      } catch (error) {
        console.warn('Marketplace address-block isolation failed', error);
      }
    }
    rawAddressBlock ??= await new GenericMarketplaceAdapter(selectedText).extractRawAddressBlock();
    return universalAddressExtractor.extract(rawAddressBlock);
  })().then(
    (extractionResult) =>
      sendResponse({
        ...selection,
        detectedMarketplace,
        extractionResult,
      }),
    (error: unknown) => {
      console.error('Click2Ship extraction coordinator error', error);
      sendResponse({
        ...selection,
        detectedMarketplace,
        extractionResult: null,
      });
    },
  );
  return true;
});
