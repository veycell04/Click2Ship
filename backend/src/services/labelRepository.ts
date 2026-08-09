import type { CreatedLabel } from '../types/shipping.js';

export type LabelStatus = 'processing' | 'completed' | 'failed' | 'unknown';
export interface LabelRecord {
  selectionId: string;
  orderId?: string;
  providerLabelId?: string;
  trackingNumber?: string;
  labelTypeId?: number;
  reference?: string;
  status: LabelStatus;
  createdAt: string;
  label: CreatedLabel | null;
  errorCode?: string;
  providerDownloadUrl?: string;
}
export interface LabelRepository {
  findBySelectionId(selectionId: string): Promise<LabelRecord | null>;
  findByLabelId(labelId: string): Promise<LabelRecord | null>;
  claimProcessing(selectionId: string, provider?: string): Promise<LabelRecord | null>;
  claimRetryProcessing(selectionId: string): Promise<boolean>;
  markCompleted(selectionId: string, label: CreatedLabel, orderId?: string, providerDownloadUrl?: string): Promise<void>;
  markFailed(selectionId: string, errorCode: string, unknown?: boolean): Promise<void>;
}

export class InMemoryLabelRepository implements LabelRepository {
  private readonly records = new Map<string, LabelRecord>();
  async findBySelectionId(id: string) {
    return this.records.get(id) ?? null;
  }
  async findByLabelId(id: string) {
    return [...this.records.values()].find((record) => record.label?.id === id) ?? null;
  }
  async claimProcessing(selectionId: string, _provider = 'legacy') {
    void _provider;
    const existing = this.records.get(selectionId);
    if (existing) return existing;
    this.records.set(selectionId, {
      selectionId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      label: null,
    });
    return null;
  }
  async claimRetryProcessing(selectionId: string) {
    const existing = this.records.get(selectionId);
    if (
      !existing ||
      (existing.status !== 'failed' && existing.status !== 'unknown' && existing.status !== 'processing')
    ) return false;
    this.records.set(selectionId, {
      selectionId,
      status: 'processing',
      createdAt: existing.createdAt,
      label: null,
    });
    return true;
  }
  async markCompleted(selectionId: string, label: CreatedLabel, orderId?: string, providerDownloadUrl?: string) {
    this.records.set(selectionId, {
      selectionId,
      providerLabelId: label.id,
      trackingNumber: label.trackingNumber,
      labelTypeId: label.labelTypeId,
      reference: label.reference,
      status: 'completed',
      createdAt: label.createdAt,
      label,
      orderId,
      providerDownloadUrl,
    });
  }
  async markFailed(selectionId: string, errorCode: string, unknown = false) {
    this.records.set(selectionId, {
      selectionId,
      status: unknown ? 'unknown' : 'failed',
      createdAt: new Date().toISOString(),
      label: null,
      errorCode,
    });
  }
}
