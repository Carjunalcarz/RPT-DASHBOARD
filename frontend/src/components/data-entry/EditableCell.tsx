import React from 'react';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  type?: 'text' | 'number';
  placeholder?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  isEditing,
  type = 'text',
  placeholder = '',
}) => {
  if (!isEditing) {
    return (
      <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
        {value || '-'}
      </div>
    );
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
    />
  );
};

export default EditableCell;
