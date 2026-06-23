export type PayorIdType = string;
export interface Payor {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  idType: string;
  idNumber: string;
  contact: {
    phone: string;
    email: string;
    birthDate?: string;
    gender?: string;
    /** Proof-of-identity ID photo, stored in Supabase storage (JSONB on payor). */
    idImageUrl?: string;
    idImagePath?: string;
  };
}
export interface PayorDraft extends Omit<Payor, 'id'> {
  id?: string;
}
