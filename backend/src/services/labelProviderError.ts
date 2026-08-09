export class LabelProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 502,
    public readonly providerResponse?: unknown,
  ) {
    super(message);
    this.name = 'LabelProviderError';
  }
}
