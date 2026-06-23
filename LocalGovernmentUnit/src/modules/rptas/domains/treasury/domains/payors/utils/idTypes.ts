/** Supported Philippine valid ID types and their ID-number validation patterns. */
export type PhIdType =
  | 'national_id'
  | 'drivers_license'
  | 'passport'
  | 'umid'
  | 'postal_id'
  | 'prc_id'
  | 'voters_id'
  | 'senior_id';

export interface IdTypeOption {
  value: PhIdType;
  label: string;
  placeholder: string;
  /** Validation pattern for the ID number (case-insensitive). */
  pattern: RegExp;
}

export const ID_TYPE_OPTIONS: IdTypeOption[] = [
  { value: 'national_id', label: 'National ID (PhilSys)', placeholder: 'e.g. 1234-5678-9012-3456', pattern: /^[0-9-]{8,19}$/ },
  { value: 'drivers_license', label: "Driver's License", placeholder: 'e.g. N02-12-123456', pattern: /^[a-z0-9-]{6,20}$/i },
  { value: 'passport', label: 'Passport', placeholder: 'e.g. P1234567A', pattern: /^[a-z0-9]{6,12}$/i },
  { value: 'umid', label: 'UMID', placeholder: 'e.g. CRN-0111-1234567-8', pattern: /^[a-z0-9-]{8,24}$/i },
  { value: 'postal_id', label: 'Postal ID', placeholder: 'e.g. PRN1234567890', pattern: /^[a-z0-9-]{6,20}$/i },
  { value: 'prc_id', label: 'PRC ID', placeholder: 'e.g. 1234567', pattern: /^[a-z0-9-]{6,16}$/i },
  { value: 'voters_id', label: "Voter's ID", placeholder: 'e.g. 1234-5678A-B9012-3', pattern: /^[a-z0-9-]{6,32}$/i },
  { value: 'senior_id', label: 'Senior Citizen ID', placeholder: 'OSCA/Senior ID No.', pattern: /^[a-z0-9-]{4,24}$/i },
];
