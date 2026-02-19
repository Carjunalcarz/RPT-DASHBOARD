import React from 'react';

interface SignatoriesTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const SignatoriesTab: React.FC<SignatoriesTabProps> = ({
  isEditing,
  onEnterEdit,
  onSave,
  onCancel,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Signatories / Memorandum
      </h3>
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <p className="text-sm">Signatories form content will be displayed here</p>
      </div>
    </div>
  );
};

export default SignatoriesTab;
