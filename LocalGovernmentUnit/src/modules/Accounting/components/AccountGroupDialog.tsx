import { useEffect, useState } from 'react';
import { BaseDialog, FormInput } from '@/components/ui/dialog';
import type { AccountGroupHierarchy } from '@/types/accounting.types';
import { getNextNumericCode, sanitizeNumericCode } from '../utils/codeSequence';

interface AccountGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; description: string; status: boolean; editable: boolean }) => Promise<void>;
  editingData?: AccountGroupHierarchy | null;
  existingCodes?: string[];
  isLoading?: boolean;
  error?: string;
}

export const AccountGroupDialog = ({
  open,
  onClose,
  onSubmit,
  editingData,
  existingCodes = [],
  isLoading = false,
  error,
}: AccountGroupDialogProps) => {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    status: true,
    editable: true,
  });

  useEffect(() => {
    if (editingData) {
      setFormData({
        code: sanitizeNumericCode(editingData.code),
        description: editingData.description,
        status: editingData.status,
        editable: editingData.editable !== undefined ? editingData.editable : true,
      });
      return;
    }

    if (!open) return;

    setFormData({
      code: getNextNumericCode(existingCodes),
      description: '',
      status: true,
      editable: true,
    });
  }, [editingData, existingCodes, open]);

  const handleSubmit = async () => {
    await onSubmit(formData);
    setFormData({ code: '', description: '', status: true, editable: true });
  };

  const isEditMode = !!editingData;

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Edit Account Group' : 'Add Account Group'}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Add Group'}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <FormInput
          id="group-code"
          label="Code"
          placeholder="e.g., 123"
          value={formData.code}
          onChange={(value) => setFormData({ ...formData, code: sanitizeNumericCode(value) })}
          required
        />

        <p className="text-xs text-muted-foreground -mt-2">
          Enter numbers only (1 to 5 digits).
        </p>

        <FormInput
          id="group-description"
          label="Description"
          placeholder="e.g., Asset Group"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="group-status" className="block text-sm font-medium text-foreground">
            Status <span className="text-error ml-1">*</span>
          </label>
          <select
            id="group-status"
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
              id="group-editable"
              checked={formData.editable}
              onChange={(e) => setFormData({ ...formData, editable: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="group-editable" className="text-sm font-medium text-foreground cursor-pointer select-none">
              Editable
            </label>
          </div>
        )}
      </div>
    </BaseDialog>
  );
};
