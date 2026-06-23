
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
  printButton?: React.ReactNode;
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
  printButton,
}) => {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border p-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onAdd}
          disabled={isEditing}
          className="px-3 py-2 text-xs bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors flex items-center gap-2 font-medium disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
          data-testid="add-button"
        >
          <Plus size={14} />
          Add
        </button>
        <button
          onClick={onEdit}
          disabled={!hasSelection || isEditing}
          className="px-3 py-2 text-xs bg-background0 hover:bg-muted disabled:bg-slate-300 dark:disabled:bg-slate-700 text-surface rounded-lg transition-colors flex items-center gap-2 font-medium disabled:cursor-not-allowed"
          data-testid="edit-button"
        >
          <Edit2 size={14} />
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={!hasSelection || isEditing}
          className="px-3 py-2 text-xs bg-background0 hover:bg-muted disabled:bg-slate-300 dark:disabled:bg-slate-700 text-surface rounded-lg transition-colors flex items-center gap-2 font-medium disabled:cursor-not-allowed"
          data-testid="delete-button"
        >
          <Trash2 size={14} />
          Delete
        </button>
        <button
          onClick={onSave}
          disabled={!isEditing}
          className="px-3 py-2 text-xs bg-muted hover:bg-muted dark:bg-muted/20 dark:hover:bg-muted/30 text-surface rounded-lg transition-colors flex items-center gap-2 font-medium disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
          data-testid="save-button"
        >
          <Save size={14} />
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={!isEditing}
          className="px-3 py-2 text-xs bg-background0 hover:bg-muted dark:bg-muted/20 dark:hover:bg-muted/30 text-surface rounded-lg transition-colors flex items-center gap-2 font-medium disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
          data-testid="cancel-button"
        >
          <X size={14} />
          Cancel
        </button>
        <button
          onClick={onRefresh}
          className="px-3 py-2 text-xs bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors flex items-center gap-2 font-medium"
          data-testid="refresh-button"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        {printButton ? (
          printButton
        ) : (
          <button
            onClick={onPrint}
            className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-accent/100 dark:hover:bg-purple-600 text-surface rounded-lg transition-colors flex items-center gap-2 font-medium"
            data-testid="print-button"
          >
            <Printer size={14} />
            Print
          </button>
        )}
      </div>
    </div>
  );
};

export default TableToolbar;
