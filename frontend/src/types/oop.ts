export type OopStatus = 'pending' | 'paid' | 'cancelled';
export type OopAction = 'created' | 'updated' | 'paid' | 'cancelled';

export interface OrderOfPayment {
  id: string;
  orderNumber: string;
  createdBy: string;
  amount: string;
  description: string | null;
  status: OopStatus;
  dateCreated: string;
  dateModified: string;
}

export interface OopHistory {
  id: string;
  orderId: string;
  action: OopAction;
  performedBy: string;
  payload: unknown;
  timestamp: string;
}

