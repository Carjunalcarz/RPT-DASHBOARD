export type SignatoryStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export type AuditEntry = {
  id: string;
  entity: 'signatory' | 'memorandum' | 'sworn';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'notify' | 'view';
  user: string;
  timestamp: string;
  details: string;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
};

export type SignatoryRecord = {
  id: string;
  name: string;
  title: string;
  status: SignatoryStatus;
  dateSigned: string;
  sgd: boolean;
  tpd: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string;
};

export type MemorandumRecord = {
  id: string;
  subject: string;
  body: string;
  status: SignatoryStatus;
  effectiveDate: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string;
};

export type SwornStatementRecord = {
  id: string;
  signatory: string;
  status: SignatoryStatus;
  dateSubscribed: string;
  tin1: string;
  tin2: string;
  officialAdministeringOath: string;
  officialTitle: string;
  representativeName: string;
  swornStatementNo: string;
  swornStatementDate: string;
  landMarketValue: string;
  improvementsMarketValue: string;
  taxCertNo: string;
  taxCertDateIssued: string;
  taxCertPlaceIssued: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: string;
  updatedBy: string;
};

const makeId = () => `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

const makeAudit = (entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry => ({
  id: makeId(),
  timestamp: now(),
  ...entry,
});

export const validateSignatory = (record: Pick<SignatoryRecord, 'name' | 'title' | 'status' | 'dateSigned'>) => {
  const errors: Record<string, string> = {};
  if (!record.name.trim()) errors.name = 'Name is required';
  if (!record.title.trim()) errors.title = 'Title is required';
  if (record.status === 'Approved' && !record.dateSigned) errors.dateSigned = 'Date signed is required';
  return errors;
};

export const validateMemorandum = (record: Pick<MemorandumRecord, 'subject' | 'body'>) => {
  const errors: Record<string, string> = {};
  if (!record.subject.trim()) errors.subject = 'Subject is required';
  if (!record.body.trim()) errors.body = 'Body is required';
  return errors;
};

export const validateSwornStatement = (
  record: Pick<SwornStatementRecord, 'signatory' | 'status' | 'dateSubscribed'>
) => {
  const errors: Record<string, string> = {};
  if (!record.signatory.trim()) errors.signatory = 'Signatory is required';
  if (record.status === 'Approved' && !record.dateSubscribed) errors.dateSubscribed = 'Date subscribed is required';
  return errors;
};

export const createSignatory = (list: SignatoryRecord[], draft: SignatoryRecord, user: string) => {
  const timestamp = now();
  const record: SignatoryRecord = {
    ...draft,
    id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: user,
    updatedBy: user,
  };
  return {
    list: [record, ...list],
    record,
    audit: makeAudit({
      entity: 'signatory',
      entityId: record.id,
      action: 'create',
      user,
      details: `${record.name} created`,
    }),
  };
};

export const updateSignatory = (list: SignatoryRecord[], id: string, updates: Partial<SignatoryRecord>, user: string) => {
  const timestamp = now();
  let updated: SignatoryRecord | null = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      ...updates,
      updatedAt: timestamp,
      updatedBy: user,
    };
    return updated;
  });
  return {
    list: next,
    record: updated,
    audit: updated
      ? makeAudit({
          entity: 'signatory',
          entityId: id,
          action: 'update',
          user,
          details: 'Signatory updated',
        })
      : null,
  };
};

export const softDeleteSignatory = (list: SignatoryRecord[], id: string, user: string) => {
  const timestamp = now();
  let deleted: SignatoryRecord | null = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    deleted = {
      ...item,
      deletedAt: timestamp,
      updatedAt: timestamp,
      updatedBy: user,
    };
    return deleted;
  });
  return {
    list: next,
    record: deleted,
    audit: deleted
      ? makeAudit({
          entity: 'signatory',
          entityId: id,
          action: 'delete',
          user,
          details: 'Signatory deleted',
        })
      : null,
  };
};

export const createMemorandum = (list: MemorandumRecord[], draft: MemorandumRecord, user: string) => {
  const timestamp = now();
  const record: MemorandumRecord = {
    ...draft,
    id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: user,
    updatedBy: user,
  };
  return {
    list: [record, ...list],
    record,
    audit: makeAudit({
      entity: 'memorandum',
      entityId: record.id,
      action: 'create',
      user,
      details: `${record.subject} created`,
    }),
  };
};

export const updateMemorandum = (list: MemorandumRecord[], id: string, updates: Partial<MemorandumRecord>, user: string) => {
  const timestamp = now();
  let updated: MemorandumRecord | null = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      ...updates,
      updatedAt: timestamp,
      updatedBy: user,
    };
    return updated;
  });
  return {
    list: next,
    record: updated,
    audit: updated
      ? makeAudit({
          entity: 'memorandum',
          entityId: id,
          action: 'update',
          user,
          details: 'Memorandum updated',
        })
      : null,
  };
};

export const softDeleteMemorandum = (list: MemorandumRecord[], id: string, user: string) => {
  const timestamp = now();
  let deleted: MemorandumRecord | null = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    deleted = {
      ...item,
      deletedAt: timestamp,
      updatedAt: timestamp,
      updatedBy: user,
    };
    return deleted;
  });
  return {
    list: next,
    record: deleted,
    audit: deleted
      ? makeAudit({
          entity: 'memorandum',
          entityId: id,
          action: 'delete',
          user,
          details: 'Memorandum deleted',
        })
      : null,
  };
};

export const createSwornStatement = (list: SwornStatementRecord[], draft: SwornStatementRecord, user: string) => {
  const timestamp = now();
  const record: SwornStatementRecord = {
    ...draft,
    id: makeId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: user,
    updatedBy: user,
  };
  return {
    list: [record, ...list],
    record,
    audit: makeAudit({
      entity: 'sworn',
      entityId: record.id,
      action: 'create',
      user,
      details: `${record.signatory} sworn statement created`,
    }),
  };
};

export const updateSwornStatement = (
  list: SwornStatementRecord[],
  id: string,
  updates: Partial<SwornStatementRecord>,
  user: string
) => {
  const timestamp = now();
  let updated: SwornStatementRecord | null = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    updated = {
      ...item,
      ...updates,
      updatedAt: timestamp,
      updatedBy: user,
    };
    return updated;
  });
  return {
    list: next,
    record: updated,
    audit: updated
      ? makeAudit({
          entity: 'sworn',
          entityId: id,
          action: 'update',
          user,
          details: 'Sworn statement updated',
        })
      : null,
  };
};

export const softDeleteSwornStatement = (list: SwornStatementRecord[], id: string, user: string) => {
  const timestamp = now();
  let deleted: SwornStatementRecord | null = null;
  const next = list.map((item) => {
    if (item.id !== id) return item;
    deleted = {
      ...item,
      deletedAt: timestamp,
      updatedAt: timestamp,
      updatedBy: user,
    };
    return deleted;
  });
  return {
    list: next,
    record: deleted,
    audit: deleted
      ? makeAudit({
          entity: 'sworn',
          entityId: id,
          action: 'delete',
          user,
          details: 'Sworn statement deleted',
        })
      : null,
  };
};

export const filterSignatories = (
  list: SignatoryRecord[],
  query: string,
  status: SignatoryStatus | 'All',
  includeDeleted: boolean
) => {
  const normalized = query.trim().toLowerCase();
  return list.filter((item) => {
    if (!includeDeleted && item.deletedAt) return false;
    if (status !== 'All' && item.status !== status) return false;
    if (!normalized) return true;
    return (
      item.name.toLowerCase().includes(normalized) ||
      item.title.toLowerCase().includes(normalized)
    );
  });
};

export const filterMemorandums = (
  list: MemorandumRecord[],
  query: string,
  status: SignatoryStatus | 'All',
  includeDeleted: boolean
) => {
  const normalized = query.trim().toLowerCase();
  return list.filter((item) => {
    if (!includeDeleted && item.deletedAt) return false;
    if (status !== 'All' && item.status !== status) return false;
    if (!normalized) return true;
    return (
      item.subject.toLowerCase().includes(normalized) ||
      item.body.toLowerCase().includes(normalized)
    );
  });
};

export const filterSwornStatements = (
  list: SwornStatementRecord[],
  query: string,
  status: SignatoryStatus | 'All',
  includeDeleted: boolean
) => {
  const normalized = query.trim().toLowerCase();
  return list.filter((item) => {
    if (!includeDeleted && item.deletedAt) return false;
    if (status !== 'All' && item.status !== status) return false;
    if (!normalized) return true;
    return (
      item.signatory.toLowerCase().includes(normalized) ||
      item.officialTitle.toLowerCase().includes(normalized) ||
      item.swornStatementNo.toLowerCase().includes(normalized)
    );
  });
};

export const addAuditEntry = (list: AuditEntry[], entry: AuditEntry) => [entry, ...list];
