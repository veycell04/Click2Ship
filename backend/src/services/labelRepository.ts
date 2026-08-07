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
}
export interface LabelRepository {
  findBySelectionId(selectionId: string): Promise<LabelRecord | null>;
  findByLabelId(labelId: string): Promise<LabelRecord | null>;
  claimProcessing(selectionId: string): Promise<LabelRecord | null>;
  markCompleted(selectionId: string, label: CreatedLabel, orderId?: string): Promise<void>;
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
  async claimProcessing(selectionId: string) {
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
  async markCompleted(selectionId: string, label: CreatedLabel) {
    this.records.set(selectionId, {
      selectionId,
      providerLabelId: label.id,
      trackingNumber: label.trackingNumber,
      labelTypeId: label.labelTypeId,
      reference: label.reference,
      status: 'completed',
      createdAt: label.createdAt,
      label,
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
