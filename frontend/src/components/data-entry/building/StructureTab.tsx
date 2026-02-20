import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface StructureRecord {
  id: string;
  structureType: string;
  material: string;
  percentage: number;
  value: number;
}

interface StructureTabProps {
  buildingId: string;
  isFormEnabled: boolean;
}

const structureTypeOptions = [
  { value: '', label: 'Select Structure Type' },
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'COLUMNS', label: 'Columns' },
  { value: 'BEAMS', label: 'Beams' },
  { value: 'TRUSS_FRAMING', label: 'Truss Framing' },
  { value: 'ROOF', label: 'Roof' },
  { value: 'EXTERIOR_WALLS', label: 'Exterior Walls' },
  { value: 'FLOORING', label: 'Flooring' },
  { value: 'FLOOR_JOISTS', label: 'Floor Joists' },
  { value: 'DOORS', label: 'Doors' },
  { value: 'CEILING', label: 'Ceiling' },
  { value: 'WINDOWS', label: 'Windows' },
  { value: 'STAIRS', label: 'Stairs' },
  { value: 'PARTITION', label: 'Partition' },
  { value: 'WALL_FINISH', label: 'Wall Finish' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'TOILET_BATH', label: 'Toilet/Bath' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'FIXTURES', label: 'Fixtures' },
  { value: 'OTHERS', label: 'Others' },
];

const materialOptions = [
  { value: '', label: 'Select Material' },
  { value: 'CONCRETE', label: 'Concrete' },
  { value: 'STEEL', label: 'Steel' },
  { value: 'WOOD', label: 'Wood' },
  { value: 'GI_SHEET', label: 'G.I. Sheet' },
  { value: 'CHB', label: 'CHB (Concrete Hollow Blocks)' },
  { value: 'TILES', label: 'Tiles' },
  { value: 'GLASS', label: 'Glass' },
  { value: 'ALUMINUM', label: 'Aluminum' },
  { value: 'PVC', label: 'PVC' },
  { value: 'HARDIFLEX', label: 'Hardiflex' },
  { value: 'PLYWOOD', label: 'Plywood' },
  { value: 'MIXED', label: 'Mixed Materials' },
];

const StructureTab: React.FC<StructureTabProps> = ({ buildingId, isFormEnabled }) => {
  const [records, setRecords] = useState<StructureRecord[]>([
    { id: '1', structureType: 'FOUNDATION', material: 'CONCRETE', percentage: 100, value: 50000 },
    { id: '2', structureType: 'COLUMNS', material: 'CONCRETE', percentage: 100, value: 35000 },
    { id: '3', structureType: 'ROOF', material: 'GI_SHEET', percentage: 100, value: 25000 },
  ]);

  const [selectedRecord, setSelectedRecord] = useState<StructureRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    structureType: '',
    material: '',
    percentage: '',
    value: '',
  });

  const handleRowSelect = (record: StructureRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({
      structureType: record.structureType,
      material: record.material,
      percentage: record.percentage.toString(),
      value: record.value.toString(),
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({ structureType: '', material: '', percentage: '', value: '' });
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDelete = () => {
    if (!selectedRecord) return;
    if (window.confirm('Delete this structure record?')) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
      setFormData({ structureType: '', material: '', percentage: '', value: '' });
    }
  };

  const handleSave = () => {
    const newRecord: StructureRecord = {
      id: isAdding ? Date.now().toString() : selectedRecord!.id,
      structureType: formData.structureType,
      material: formData.material,
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
        structureType: selectedRecord.structureType,
        material: selectedRecord.material,
        percentage: selectedRecord.percentage.toString(),
        value: selectedRecord.value.toString(),
      });
    } else {
      setFormData({ structureType: '', material: '', percentage: '', value: '' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const isLocalFormEnabled = isEditing || isAdding;

  // Calculate total
  const totalValue = records.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="space-y-4" data-testid="structure-tab">
      {/* Mini Toolbar */}
      <div className="flex gap-1">
        <button
          onClick={handleAdd}
          disabled={isLocalFormEnabled || !isFormEnabled}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="add-structure-btn"
        >
          <Plus size={12} />
          Add
        </button>
        <button
          onClick={handleEdit}
          disabled={!selectedRecord || isLocalFormEnabled || !isFormEnabled}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="edit-structure-btn"
        >
          <Edit2 size={12} />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedRecord || isLocalFormEnabled || !isFormEnabled}
          className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="delete-structure-btn"
        >
          <Trash2 size={12} />
          Delete
        </button>
        {isLocalFormEnabled && (
          <>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1"
              data-testid="save-structure-btn"
            >
              <Save size={12} />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1"
              data-testid="cancel-structure-btn"
            >
              <X size={12} />
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Structure Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
        <table className="w-full text-xs" data-testid="structure-table">
          <thead className="bg-blue-600 dark:bg-blue-700 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Structure Type</th>
              <th className="px-3 py-2 text-left font-medium">Material</th>
              <th className="px-3 py-2 text-right font-medium">Percentage (%)</th>
              <th className="px-3 py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                  No structure records
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50 dark:bg-slate-800/50'
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                  data-testid={`structure-row-${record.id}`}
                >
                  <td className="px-3 py-1.5">
                    {structureTypeOptions.find(o => o.value === record.structureType)?.label || record.structureType}
                  </td>
                  <td className="px-3 py-1.5">
                    {materialOptions.find(o => o.value === record.material)?.label || record.material}
                  </td>
                  <td className="px-3 py-1.5 text-right">{record.percentage}%</td>
                  <td className="px-3 py-1.5 text-right">{formatCurrency(record.value)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 dark:bg-slate-800 font-medium">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-right">Total:</td>
              <td className="px-3 py-2 text-right">{formatCurrency(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Form Section */}
      {isLocalFormEnabled && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700 p-4">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
            {isAdding ? 'Add Structure' : 'Edit Structure'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Structure Type
              </label>
              <select
                value={formData.structureType}
                onChange={(e) => setFormData(prev => ({ ...prev, structureType: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-structure-type"
              >
                {structureTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Material
              </label>
              <select
                value={formData.material}
                onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-material"
              >
                {materialOptions.map(opt => (
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
                className="w-full px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-percentage"
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
                className="w-full px-2 py-1.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="input-value"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructureTab;
