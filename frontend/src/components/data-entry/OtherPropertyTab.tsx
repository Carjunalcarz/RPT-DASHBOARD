import React, { useState, useEffect } from 'react';

interface OtherPropertyTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange: (hasChanges: boolean) => void;
}

const OtherPropertyTab: React.FC<OtherPropertyTabProps> = ({
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [formData, setFormData] = useState({
    plantsTrees: '',
    improvements: '',
    additionalInfo: '',
    remarks: '',
  });

  const [originalData, setOriginalData] = useState(formData);

  useEffect(() => {
    if (isEditing) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);
      onDataChange(hasChanges);
    }
  }, [formData, isEditing, originalData, onDataChange]);

  const handleSave = () => {
    setOriginalData(formData);
    onSave();
  };

  const handleCancel = () => {
    setFormData(originalData);
    onCancel();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Other Property Information
        </h3>
        {!isEditing && (
          <button
            onClick={onEnterEdit}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            data-testid="edit-other-property-button"
          >
            Edit Information
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Plants and Trees:
          </label>
          <textarea
            value={formData.plantsTrees}
            onChange={(e) => setFormData({ ...formData, plantsTrees: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Enter details about plants and trees..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Other Improvements:
          </label>
          <textarea
            value={formData.improvements}
            onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Enter other improvements..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Additional Information:
          </label>
          <textarea
            value={formData.additionalInfo}
            onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Enter additional information..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Remarks:
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Enter remarks..."
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
            data-testid="cancel-other-property-button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            data-testid="save-other-property-button"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default OtherPropertyTab;
