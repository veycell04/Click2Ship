import type { MarketplaceAdapter } from '../domain/providers';

export class GenericMarketplaceAdapter implements MarketplaceAdapter {
  constructor(private readonly selectedText: string) {}
  matches(): boolean {
    return true;
  }
  async extractRawAddressBlock(): Promise<string> {
    return this.selectedText;
  }
}
