import { useEffect, useState } from 'react';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { BaseDialog, FormInput } from '@/components/ui/dialog';
import type { ResponsibilityCenter, ResponsibilityCenterSection } from '@/services/accountingService';

export interface ResponsibilityCenterSectionFormItem {
  id?: string;
  rcs_code: string;
  description: string;
  is_active: boolean;
  markedForDelete?: boolean;
}

interface ResponsibilityCenterDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    rc_code: string;
    description: string;
    is_active: boolean;
    sections: ResponsibilityCenterSectionFormItem[];
  }) => Promise<void>;
  editingData?: ResponsibilityCenter | null;
  existingSections?: ResponsibilityCenterSection[];
  isLoading?: boolean;
  error?: string;
}

export const ResponsibilityCenterDialog = ({
  open,
  onClose,
  onSubmit,
  editingData,
  existingSections = [],
  isLoading = false,
  error,
}: ResponsibilityCenterDialogProps) => {
  const [formData, setFormData] = useState({
    rc_code: '',
    description: '',
    is_active: true,
  });
  const [sections, setSections] = useState<ResponsibilityCenterSectionFormItem[]>([]);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (editingData) {
      setFormData({
        rc_code: editingData.rc_code || editingData.code || '',
        description: editingData.description || '',
        is_active: editingData.is_active ?? true,
      });

      setSections(
        existingSections.map((section) => ({
          id: section.id,
          rcs_code: section.rcs_code,
          description: section.description,
          is_active: section.is_active,
          markedForDelete: false,
        }))
      );

      return;
    }

    setFormData({
      rc_code: '',
      description: '',
      is_active: true,
    });
    setSections([]);
  }, [editingData, existingSections, open]);

  const addSectionRow = () => {
    setSections((prev) => [
      ...prev,
      { rcs_code: '', description: '', is_active: true, markedForDelete: false },
    ]);
  };

  const updateSectionRow = (
    index: number,
    patch: Partial<ResponsibilityCenterSectionFormItem>
  ) => {
    setSections((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const removeSectionRow = (index: number) => {
    setSections((prev) => {
      const row = prev[index];
      if (!row) return prev;

      if (!row.id) return prev.filter((_, idx) => idx !== index);

      return prev.map((item, idx) =>
        idx === index ? { ...item, markedForDelete: !item.markedForDelete } : item
      );
    });
  };

  const handleSubmit = async () => {
    if (!formData.rc_code.trim() || !formData.description.trim()) return;

    setLocalError('');

    const invalidSection = sections.find((section) => {
      if (section.markedForDelete) return false;
      const hasCode = !!section.rcs_code.trim();
      const hasDescription = !!section.description.trim();
      return hasCode !== hasDescription;
    });

    if (invalidSection) {
      setLocalError('Each section must have both code and description, or leave both empty.');
      return;
    }

    const normalizedSections = sections
      .filter((section) => {
        if (section.markedForDelete) return true;
        return section.rcs_code.trim() && section.description.trim();
      })
      .map((section) => ({
        id: section.id,
        rcs_code: section.rcs_code.trim(),
        description: section.description.trim(),
        is_active: section.is_active,
        markedForDelete: !!section.markedForDelete,
      }));

    await onSubmit({
      rc_code: formData.rc_code.trim(),
      description: formData.description.trim(),
      is_active: formData.is_active,
      sections: normalizedSections,
    });
  };

  const isEditMode = !!editingData;

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={isEditMode ? 'Edit Responsibility Center' : 'Add Responsibility Center'}
      onSubmit={handleSubmit}
      submitLabel={isEditMode ? 'Save Changes' : 'Add Responsibility Center'}
      isLoading={isLoading}
      size="lg"
    >
      <div className="space-y-4">
        {(error || localError) && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            {localError || error}
          </div>
        )}

        <FormInput
          id="rc-code"
          label="Code"
          placeholder="e.g., RC-001"
          value={formData.rc_code}
          onChange={(value) => setFormData({ ...formData, rc_code: value })}
          required
        />

        <FormInput
          id="rc-description"
          label="Description"
          placeholder="e.g., Municipal Treasurer Office"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="rc-status" className="block text-sm font-medium text-foreground">
            Status <span className="text-error ml-1">*</span>
          </label>
          <select
            id="rc-status"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
            value={formData.is_active ? 'active' : 'inactive'}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sections</h3>
              <p className="text-xs text-muted-foreground">
                Add one or more sections under this responsibility center.
              </p>
            </div>
            <button
              type="button"
              onClick={addSectionRow}
              className="px-3 py-2 bg-success text-white rounded-lg text-xs font-medium hover:bg-success/90 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
              No sections added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={section.id || `new-${index}`}
                  className={`rounded-lg border px-3 py-3 space-y-3 ${
                    section.markedForDelete ? 'border-danger/30 bg-danger/5 opacity-70' : 'border-border'
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-end">
                    <FormInput
                      id={`rc-section-code-${index}`}
                      label="Section Code"
                      placeholder="e.g., RCS-001"
                      value={section.rcs_code}
                      onChange={(value) => updateSectionRow(index, { rcs_code: value })}
                    />

                    <FormInput
                      id={`rc-section-description-${index}`}
                      label="Description"
                      placeholder="e.g., Payroll Section"
                      value={section.description}
                      onChange={(value) => updateSectionRow(index, { description: value })}
                    />

                    <button
                      type="button"
                      onClick={() => removeSectionRow(index)}
                      className={`h-10 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 ${
                        section.markedForDelete
                          ? 'bg-warning/15 text-warning hover:bg-warning/20'
                          : 'bg-danger/10 text-danger hover:bg-danger/20'
                      }`}
                      title={section.markedForDelete ? 'Undo remove' : 'Remove section'}
                    >
                      {section.markedForDelete ? (
                        <>
                          <Undo2 className="w-3.5 h-3.5" />
                          Undo
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`rc-section-status-${index}`}
                        className="block text-sm font-medium text-foreground"
                      >
                        Section Status
                      </label>
                      <select
                        id={`rc-section-status-${index}`}
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
                        value={section.is_active ? 'active' : 'inactive'}
                        onChange={(e) =>
                          updateSectionRow(index, { is_active: e.target.value === 'active' })
                        }
                        disabled={section.markedForDelete}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseDialog>
  );
};
