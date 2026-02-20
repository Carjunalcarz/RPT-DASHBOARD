import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface AdjustmentRecord {
  id: string;
  adjustmentType: string;
  percentage: number;
  value: number;
}

interface AdjustmentTabProps {
  buildingId: string;
  isFormEnabled: boolean;
}

const adjustmentTypeOptions = [
  { value: '', label: 'Select Adjustment Type' },
  { value: 'DEPRECIATION', label: 'Depreciation' },
  { value: 'APPRECIATION', label: 'Appreciation' },
  { value: 'OBSOLESCENCE_PHYSICAL', label: 'Physical Obsolescence' },
  { value: 'OBSOLESCENCE_FUNCTIONAL', label: 'Functional Obsolescence' },
  { value: 'OBSOLESCENCE_ECONOMIC', label: 'Economic Obsolescence' },
  { value: 'DEFERRED_MAINTENANCE', label: 'Deferred Maintenance' },
  { value: 'RENOVATION', label: 'Renovation' },
  { value: 'ADDITION', label: 'Addition' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'OTHER', label: 'Other Adjustment' },
];

const AdjustmentTab: React.FC<AdjustmentTabProps> = ({ buildingId, isFormEnabled }) => {
  const [records, setRecords] = useState<AdjustmentRecord[]>([
    { id: '1', adjustmentType: 'DEPRECIATION', percentage: 20, value: -45535.48 },
  ]);

  const [selectedRecord, setSelectedRecord] = useState<AdjustmentRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    adjustmentType: '',
    percentage: '',
    value: '',
  });

  const handleRowSelect = (record: AdjustmentRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({
      adjustmentType: record.adjustmentType,
      percentage: record.percentage.toString(),
      value: record.value.toString(),
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({ adjustmentType: '', percentage: '', value: '' });
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDelete = () => {
    if (!selectedRecord) return;
    if (window.confirm('Delete this adjustment record?')) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
      setFormData({ adjustmentType: '', percentage: '', value: '' });
    }
  };

  const handleSave = () => {
    const newRecord: AdjustmentRecord = {
      id: isAdding ? Date.now().toString() : selectedRecord!.id,
      adjustmentType: formData.adjustmentType,
      percentage: parseFloat(formData.percentage) || 0,
      value: parseFloat(formData.value) || 0,
    };

    if (isAdding) {
      setRecords(prev => [...prev, newRecord]);
    } else {
      setRecords(prev => prev.map(r => r.id === selectedRecord!.id ? newRecord : r));
    }

    setSelectedRecord(newRecord);
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      setFormData({
        adjustmentType: selectedRecord.adjustmentType,
        percentage: selectedRecord.percentage.toString(),
        value: selectedRecord.value.toString(),
      });
    } else {
      setFormData({ adjustmentType: '', percentage: '', value: '' });
    }
  };

  const formatCurrency = (value: number) => {
    const prefix = value < 0 ? '-' : '';
    return prefix + new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
  };

  const isLocalFormEnabled = isEditing || isAdding;

  // Calculate total adjustment
  const totalAdjustment = records.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="space-y-4" data-testid="adjustment-tab">
      {/* Mini Toolbar */}
      <div className="flex gap-1">
        <button
          onClick={handleAdd}
          disabled={isLocalFormEnabled || !isFormEnabled}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="add-adjustment-btn"
        >
          <Plus size={12} />
          Add
        </button>
        <button
          onClick={handleEdit}
          disabled={!selectedRecord || isLocalFormEnabled || !isFormEnabled}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="edit-adjustment-btn"
        >
          <Edit2 size={12} />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedRecord || isLocalFormEnabled || !isFormEnabled}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="delete-adjustment-btn"
        >
          <Trash2 size={12} />
          Delete
        </button>
        {isLocalFormEnabled && (
          <>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1"
              data-testid="save-adjustment-btn"
            >
              <Save size={12} />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1"
              data-testid="cancel-adjustment-btn"
            >
              <X size={12} />
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Adjustment Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
        <table className="w-full text-xs" data-testid="adjustment-table">
          <thead className="bg-orange-600 dark:bg-orange-700 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Adjustment Type</th>
              <th className="px-3 py-2 text-right font-medium">Percentage (%)</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                  No adjustment records
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'bg-orange-100 dark:bg-orange-900/30'
                      : index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50 dark:bg-slate-800/50'
                  } hover:bg-orange-50 dark:hover:bg-orange-900/20`}
                  data-testid={`adjustment-row-${record.id}`}
                >
                  <td className="px-3 py-1.5">
                    {adjustmentTypeOptions.find(o => o.value === record.adjustmentType)?.label || record.adjustmentType}
                  </td>
                  <td className="px-3 py-1.5 text-right">{record.percentage}%</td>
                  <td className={`px-3 py-1.5 text-right ${record.value < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(record.value)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-800 font-medium">
            <tr>
              <td colSpan={2} className="px-3 py-2 text-right">Total Adjustment:</td>
              <td className={`px-3 py-2 text-right ${totalAdjustment < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {formatCurrency(totalAdjustment)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Form Section */}
      {isLocalFormEnabled && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800 p-4">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
            {isAdding ? 'Add Adjustment' : 'Edit Adjustment'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Adjustment Type
              </label>
              <select
                value={formData.adjustmentType}
                onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-testid="input-adjustment-type"
              >
                {adjustmentTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Percentage (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, percentage: e.target.value }))}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-testid="input-adjustment-percentage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Value
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                data-testid="input-adjustment-value"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Note: Use negative values for depreciation/deductions and positive values for appreciation/additions.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdjustmentTab;
