import { useEffect, useMemo, useState } from 'react';
import { BaseDialog, FormInput } from '@/components/ui/dialog';
import { fetchPlans } from '@/services/accountingPlanService';
import type {
  AccountGroupHierarchy,
  AccountType,
  GeneralLedgerAccountHierarchy,
  MajorAccountGroupHierarchy,
  SubMajorAccountGroupHierarchy,
} from '@/types/accounting.types';
import { getNextNumericCode, sanitizeNumericCode } from '../utils/codeSequence';

const DEFAULT_ACCOUNT_TYPES: AccountType[] = ['Budgetary Accounts', 'Financial Transactions'];

interface GeneralLedgerAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    description: string;
    sub_major_account_group: string;
    account_type: AccountType;
    status: boolean;
    editable: boolean;
  }) => Promise<void>;
  accountGroups: AccountGroupHierarchy[];
  majorGroups: MajorAccountGroupHierarchy[];
  subMajorGroups: SubMajorAccountGroupHierarchy[];
  existingGLAccounts: GeneralLedgerAccountHierarchy[];
  defaultAccountGroupId?: string;
  defaultMajorGroupId?: string;
  defaultSubMajorGroupId?: string;
  editingData?: GeneralLedgerAccountHierarchy | null;
  isLoading?: boolean;
  error?: string;
}

