import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmLeaveModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmLeaveModal: React.FC<ConfirmLeaveModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center pt-6">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Unsaved Changes
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You have unsaved changes. If you leave now, your changes will be lost. Are you sure you
            want to continue?
          </p>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium"
            >
              Stay on Page
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              Leave Without Saving
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmLeaveModal;
