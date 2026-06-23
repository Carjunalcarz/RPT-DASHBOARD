import React, { useState, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { useAuth } from '@/modules/rptas/context/AuthContext';

interface SignatoriesTabProps {
  isEditing: boolean;
  isTransactionActive?: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

interface SignatoryFormData {
  preparedBy: string;
  preparedByPosition: string;
  preparedByDate: string;
  verifiedBy: string;
  verifiedByPosition: string;
  verifiedByDate: string;
  approvedBy: string;
  approvedByPosition: string;
  approvedByDate: string;
  memorandum: string;
}

const defaultFormData: SignatoryFormData = {
  preparedBy: '',
  preparedByPosition: 'Assessment Clerk',
  preparedByDate: '2024-01-15',
  verifiedBy: 'Jose Reyes',
  verifiedByPosition: 'Municipal Assessor',
  verifiedByDate: '2024-01-16',
  approvedBy: 'Roberto Cruz',
  approvedByPosition: 'Provincial Assessor',
  approvedByDate: '2024-01-20',
  memorandum: '',
};

const SignatoriesTab: React.FC<SignatoriesTabProps> = ({
  isEditing,
  isTransactionActive = false,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<SignatoryFormData>(defaultFormData);
  const [originalData, setOriginalData] = useState<SignatoryFormData>(defaultFormData);
  const isEnabled = isEditing || isTransactionActive;

  useEffect(() => {
    const name = user?.fullName || user?.name;
    if (!name) return;
    setFormData(prev => (prev.preparedBy ? prev : { ...prev, preparedBy: name }));
    setOriginalData(prev => (prev.preparedBy ? prev : { ...prev, preparedBy: name }));
  }, [user?.fullName, user?.name]);

  useEffect(() => {
    if (isEditing && onDataChange) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      onDataChange(hasChanges);
    }
  }, [formData, isEditing, originalData, onDataChange]);

  const handleInputChange = (field: keyof SignatoryFormData, value: string) => {
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
    field: keyof SignatoryFormData,
    type: 'text' | 'date' = 'text'
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
          Signatories / Memorandum
        </h3>
        <div className="flex gap-2">
          {isEnabled && !isEditing ? (
            <button
              onClick={onEnterEdit}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors font-medium flex items-center gap-2"
              data-testid="edit-signatories-button"
            >
              <Edit2 size={14} />
              Edit Signatories
            </button>
          ) : isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-muted/10 dark:bg-background hover:bg-muted/20 dark:hover:bg-muted/20 text-foreground dark:text-foreground rounded-lg transition-colors font-medium flex items-center gap-2"
                data-testid="cancel-signatories-button"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-success hover:bg-success/90 text-surface rounded-lg transition-colors font-medium flex items-center gap-2"
                data-testid="save-signatories-button"
              >
                <Save size={14} />
                Save Changes
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Signatories Grid */}
      <div className="space-y-6">
        {/* Prepared By */}
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
            Prepared By
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Name:', 'preparedBy')}
            {renderInput('Position/Designation:', 'preparedByPosition')}
            {renderInput('Date:', 'preparedByDate', 'date')}
          </div>
        </div>

        {/* Verified By */}
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
            Verified By
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Name:', 'verifiedBy')}
            {renderInput('Position/Designation:', 'verifiedByPosition')}
            {renderInput('Date:', 'verifiedByDate', 'date')}
          </div>
        </div>

        {/* Approved By */}
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
            Approved By
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput('Name:', 'approvedBy')}
            {renderInput('Position/Designation:', 'approvedByPosition')}
            {renderInput('Date:', 'approvedByDate', 'date')}
          </div>
        </div>

        {/* Memorandum */}
        <div className="bg-background dark:bg-background/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-3">
            Memorandum / Notes
          </h4>
          <textarea
            value={formData.memorandum}
            onChange={(e) => handleInputChange('memorandum', e.target.value)}
            disabled={!isEditing}
            rows={4}
            placeholder="Enter any additional notes or memorandum..."
            className="w-full px-3 py-2 text-sm bg-surface dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground dark:text-surface disabled:opacity-70 disabled:cursor-not-allowed resize-none"
            data-testid="input-memorandum"
          />
        </div>
      </div>
    </div>
  );
};

export default SignatoriesTab;