export const GeneralLedgerAccountDialog = ({
  open,
  onClose,
  onSubmit,
  accountGroups,
  majorGroups,
  subMajorGroups,
  existingGLAccounts,
  defaultAccountGroupId,
  defaultMajorGroupId,
  defaultSubMajorGroupId,
  editingData,
  isLoading = false,
  error,
}: GeneralLedgerAccountDialogProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCodeDirty, setIsCodeDirty] = useState(false);
  const [selectedAccountGroupId, setSelectedAccountGroupId] = useState(defaultAccountGroupId || '');
  const [selectedMajorGroupId, setSelectedMajorGroupId] = useState(defaultMajorGroupId || '');
  const [accountTypeOptions, setAccountTypeOptions] = useState<AccountType[]>(DEFAULT_ACCOUNT_TYPES);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    sub_major_account_group: defaultSubMajorGroupId || '',
    account_type: 'Budgetary Accounts' as AccountType,
    status: true,
    editable: true,
  });

  const majorGroupMap = useMemo(
    () => new Map(majorGroups.map((group) => [group.id, group])),
    [majorGroups]
  );

  const subMajorGroupMap = useMemo(
    () => new Map(subMajorGroups.map((group) => [group.id, group])),
    [subMajorGroups]
  );

  const filteredMajorGroups = useMemo(
    () => majorGroups.filter((group) => !selectedAccountGroupId || group.account_group === selectedAccountGroupId),
    [majorGroups, selectedAccountGroupId]
  );

  const filteredSubMajorGroups = useMemo(
    () => subMajorGroups.filter((group) => !selectedMajorGroupId || group.major_account_group === selectedMajorGroupId),
    [subMajorGroups, selectedMajorGroupId]
  );

  const nextCodeForSelectedSubMajor = useMemo(() => {
    const currentSubMajorId = formData.sub_major_account_group || defaultSubMajorGroupId || '';
    if (!currentSubMajorId) return '';

    const siblingCodes = existingGLAccounts
      .filter((group) => group.sub_major_account_group === currentSubMajorId)
      .map((group) => group.code);

    return getNextNumericCode(siblingCodes);
  }, [defaultSubMajorGroupId, existingGLAccounts, formData.sub_major_account_group]);

  useEffect(() => {
    const loadAccountTypes = async () => {
      const plans = await fetchPlans();
      const distinctTypes = Array.from(
        new Set(
          plans
            .map((plan) => plan.accounty_type)
            .filter((value): value is AccountType => Boolean(value))
        )
      );

      // Always keep both enum values available, even if existing plan data only has one.
      const mergedOptions = Array.from(new Set([...DEFAULT_ACCOUNT_TYPES, ...distinctTypes]));
      setAccountTypeOptions(mergedOptions);
    };

    if (open) {
      loadAccountTypes();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasInitialized) return;

    if (editingData) {
      const subMajor = subMajorGroupMap.get(editingData.sub_major_account_group);
      const majorId = subMajor?.major_account_group ?? defaultMajorGroupId ?? '';
      const accountId = majorId
        ? (majorGroupMap.get(majorId)?.account_group ?? defaultAccountGroupId ?? '')
        : (defaultAccountGroupId ?? '');

      setSelectedAccountGroupId(accountId);
      setSelectedMajorGroupId(majorId);
      setFormData({
        code: sanitizeNumericCode(editingData.code),
        description: editingData.description,
        sub_major_account_group: editingData.sub_major_account_group,
        account_type: (editingData.account_type ?? 'Budgetary Accounts') as AccountType,
        status: editingData.status,
        editable: editingData.editable,
      });
      setIsCodeDirty(true);
      setHasInitialized(true);
      return;
    }

    const initialSubMajorId = defaultSubMajorGroupId || '';
    const initialSubMajor = initialSubMajorId ? subMajorGroupMap.get(initialSubMajorId) : null;
    const initialMajorId = initialSubMajor?.major_account_group ?? defaultMajorGroupId ?? '';
    const initialAccountId = initialMajorId
      ? (majorGroupMap.get(initialMajorId)?.account_group ?? defaultAccountGroupId ?? '')
      : (defaultAccountGroupId ?? '');

    setSelectedAccountGroupId(initialAccountId);
    setSelectedMajorGroupId(initialMajorId);

    const siblingCodes = initialSubMajorId
      ? existingGLAccounts
          .filter((group) => group.sub_major_account_group === initialSubMajorId)
          .map((group) => group.code)
      : [];

    setFormData({
      code: initialSubMajorId ? getNextNumericCode(siblingCodes) : '',
      description: '',
      sub_major_account_group: initialSubMajorId,
      account_type: accountTypeOptions[0] ?? 'Budgetary Accounts',
      status: true,
      editable: true,
    });
    setIsCodeDirty(false);
    setHasInitialized(true);
  }, [
    hasInitialized,
    editingData,
    defaultAccountGroupId,
    defaultMajorGroupId,
    defaultSubMajorGroupId,
    accountTypeOptions,
    existingGLAccounts,
    majorGroupMap,
    open,
    subMajorGroupMap,
  ]);

  useEffect(() => {
    if (editingData || isCodeDirty || !open) return;

    setFormData((prev) => ({
      ...prev,
      code: nextCodeForSelectedSubMajor,
    }));
  }, [editingData, isCodeDirty, nextCodeForSelectedSubMajor, open]);

  useEffect(() => {
    if (!selectedMajorGroupId) return;
    if (!filteredMajorGroups.some((group) => group.id === selectedMajorGroupId)) {
      setSelectedMajorGroupId('');
      setFormData((prev) => ({ ...prev, sub_major_account_group: '' }));
    }
  }, [filteredMajorGroups, selectedMajorGroupId]);

  useEffect(() => {
    if (!formData.sub_major_account_group) return;
    if (!filteredSubMajorGroups.some((group) => group.id === formData.sub_major_account_group)) {
      setFormData((prev) => ({ ...prev, sub_major_account_group: '' }));
    }
  }, [filteredSubMajorGroups, formData.sub_major_account_group]);

  const handleSubmit = async () => {
    if (!formData.sub_major_account_group || !formData.code.trim() || !formData.description.trim()) return;

    await onSubmit({
      ...formData,
      code: formData.code.trim(),
      description: formData.description.trim(),
    });
  };

  const isEditMode = !!editingData;

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Edit General Ledger Account' : 'Add General Ledger Account'}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Add GL Account'}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="gla-account-group" className="block text-sm font-medium text-foreground">
            Account Group <span className="text-error ml-1">*</span>
          </label>
          <select
            id="gla-account-group"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={selectedAccountGroupId}
            onChange={(e) => {
              setSelectedAccountGroupId(e.target.value);
              setSelectedMajorGroupId('');
              setFormData((prev) => ({ ...prev, sub_major_account_group: '' }));
            }}
            required
          >
            <option value="">Select account group</option>
            {accountGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.code} - {group.description}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gla-major-group" className="block text-sm font-medium text-foreground">
            Major Account Group <span className="text-error ml-1">*</span>
          </label>
          <select
            id="gla-major-group"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={selectedMajorGroupId}
            onChange={(e) => {
              setSelectedMajorGroupId(e.target.value);
              setFormData((prev) => ({ ...prev, sub_major_account_group: '' }));
            }}
            disabled={!selectedAccountGroupId || filteredMajorGroups.length === 0}
            required
          >
            <option value="">Select major account group</option>
            {filteredMajorGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.code} - {group.description}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gla-sub-major-group" className="block text-sm font-medium text-foreground">
            Sub Major Account Group <span className="text-error ml-1">*</span>
          </label>
          <select
            id="gla-sub-major-group"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.sub_major_account_group}
            onChange={(e) => {
              const nextSubMajorId = e.target.value;
              const siblingCodes = existingGLAccounts
                .filter((group) => group.sub_major_account_group === nextSubMajorId)
                .map((group) => group.code);

              setIsCodeDirty(false);
              setFormData({
                ...formData,
                sub_major_account_group: nextSubMajorId,
                code: nextSubMajorId ? getNextNumericCode(siblingCodes) : '',
              });
            }}
            disabled={!selectedMajorGroupId || filteredSubMajorGroups.length === 0}
            required
          >
            <option value="">Select sub major account group</option>
            {filteredSubMajorGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.code} - {group.description}
              </option>
            ))}
          </select>
        </div>

        <FormInput
          id="gla-code"
          label="Code"
          placeholder="e.g., 123"
          value={formData.code}
          onChange={(value) => {
            setIsCodeDirty(true);
            setFormData({ ...formData, code: sanitizeNumericCode(value) });
          }}
          required
        />

        <p className="text-xs text-muted-foreground -mt-2">
          Enter numbers only (1 to 5 digits).
        </p>

        <FormInput
          id="gla-description"
          label="Description"
          placeholder="e.g., Cash in Treasury"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="gla-account-type" className="block text-sm font-medium text-foreground">
            Account Type <span className="text-error ml-1">*</span>
          </label>
          <select
            id="gla-account-type"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.account_type}
            onChange={(e) => setFormData({ ...formData, account_type: e.target.value as AccountType })}
          >
            {accountTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gla-status" className="block text-sm font-medium text-foreground">
            Status <span className="text-error ml-1">*</span>
          </label>
          <select
            id="gla-status"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.status ? 'active' : 'inactive'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value === 'active' })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isEditMode && (
          <div className="flex items-center space-x-2 py-2.5 px-4 border border-border rounded-lg">
            <input
              type="checkbox"
              id="gla-editable"
              checked={formData.editable}
              onChange={(e) => setFormData({ ...formData, editable: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="gla-editable" className="text-sm font-medium text-foreground cursor-pointer select-none">
              Editable
            </label>
          </div>
        )}
      </div>
    </BaseDialog>
  );
};
