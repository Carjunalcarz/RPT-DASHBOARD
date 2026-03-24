export type PayorIdType = 'passport' | 'national_id' | 'drivers_license' | string;

export type PayorContact = {
  phone?: string;
  email?: string;
};

export type Payor = {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  idType: PayorIdType;
  idNumber: string;
  contact: PayorContact;
  createdAt?: string;
  updatedAt?: string;
};

