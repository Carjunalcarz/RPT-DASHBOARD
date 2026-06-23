import { useEffect, useMemo, useState } from 'react';
import { BaseDialog, FormInput } from '@/components/ui/dialog';
import type {
  AccountGroupHierarchy,
  MajorAccountGroupHierarchy,
  SubMajorAccountGroupHierarchy,
} from '@/types/accounting.types';
import { getNextNumericCode, sanitizeNumericCode } from '../utils/codeSequence';

interface SubMajorAccountGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    description: string;
    major_account_group: string;
    status: boolean;
    editable: boolean;
  }) => Promise<void>;
  accountGroups: AccountGroupHierarchy[];
  majorGroups: MajorAccountGroupHierarchy[];
  existingSubMajorGroups: SubMajorAccountGroupHierarchy[];
  defaultAccountGroupId?: string;
  defaultMajorGroupId?: string;
  editingData?: SubMajorAccountGroupHierarchy | null;
  isLoading?: boolean;
  error?: string;
}

export const SubMajorAccountGroupDialog = ({
  open,
  onClose,
  onSubmit,
  accountGroups,
  majorGroups,
  existingSubMajorGroups,
  defaultAccountGroupId,
  defaultMajorGroupId,
  editingData,
  isLoading = false,
  error,
}: SubMajorAccountGroupDialogProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCodeDirty, setIsCodeDirty] = useState(false);
  const [selectedAccountGroupId, setSelectedAccountGroupId] = useState(defaultAccountGroupId || '');

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    major_account_group: defaultMajorGroupId || '',
    status: true,
    editable: true,
  });

  const majorGroupMap = useMemo(
    () => new Map(majorGroups.map((group) => [group.id, group])),
    [majorGroups]
  );

  const filteredMajorGroups = useMemo(
    () => majorGroups.filter((group) => !selectedAccountGroupId || group.account_group === selectedAccountGroupId),
    [majorGroups, selectedAccountGroupId]
  );

  const nextCodeForSelectedMajor = useMemo(() => {
    const currentMajorId = formData.major_account_group || defaultMajorGroupId || '';
    if (!currentMajorId) return '';

    const siblingCodes = existingSubMajorGroups
      .filter((group) => group.major_account_group === currentMajorId)
      .map((group) => group.code);

    return getNextNumericCode(siblingCodes);
  }, [defaultMajorGroupId, existingSubMajorGroups, formData.major_account_group]);

  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasInitialized) return;

    if (editingData) {
      const parentMajor = majorGroupMap.get(editingData.major_account_group);
      setSelectedAccountGroupId(parentMajor?.account_group ?? defaultAccountGroupId ?? '');
      setFormData({
        code: sanitizeNumericCode(editingData.code),
        description: editingData.description,
        major_account_group: editingData.major_account_group,
        status: editingData.status,
        editable: editingData.editable,
      });
      setIsCodeDirty(true);
      setHasInitialized(true);
      return;
    }

    const initialMajorGroupId = defaultMajorGroupId || '';
    const siblingCodes = existingSubMajorGroups
      .filter((group) => group.major_account_group === initialMajorGroupId)
      .map((group) => group.code);

    setSelectedAccountGroupId(defaultAccountGroupId || '');
    setFormData({
      code: initialMajorGroupId ? getNextNumericCode(siblingCodes) : '',
      description: '',
      major_account_group: initialMajorGroupId,
      status: true,
      editable: true,
    });
    setIsCodeDirty(false);
    setHasInitialized(true);
  }, [
    defaultAccountGroupId,
    defaultMajorGroupId,
    editingData,
    existingSubMajorGroups,
    hasInitialized,
    majorGroupMap,
    open,
  ]);

  useEffect(() => {
    if (editingData || isCodeDirty || !open) return;

    setFormData((prev) => ({
      ...prev,
      code: nextCodeForSelectedMajor,
    }));
  }, [editingData, isCodeDirty, nextCodeForSelectedMajor, open]);

  useEffect(() => {
    if (!formData.major_account_group) return;
    if (!filteredMajorGroups.some((group) => group.id === formData.major_account_group)) {
      setFormData((prev) => ({ ...prev, major_account_group: '' }));
    }
  }, [filteredMajorGroups, formData.major_account_group]);

  const handleSubmit = async () => {
    if (!formData.major_account_group || !formData.code.trim() || !formData.description.trim()) return;

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
      title={isEditMode ? 'Edit Sub Major Account Group' : 'Add Sub Major Account Group'}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Add Sub Major Group'}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="sub-major-group-account-group" className="block text-sm font-medium text-foreground">
            Account Group <span className="text-error ml-1">*</span>
          </label>
          <select
            id="sub-major-group-account-group"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={selectedAccountGroupId}
            onChange={(e) => {
              setSelectedAccountGroupId(e.target.value);
              setFormData((prev) => ({ ...prev, major_account_group: '' }));
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
          <label htmlFor="sub-major-group-major-group" className="block text-sm font-medium text-foreground">
            Major Account Group <span className="text-error ml-1">*</span>
          </label>
          <select
            id="sub-major-group-major-group"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.major_account_group}
            onChange={(e) => {
              const nextMajorId = e.target.value;
              const siblingCodes = existingSubMajorGroups
                .filter((group) => group.major_account_group === nextMajorId)
                .map((group) => group.code);

              setIsCodeDirty(false);
              setFormData({
                ...formData,
                major_account_group: nextMajorId,
                code: nextMajorId ? getNextNumericCode(siblingCodes) : '',
              });
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

        <FormInput
          id="sub-major-group-code"
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
          id="sub-major-group-description"
          label="Description"
          placeholder="e.g., Cash in Bank"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="sub-major-group-status" className="block text-sm font-medium text-foreground">
            Status <span className="text-error ml-1">*</span>
          </label>
          <select
            id="sub-major-group-status"
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
              id="sub-major-group-editable"
              checked={formData.editable}
              onChange={(e) => setFormData({ ...formData, editable: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="sub-major-group-editable" className="text-sm font-medium text-foreground cursor-pointer select-none">
              Editable
            </label>
          </div>
        )}
      </div>
    </BaseDialog>
  );
};
