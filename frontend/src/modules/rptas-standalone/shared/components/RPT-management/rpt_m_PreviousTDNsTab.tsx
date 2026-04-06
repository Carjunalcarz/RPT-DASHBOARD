import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Edit2, Save, X } from 'lucide-react';

interface TDN {
  id: string;
  tdnNumber: string;
  year: string;
  assessedValue: string;
}

interface PreviousTDNsTabProps {
  isEditing: boolean;
  isTransactionActive?: boolean;
  onEnterEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDataChange?: (hasChanges: boolean) => void;
}

const PreviousTDNsTab: React.FC<PreviousTDNsTabProps> = ({
  isEditing,
  isTransactionActive = false,
  onEnterEdit,
  onSave,
  onCancel,
  onDataChange,
}) => {
  const [tdns, setTdns] = useState<TDN[]>([
    { id: '1', tdnNumber: 'TDN-2023-001', year: '2023', assessedValue: '250000' },
    { id: '2', tdnNumber: 'TDN-2022-001', year: '2022', assessedValue: '230000' },
  ]);

  const [originalTdns, setOriginalTdns] = useState(tdns);
  const isEnabled = isEditing || isTransactionActive;

  useEffect(() => {
    if (isEditing && onDataChange) {
      const hasChanges = JSON.stringify(tdns) !== JSON.stringify(originalTdns);
      onDataChange(hasChanges);
    }
  }, [tdns, isEditing, originalTdns, onDataChange]);

  const handleAddTDN = () => {
    const newTDN: TDN = {
      id: Date.now().toString(),
      tdnNumber: '',
      year: new Date().getFullYear().toString(),
      assessedValue: '',
    };
    setTdns([newTDN, ...tdns]);
  };

  const handleRemoveTDN = (id: string) => {
    setTdns(tdns.filter((tdn) => tdn.id !== id));
  };

  const handleUpdateTDN = (id: string, field: keyof TDN, value: string) => {
    setTdns(tdns.map((tdn) => (tdn.id === id ? { ...tdn, [field]: value } : tdn)));
  };

  const handleSave = () => {
    setOriginalTdns(tdns);
    onSave();
  };

  const handleCancel = () => {
    setTdns(originalTdns);
    onCancel();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Previous Tax Declaration Numbers
        </h3>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={handleAddTDN}
              className="px-3 py-2 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <Plus size={14} />
              Add TDN
            </button>
          )}
          {isEnabled && !isEditing ? (
            <button
              onClick={onEnterEdit}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              data-testid="edit-previous-tdns-button"
            >
              <Edit2 size={14} />
              Edit TDNs
            </button>
          ) : isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors font-medium flex items-center gap-2"
                data-testid="cancel-previous-tdns-button"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                data-testid="save-previous-tdns-button"
              >
                <Save size={14} />
                Save Changes
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                TDN Number
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                Year
              </th>
              <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">
                Assessed Value
              </th>
              {isEditing && (
                <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-400 w-20">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {tdns.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditing ? 4 : 3}
                  className="px-3 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No previous TDNs recorded
                </td>
              </tr>
            ) : (
              tdns.map((tdn) => (
                <tr key={tdn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={tdn.tdnNumber}
                        onChange={(e) => handleUpdateTDN(tdn.id, 'tdnNumber', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">{tdn.tdnNumber}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={tdn.year}
                        onChange={(e) => handleUpdateTDN(tdn.id, 'year', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">{tdn.year}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        value={tdn.assessedValue}
                        onChange={(e) => handleUpdateTDN(tdn.id, 'assessedValue', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-slate-900 dark:text-slate-100">
                        ₱{parseFloat(tdn.assessedValue || '0').toLocaleString()}
                      </span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemoveTDN(tdn.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreviousTDNsTab;
