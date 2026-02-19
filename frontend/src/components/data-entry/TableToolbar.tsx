import React from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer } from 'lucide-react';

interface TableToolbarProps {
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  onPrint: () => void;
  isEditing: boolean;
  hasSelection: boolean;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  onRefresh,
  onPrint,
  isEditing,
  hasSelection,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onAdd}
          disabled={isEditing}
          className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
          data-testid="add-button"
        >
          <Plus size={14} />
          Add
        </button>
        <button
          onClick={onEdit}
          disabled={!hasSelection || isEditing}
          className="px-3 py-2 text-xs bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:cursor-not-allowed"
          data-testid="edit-button"
        >
          <Edit2 size={14} />
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={!hasSelection || isEditing}
          className="px-3 py-2 text-xs bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:cursor-not-allowed"
          data-testid="delete-button"
        >
          <Trash2 size={14} />
          Delete
        </button>
        <button
          onClick={onSave}
          disabled={!isEditing}
          className="px-3 py-2 text-xs bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
          data-testid="save-button"
        >
          <Save size={14} />
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={!isEditing}
          className="px-3 py-2 text-xs bg-slate-500 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
          data-testid="cancel-button"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={onRefresh}
          className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          data-testid="refresh-button"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <button
          onClick={onPrint}
          className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          data-testid="print-button"
        >
          <Printer size={14} />
          Print
        </button>
      </div>
    </div>
  );
};

export default TableToolbar;
