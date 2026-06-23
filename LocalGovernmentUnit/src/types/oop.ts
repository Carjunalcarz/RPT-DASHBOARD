export interface OrderOfPayment {
  id: string;
  orderNumber?: string;
  status?: string;
  amount?: number;
  description?: string;
  createdBy?: string;
  dateCreated?: string;
  propertyIds?: string[];
}
export interface OOP {
  id: string;
}
