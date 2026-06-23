import { useEffect, useMemo, useState } from 'react';
import { BaseDialog, FormInput } from '@/components/ui/dialog';
import type { AccountGroupHierarchy, MajorAccountGroupHierarchy } from '@/types/accounting.types';
import { getNextNumericCode, sanitizeNumericCode } from '../utils/codeSequence';

interface MajorAccountGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code: string;
    description: string;
    account_group: string;
    status: boolean;
    editable: boolean;
  }) => Promise<void>;
  accountGroups: AccountGroupHierarchy[];
  existingMajorGroups: MajorAccountGroupHierarchy[];
  defaultAccountGroupId?: string;
  editingData?: MajorAccountGroupHierarchy | null;
  isLoading?: boolean;
  error?: string;
}

export const MajorAccountGroupDialog = ({
  open,
  onClose,
  onSubmit,
  accountGroups,
  existingMajorGroups,
  defaultAccountGroupId,
  editingData,
  isLoading = false,
  error,
}: MajorAccountGroupDialogProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isCodeDirty, setIsCodeDirty] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    account_group: defaultAccountGroupId || '',
    status: true,
    editable: true,
  });

  const nextCodeForSelectedParent = useMemo(() => {
    const currentParentId = formData.account_group || defaultAccountGroupId || '';
    if (!currentParentId) return '';

    const siblingCodes = existingMajorGroups
      .filter((group) => group.account_group === currentParentId)
      .map((group) => group.code);

    return getNextNumericCode(siblingCodes);
  }, [defaultAccountGroupId, existingMajorGroups, formData.account_group]);

  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasInitialized) return;

    if (editingData) {
      setFormData({
        code: sanitizeNumericCode(editingData.code),
        description: editingData.description,
        account_group: editingData.account_group,
        status: editingData.status,
        editable: editingData.editable,
      });
      setIsCodeDirty(true);
      setHasInitialized(true);
      return;
    }

    const initialParentId = defaultAccountGroupId || '';
    const siblingCodes = existingMajorGroups
      .filter((group) => group.account_group === initialParentId)
      .map((group) => group.code);

    setFormData({
      code: initialParentId ? getNextNumericCode(siblingCodes) : '',
      description: '',
      account_group: initialParentId,
      status: true,
      editable: true,
    });
    setIsCodeDirty(false);
    setHasInitialized(true);
  }, [defaultAccountGroupId, editingData, existingMajorGroups, hasInitialized, open]);

  useEffect(() => {
    if (editingData || isCodeDirty || !open) return;

    setFormData((prev) => ({
      ...prev,
      code: nextCodeForSelectedParent,
    }));
  }, [editingData, isCodeDirty, nextCodeForSelectedParent, open]);

  const handleSubmit = async () => {
    if (!formData.account_group || !formData.code.trim() || !formData.description.trim()) return;
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
      title={isEditMode ? 'Edit Major Account Group' : 'Add Major Account Group'}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Add Major Group'}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="major-group-account-group" className="block text-sm font-medium text-foreground">
            Account Group <span className="text-error ml-1">*</span>
          </label>
          <select
            id="major-group-account-group"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.account_group}
            onChange={(e) => {
              const nextParentId = e.target.value;
              const siblingCodes = existingMajorGroups
                .filter((group) => group.account_group === nextParentId)
                .map((group) => group.code);

              setIsCodeDirty(false);
              setFormData({
                ...formData,
                account_group: nextParentId,
                code: nextParentId ? getNextNumericCode(siblingCodes) : '',
              });
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

        <FormInput
          id="major-group-code"
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
          id="major-group-description"
          label="Description"
          placeholder="e.g., Current Assets"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="major-group-status" className="block text-sm font-medium text-foreground">
            Status <span className="text-error ml-1">*</span>
          </label>
          <select
            id="major-group-status"
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
              id="major-group-editable"
              checked={formData.editable}
              onChange={(e) => setFormData({ ...formData, editable: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="major-group-editable" className="text-sm font-medium text-foreground cursor-pointer select-none">
              Editable
            </label>
          </div>
        )}
      </div>
    </BaseDialog>
  );
};
