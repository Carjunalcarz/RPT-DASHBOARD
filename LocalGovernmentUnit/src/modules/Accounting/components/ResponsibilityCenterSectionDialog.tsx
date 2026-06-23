import { useEffect, useState } from 'react';
import { BaseDialog, FormInput } from '@/components/ui/dialog';
import type { ResponsibilityCenter, ResponsibilityCenterSection } from '@/services/accountingService';

interface ResponsibilityCenterSectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    rcs_code: string;
    description: string;
    rc_id: string;
    is_active: boolean;
  }) => Promise<void>;
  centers: ResponsibilityCenter[];
  defaultCenterId?: string;
  editingData?: ResponsibilityCenterSection | null;
  isLoading?: boolean;
  error?: string;
}

const getCenterLabel = (center: ResponsibilityCenter) => {
  const code = center.rc_code || center.code || '';
  const description = center.description || center.name || '';

  if (code && description) return `${code} - ${description}`;
  if (description) return description;
  if (code) return code;
  return center.id;
};

export const ResponsibilityCenterSectionDialog = ({
  open,
  onClose,
  onSubmit,
  centers,
  defaultCenterId,
  editingData,
  isLoading = false,
  error,
}: ResponsibilityCenterSectionDialogProps) => {
  const [formData, setFormData] = useState({
    rcs_code: '',
    description: '',
    rc_id: defaultCenterId || '',
    is_active: true,
  });

  useEffect(() => {
    if (editingData) {
      setFormData({
        rcs_code: editingData.rcs_code,
        description: editingData.description,
        rc_id: editingData.rc_id,
        is_active: editingData.is_active,
      });
      return;
    }

    setFormData({
      rcs_code: '',
      description: '',
      rc_id: defaultCenterId || '',
      is_active: true,
    });
  }, [editingData, defaultCenterId, open]);

  const handleSubmit = async () => {
    if (!formData.rcs_code.trim() || !formData.description.trim() || !formData.rc_id) return;

    await onSubmit({
      rcs_code: formData.rcs_code.trim(),
      description: formData.description.trim(),
      rc_id: formData.rc_id,
      is_active: formData.is_active,
    });
  };

  const isEditMode = !!editingData;

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Edit Responsibility Center Section' : 'Add Responsibility Center Section'}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Add Section'}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="rcs-parent-rc" className="block text-sm font-medium text-foreground">
            Responsibility Center <span className="text-error ml-1">*</span>
          </label>
          <select
            id="rcs-parent-rc"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.rc_id}
            onChange={(e) => setFormData({ ...formData, rc_id: e.target.value })}
            required
          >
            <option value="">Select responsibility center</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {getCenterLabel(center)}
              </option>
            ))}
          </select>
        </div>

        <FormInput
          id="rcs-code"
          label="Section Code"
          placeholder="e.g., RCS-001"
          value={formData.rcs_code}
          onChange={(value) => setFormData({ ...formData, rcs_code: value })}
          required
        />

        <FormInput
          id="rcs-description"
          label="Description"
          placeholder="e.g., Payroll and Benefits Section"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="rcs-status" className="block text-sm font-medium text-foreground">
            Status <span className="text-error ml-1">*</span>
          </label>
          <select
            id="rcs-status"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.is_active ? 'active' : 'inactive'}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </BaseDialog>
  );
};
