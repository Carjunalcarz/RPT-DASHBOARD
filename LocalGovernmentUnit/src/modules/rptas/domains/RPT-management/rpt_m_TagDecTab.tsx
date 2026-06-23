import React from 'react';
import { Download, Printer } from 'lucide-react';

interface TagDecTabProps {
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

const TagDecTab: React.FC<TagDecTabProps> = ({ 
  isEditing, 
  onEnterEdit, 
  onSave, 
  onCancel,
  onDataChange 
}) => {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-surface">
          Tag Declaration Sheet
        </h3>
        <div className="flex gap-2">
          <button className="px-3 py-2 text-xs bg-background0 hover:bg-muted text-surface rounded-lg transition-colors flex items-center gap-2 font-medium">
            <Printer size={14} />
            Print
          </button>
          <button className="px-3 py-2 text-xs bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors flex items-center gap-2 font-medium">
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-background dark:bg-background rounded-lg p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary/20 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-primary dark:text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-foreground dark:text-surface mb-2">
              Tag Declaration Sheet Preview
            </h4>
            <p className="text-xs text-muted dark:text-muted">
              The tag declaration sheet contains a summary of all property information, assessments,
              and declarations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-left">
            <div className="bg-surface dark:bg-surface rounded p-3">
              <p className="text-xs text-muted dark:text-muted mb-1">Property Owner</p>
              <p className="text-sm font-medium text-foreground dark:text-surface">
                Sample Owner Name
              </p>
            </div>
            <div className="bg-surface dark:bg-surface rounded p-3">
              <p className="text-xs text-muted dark:text-muted mb-1">TDN Number</p>
              <p className="text-sm font-medium text-foreground dark:text-surface">
                TD-2024-001
              </p>
            </div>
            <div className="bg-surface dark:bg-surface rounded p-3">
              <p className="text-xs text-muted dark:text-muted mb-1">Location</p>
              <p className="text-sm font-medium text-foreground dark:text-surface">
                Tubay, Agusan del Norte
              </p>
            </div>
            <div className="bg-surface dark:bg-surface rounded p-3">
              <p className="text-xs text-muted dark:text-muted mb-1">Total Assessed Value</p>
              <p className="text-sm font-medium text-foreground dark:text-surface">₱0.00</p>
            </div>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-xs text-muted dark:text-muted">
            Click Print to generate the official Tag Declaration Sheet or Download to save as PDF.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TagDecTab;
