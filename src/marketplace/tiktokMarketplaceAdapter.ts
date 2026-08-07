import type { MarketplaceAdapter } from '../domain/providers';

export class TikTokMarketplaceAdapter implements MarketplaceAdapter {
  matches(url: string): boolean {
    try {
      return /(^|\.)tiktok\.com$/i.test(new URL(url).hostname);
    } catch {
      return false;
    }
  }

  async extractRawAddressBlock(): Promise<string | null> {
    const elements = Array.from(
      document.querySelectorAll('section, article, address, [role="group"], [role="region"], div'),
    );
    const heading = elements.find((element) =>
      /^shipping\s+address\s*:?$/i.test(element.textContent?.trim() ?? ''),
    );
    if (!heading) return null;
    const container =
      heading.closest<HTMLElement>('section, article, address, [role="group"], [role="region"]') ??
      heading.parentElement;
    const rawText = container?.innerText?.trim() ?? '';
    console.debug('Click2Ship TikTok raw address block', {
      headingNode: heading,
      containerNode: container,
      rawText,
    });
    return rawText || null;
  }
}
