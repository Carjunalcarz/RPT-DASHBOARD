import React, { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';

interface ReferenceTabProps {
  isEditing: boolean;
  isTransactionActive?: boolean;
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
  isTransactionActive = false,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [formData, setFormData] = useState<ReferenceFormData>(defaultFormData);
  const [originalData, setOriginalData] = useState<ReferenceFormData>(defaultFormData);
  const isEnabled = isEditing || isTransactionActive;

  useEffect(() => {
    if (isEditing && onDataChange) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      onDataChange(hasChanges);
    }
  }, [formData, isEditing, originalData, onDataChange]);

  const handleInputChange = (field: keyof ReferenceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setOriginalData(formData);
    onSave();
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
      <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => handleInputChange(field, e.target.value)}
        disabled={!isEditing}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground dark:text-surface disabled:opacity-70 disabled:cursor-not-allowed"
        data-testid={`input-${field}`}
      />
    </div>
  );

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border p-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-surface">
          Reference Information
        </h3>
        <div className="flex gap-2">
          {isEnabled && !isEditing ? (
            <button
              onClick={onEnterEdit}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors font-medium flex items-center gap-2"
              data-testid="edit-reference-button"
            >
              <Edit2 size={14} />
              Edit References
            </button>
          ) : isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-muted/10 dark:bg-background hover:bg-muted/20 dark:hover:bg-muted/20 text-foreground dark:text-foreground rounded-lg transition-colors font-medium flex items-center gap-2"
                data-testid="cancel-reference-button"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-success hover:bg-success/90 text-surface rounded-lg transition-colors font-medium flex items-center gap-2"
                data-testid="save-reference-button"
              >
                <Save size={14} />
                Save Changes
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Reference Form */}
      <div className="space-y-6">
        {/* Previous Declaration */}
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
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
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
            Cancellation Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput('Cancellation Reason:', 'cancellationReason', 'text', 'Enter reason if applicable')}
            {renderInput('Effectivity Year:', 'effectivityYear')}
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
            Additional Remarks
          </h4>
          <textarea
            value={formData.remarks}
            onChange={(e) => handleInputChange('remarks', e.target.value)}
            disabled={!isEditing}
            rows={3}
            placeholder="Enter any additional remarks..."
            className="w-full px-3 py-2 text-sm bg-surface dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground dark:text-surface disabled:opacity-70 disabled:cursor-not-allowed resize-none"
            data-testid="input-remarks"
          />
        </div>
      </div>
    </div>
  );
};

export default ReferenceTab;
