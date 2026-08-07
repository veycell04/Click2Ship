export interface ShippingAddress {
  fullName: string;
  company?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface CreateLabelInput {
  selectionId: string;
  labelTypeId: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  sender: ShippingAddress;
  recipient: ShippingAddress;
  reference: string;
}

export interface ShippingBalance {
  balance: number;
  currency: string;
}
export interface LabelType {
  id: number;
  name: string;
  description: string;
}
export interface CreatedLabel {
  id: string;
  trackingNumber: string;
  labelTypeId: number;
  labelTypeName: string;
  downloadUrl: string;
  reference: string;
  createdAt: string;
}
export interface LabelDownload {
  bytes: Uint8Array;
  contentType: 'application/pdf';
}

export interface ShippingProvider {
  getBalance(): Promise<ShippingBalance>;
  getLabelTypes(): Promise<LabelType[]>;
  createLabel(input: CreateLabelInput): Promise<CreatedLabel>;
  getLabel(id: string): Promise<CreatedLabel>;
  downloadLabel(id: string): Promise<LabelDownload>;
}
