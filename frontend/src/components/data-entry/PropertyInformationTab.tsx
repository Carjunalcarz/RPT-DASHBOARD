import React from 'react';
import PropertyInformationForm from './PropertyInformationForm';

interface PropertyInformationTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const PropertyInformationTab: React.FC<PropertyInformationTabProps> = ({
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
}) => {
  return (
    <div>
      {!isEditing && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onEnterEdit}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            Edit Property Information
          </button>
        </div>
      )}
      <PropertyInformationForm />
    </div>
  );
};

export default PropertyInformationTab;
