import type { MarketplaceAdapter } from '../domain/providers';

const semanticContainerSelector =
  'section, article, address, [role="group"], [role="region"], td, li';

function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0
  );
}

function findVisibleHeading(): Element | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    if (/^ship\s*to\s*:?$/i.test(element.textContent?.trim() ?? '') && isVisible(element))
      return element;
    node = walker.nextNode();
  }
  return null;
}

export class AmazonMarketplaceAdapter implements MarketplaceAdapter {
  matches(url: string): boolean {
    try {
      return /(^|\.)amazon\.[a-z.]+$/i.test(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  async extractRawAddressBlock(): Promise<string | null> {
    const heading = findVisibleHeading();
    if (!heading) return null;
    let container =
      heading.closest<HTMLElement>(semanticContainerSelector) ?? heading.parentElement;
    for (let depth = 0; container && depth < 8; depth += 1, container = container.parentElement) {
      const text = container.innerText;
      if (/address\s+type|contact\s+buyer/i.test(text) && text.length < 5000) {
        console.debug('Click2Ship Amazon raw address block', {
          headingNode: heading,
          containerNode: container,
          rawText: text,
        });
        return text;
      }
    }
    return heading.parentElement?.textContent?.trim() || null;
  }
}
