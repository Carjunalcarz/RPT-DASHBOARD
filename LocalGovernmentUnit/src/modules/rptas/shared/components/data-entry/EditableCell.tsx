import React from 'react';

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  type?: 'text' | 'number';
  placeholder?: string;
  onDoubleClick?: () => void;
  hasModal?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onChange,
  isEditing,
  type = 'text',
  placeholder = '',
  onDoubleClick,
  hasModal = false,
}) => {
  if (!isEditing) {
    return (
      <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
        {value || '-'}
      </div>
    );
  }

  return (
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onDoubleClick={hasModal ? onDoubleClick : undefined}
        placeholder={placeholder}
        title={hasModal ? 'Double-click to select from list' : ''}
        className={`w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100 ${
          hasModal ? 'cursor-pointer' : ''
        }`}
      />
      {hasModal && isEditing && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-1 rounded">
            ⌄
          </span>
        </div>
      )}
    </div>
  );
};

export default EditableCell;
