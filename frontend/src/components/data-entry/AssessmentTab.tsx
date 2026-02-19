import React from 'react';
import AssessmentTable from './AssessmentTable';

interface AssessmentTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const AssessmentTab: React.FC<AssessmentTabProps> = ({
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
}) => {
  return (
    <div>
      <AssessmentTable />
    </div>
  );
};

export default AssessmentTab;
