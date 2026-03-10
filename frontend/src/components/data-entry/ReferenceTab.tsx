import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReferenceTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

interface ReferenceFormData {
  previousTDN: string;
  previousARP: string;
  previousOwner: string;
  previousAssessedValue: string;
  cancellationReason: string;
  effectivityYear: string;
  remarks: string;
}

const defaultFormData: ReferenceFormData = {
  previousTDN: 'TD-2023-001',
  previousARP: 'ARP-2023-001',
  previousOwner: 'Pedro Santos',
  previousAssessedValue: '450000',
  cancellationReason: '',
  effectivityYear: '2024',
  remarks: '',
};

const ReferenceTab: React.FC<ReferenceTabProps> = ({
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [formData, setFormData] = useState<ReferenceFormData>(defaultFormData);
  const [originalData, setOriginalData] = useState<ReferenceFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && onDataChange) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      onDataChange(hasChanges);
    }
  }, [formData, isEditing, originalData, onDataChange]);

  const handleInputChange = (field: keyof ReferenceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading('Saving reference changes...');
    
    try {
      // Simulate API call delay as requested
      await new Promise(resolve => setTimeout(resolve, 2000));
      setOriginalData(formData);
      onSave();
      toast.success('References saved successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to save references', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    onCancel();
  };

  const renderInput = (
    label: string,
    field: keyof ReferenceFormData,
    type: 'text' | 'number' = 'text',
    placeholder?: string
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        disabled={!isEditing}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed"
        data-testid={`input-${field}`}
      />
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Reference Information
        </h3>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={onEnterEdit}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              data-testid="edit-reference-button"
            >
              <Edit2 size={14} />
              Edit References
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                data-testid="cancel-reference-button"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                data-testid="save-reference-button"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reference Form */}
      <div className="space-y-6">
        {/* Previous Declaration */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Previous Declaration
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('Previous TDN:', 'previousTDN')}
            {renderInput('Previous ARP:', 'previousARP')}
            {renderInput('Previous Owner:', 'previousOwner')}
            {renderInput('Previous Assessed Value:', 'previousAssessedValue', 'number')}
          </div>
        </div>

        {/* Cancellation Details */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Cancellation Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('Cancellation Reason:', 'cancellationReason', 'text', 'Enter reason if applicable')}
            {renderInput('Effectivity Year:', 'effectivityYear')}
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Additional Remarks
          </h4>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            disabled={!isEditing}
            rows={3}
            placeholder="Enter any additional remarks..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-70 disabled:cursor-not-allowed resize-none"
            data-testid="input-remarks"
          />
        </div>
      </div>
    </div>
  );
};

export default ReferenceTab;
