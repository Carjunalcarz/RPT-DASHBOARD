import { describe, expect, it } from 'vitest';
import {
  createMemorandum,
  createSignatory,
  createSwornStatement,
  filterMemorandums,
  filterSignatories,
  filterSwornStatements,
  softDeleteMemorandum,
  softDeleteSignatory,
  softDeleteSwornStatement,
  updateMemorandum,
  updateSignatory,
  updateSwornStatement,
  validateMemorandum,
  validateSignatory,
  validateSwornStatement,
  MemorandumRecord,
  SignatoryRecord,
  SwornStatementRecord,
} from './rpt_m_signatoriesCrud';

const baseSignatory: SignatoryRecord = {
  id: 's-1',
  name: 'Alex Cruz',
  title: 'Assessor',
  status: 'Draft',
  dateSigned: '',
  sgd: false,
  tpd: false,
  notes: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'Admin',
  updatedBy: 'Admin',
};

const baseMemo: MemorandumRecord = {
  id: 'm-1',
  subject: 'Memo',
  body: 'Body',
  status: 'Draft',
  effectiveDate: '',
  attachments: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'Admin',
  updatedBy: 'Admin',
};

const baseSworn: SwornStatementRecord = {
  id: 'w-1',
  signatory: 'Owner Statement',
  status: 'Draft',
  dateSubscribed: '',
  tin1: '',
  tin2: '',
  officialAdministeringOath: '',
  officialTitle: '',
  representativeName: '',
  swornStatementNo: 'SSA-100',
  swornStatementDate: '',
  landMarketValue: '0.00',
  improvementsMarketValue: '0.00',
  taxCertNo: '',
  taxCertDateIssued: '',
  taxCertPlaceIssued: '',
  notes: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'Admin',
  updatedBy: 'Admin',
};

describe('rpt_m_signatoriesCrud', () => {
  it('validates signatory fields', () => {
    const errors = validateSignatory({ name: '', title: '', status: 'Approved', dateSigned: '' });
    expect(errors.name).toBeTruthy();
    expect(errors.title).toBeTruthy();
    expect(errors.dateSigned).toBeTruthy();
  });

  it('creates and updates signatory records', () => {
    const createResult = createSignatory([], baseSignatory, 'Admin User');
    expect(createResult.list).toHaveLength(1);
    const createdId = createResult.record.id;
    const updateResult = updateSignatory(createResult.list, createdId, { name: 'Updated' }, 'Admin User') as {
      list: SignatoryRecord[];
      record: SignatoryRecord | null;
    };
    if (!updateResult.record) {
      throw new Error('Expected updated signatory record');
    }
    expect(updateResult.record.name).toBe('Updated');
  });

  it('soft deletes signatories and filters', () => {
    const createResult = createSignatory([], baseSignatory, 'Admin User');
    const deleted = softDeleteSignatory(createResult.list, createResult.record.id, 'Admin User');
    const filtered = filterSignatories(deleted.list, '', 'All', false);
    expect(filtered).toHaveLength(0);
    const included = filterSignatories(deleted.list, '', 'All', true);
    expect(included).toHaveLength(1);
  });

  it('validates memorandum fields', () => {
    const errors = validateMemorandum({ subject: '', body: '' });
    expect(errors.subject).toBeTruthy();
    expect(errors.body).toBeTruthy();
  });

  it('creates, updates, and deletes memorandums', () => {
    const created = createMemorandum([], baseMemo, 'Admin User');
    const updated = updateMemorandum(created.list, created.record.id, { subject: 'Updated' }, 'Admin User') as {
      list: MemorandumRecord[];
      record: MemorandumRecord | null;
    };
    if (!updated.record) {
      throw new Error('Expected updated memorandum record');
    }
    expect(updated.record.subject).toBe('Updated');
    const deleted = softDeleteMemorandum(updated.list, created.record.id, 'Admin User');
    const filtered = filterMemorandums(deleted.list, '', 'All', false);
    expect(filtered).toHaveLength(0);
  });

  it('validates and filters sworn statements', () => {
    const errors = validateSwornStatement({ signatory: '', status: 'Approved', dateSubscribed: '' });
    expect(errors.signatory).toBeTruthy();
    expect(errors.dateSubscribed).toBeTruthy();
    const created = createSwornStatement([], baseSworn, 'Admin User');
    const filtered = filterSwornStatements(created.list, 'owner', 'All', false);
    expect(filtered).toHaveLength(1);
  });

  it('creates, updates, and deletes sworn statements', () => {
    const created = createSwornStatement([], baseSworn, 'Admin User');
    const updated = updateSwornStatement(created.list, created.record.id, { signatory: 'Updated' }, 'Admin User') as {
      list: SwornStatementRecord[];
      record: SwornStatementRecord | null;
    };
    if (!updated.record) {
      throw new Error('Expected updated sworn statement');
    }
    expect(updated.record.signatory).toBe('Updated');
    const deleted = softDeleteSwornStatement(updated.list, created.record.id, 'Admin User');
    const filtered = filterSwornStatements(deleted.list, '', 'All', false);
    expect(filtered).toHaveLength(0);
  });
});
