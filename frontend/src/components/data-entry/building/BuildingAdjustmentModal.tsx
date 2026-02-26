import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { BldgAdjRecord, createBldgAdj, updateBldgAdj, deleteBldgAdj } from '@/services/bldgAdjService';
import { BldgStrucRecord } from '@/services/bldgStrucService';

interface BuildingAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  isFormEnabled: boolean;
  initialAdjustments?: BldgAdjRecord[];
  structures?: BldgStrucRecord[];
  onUpdate?: (adjustments: BldgAdjRecord[]) => void;
}

const BuildingAdjustmentModal: React.FC<BuildingAdjustmentModalProps> = ({ 
  open, 
  onOpenChange, 
  buildingId, 
  isFormEnabled, 
  initialAdjustments = [], 
  structures = [],
  onUpdate
}) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [records, setRecords] = useState<BldgAdjRecord[]>(initialAdjustments);

  useEffect(() => {
    setRecords(initialAdjustments);
  }, [initialAdjustments]);

  useEffect(() => {
    onUpdate?.(records);
  }, [records, onUpdate]);

  const [selectedRecord, setSelectedRecord] = useState<BldgAdjRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    bldgCode: '',
    adjustmentType: '',
    mainComponent: '',
    subComponent: '',
    percentage: '',
    value: '',
    area: '',
    unitCost: '',
    depreciationRate: '',
    valueAdjustment: '',
  });

  const handleRowSelect = (record: BldgAdjRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({
      bldgCode: record.BldgCode || '',
      adjustmentType: record.DescNote || '', 
      mainComponent: record.MainComp || '',
      subComponent: record.CompExtn || '',
      percentage: (record.Dep_Rate || 0).toString(),
      value: (record.Acc_Dep || record.Market_Val || 0).toString(),
      area: (record.Area || 0).toString(),
      unitCost: (record.UnitCost || 0).toString(),
      depreciationRate: (record.Dep_Rate || 0).toString(),
      valueAdjustment: (record.Acc_Dep || 0).toString(),
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({ 
      bldgCode: structures.length > 0 ? structures[0].BldgCode : '',
      adjustmentType: '', 
      mainComponent: '', 
      subComponent: '', 
      percentage: '', 
      value: '', 
      area: '', 
      unitCost: '', 
      depreciationRate: '', 
      valueAdjustment: '' 
    });
  };

  const handleEdit = () => {
    if (!selectedRecord) {
      return;
    }
    setIsEditing(true);
    setIsAdding(false);
    handleRowSelect(selectedRecord);
  };

  const handleDelete = async () => {
    if (!selectedRecord) {
      return;
    }
    if (window.confirm('Delete this adjustment record?')) {
      try {
        const success = await deleteBldgAdj(buildingId, selectedRecord.SeqNo);
        if (success) {
          setRecords(prev => prev.filter(r => r.SeqNo !== selectedRecord.SeqNo));
          setSelectedRecord(null);
          setFormData({ 
            bldgCode: structures.length > 0 ? structures[0].BldgCode : '',
            adjustmentType: '', 
            mainComponent: '', 
            subComponent: '', 
            percentage: '', 
            value: '', 
            area: '', 
            unitCost: '', 
            depreciationRate: '', 
            valueAdjustment: '' 
          });
        }
      } catch (error) {
        console.error('Error deleting adjustment:', error);
      }
    }
  };

  const handleSave = async () => {
    try {
      const recordData: Partial<BldgAdjRecord> = {
        ...selectedRecord,
        TDN: buildingId,
        BldgCode: formData.bldgCode,
        DescNote: formData.adjustmentType,
        MainComp: formData.mainComponent,
        CompExtn: formData.subComponent,
        Dep_Rate: parseFloat(formData.depreciationRate) || 0,
        Acc_Dep: parseFloat(formData.valueAdjustment) || 0,
        Market_Val: parseFloat(formData.value) || 0,
        Area: parseFloat(formData.area) || 0,
        UnitCost: parseFloat(formData.unitCost) || 0,
        SeqNo: isAdding ? (Date.now().toString()) : selectedRecord?.SeqNo, 
      };

      if (isAdding) {
        const newRecord = await createBldgAdj(recordData);
        if (newRecord) {
          setRecords(prev => [...prev, newRecord]);
          setSelectedRecord(newRecord);
          setIsEditing(false);
          setIsAdding(false);
        }
      } else {
        if (!selectedRecord?.SeqNo) return;
        const updatedRecord = await updateBldgAdj(buildingId, selectedRecord.SeqNo, recordData);
        if (updatedRecord) {
          setRecords(prev => prev.map(r => r.SeqNo === selectedRecord.SeqNo ? updatedRecord : r));
          setSelectedRecord(updatedRecord);
          setIsEditing(false);
          setIsAdding(false);
        }
      }
    } catch (error) {
      console.error('Error saving adjustment:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      handleRowSelect(selectedRecord);
    } else {
      setFormData({
        bldgCode: structures.length > 0 ? structures[0].BldgCode : '',
        adjustmentType: '',
        mainComponent: '',
        subComponent: '',
        percentage: '',
        value: '',
        area: '',
        unitCost: '',
        depreciationRate: '',
        valueAdjustment: '',
      });
    }
  };

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined) return '0.00';
    const prefix = value < 0 ? '-' : '';
    return prefix + new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
  };

  const isLocalFormEnabled = isEditing || isAdding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Building Adjustments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mini Toolbar */}
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              disabled={isLocalFormEnabled || !isFormEnabled}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={handleEdit}
              disabled={!selectedRecord || isLocalFormEnabled || !isFormEnabled}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 size={12} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={!selectedRecord || isLocalFormEnabled || !isFormEnabled}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              Delete
            </button>
            {isLocalFormEnabled && (
              <>
                <button
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1"
                >
                  <Save size={12} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2 py-1 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1"
                >
                  <X size={12} />
                  Cancel
                </button>
              </>
            )}
          </div>

          {/* Adjustment Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded h-40">
            <table className="w-full text-xs">
              <thead className="bg-orange-600 dark:bg-orange-700 text-white sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Main Component</th>
                  <th className="px-3 py-2 text-left font-medium">Main Component Description</th>
                  <th className="px-3 py-2 text-left font-medium">Sub Component</th>
                  <th className="px-3 py-2 text-left font-medium">Sub Component Description</th>
                  <th className="px-3 py-2 text-right font-medium">Area</th>
                  <th className="px-3 py-2 text-right font-medium">Market Value</th>
                  <th className="px-3 py-2 text-right font-medium">Depreciation Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Value Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                      No adjustment records found for this building.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr
                      key={record.SeqNo || index}
                      onClick={() => handleRowSelect(record)}
                      className={`cursor-pointer transition-colors ${
                        selectedRecord?.SeqNo === record.SeqNo
                          ? 'bg-orange-100 dark:bg-orange-900/30'
                          : index % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-slate-50 dark:bg-slate-800/50'
                      } hover:bg-orange-50 dark:hover:bg-orange-900/20`}
                    >
                      <td className="px-3 py-1.5">{record.MainComp || '-'}</td>
                      <td className="px-3 py-1.5">{record.DescNote || '-'}</td>
                      <td className="px-3 py-1.5">{record.CompExtn || '-'}</td>
                      <td className="px-3 py-1.5">{record.DescNote || '-'}</td>
                      <td className="px-3 py-1.5 text-right">{record.Area || 0}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(record.Market_Val || 0)}</td>
                      <td className="px-3 py-1.5 text-right">{record.Dep_Rate}%</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(record.Acc_Dep || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Form Section */}
          <div className={`bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-3 ${!isLocalFormEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {/* Left Column */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Bldg. Code :</label>
                  <select
                    value={formData.bldgCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, bldgCode: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  >
                    <option value="">Select Structure</option>
                    {structures.map((s, idx) => (
                      <option key={s.BldgCode || idx} value={s.BldgCode}>{s.BldgCode} - {s.Struc_type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Main Component :</label>
                  <div className="flex-1 flex gap-1">
                    <input 
                      type="text" 
                      value={formData.mainComponent}
                      onChange={(e) => setFormData(prev => ({ ...prev, mainComponent: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="w-16 px-2 py-1 text-xs border rounded"
                    />
                    <input 
                      type="text" 
                      value={formData.adjustmentType} // Assuming this maps to desc
                      onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border rounded bg-slate-50"
                      placeholder="Description"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Sub Component :</label>
                  <div className="flex-1 flex gap-1">
                    <input 
                      type="text" 
                      value={formData.subComponent}
                      onChange={(e) => setFormData(prev => ({ ...prev, subComponent: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="w-16 px-2 py-1 text-xs border rounded"
                    />
                    <input 
                      type="text" 
                      value={formData.adjustmentType} // Reusing desc for now or add separate state
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border rounded bg-slate-50"
                      placeholder="Description"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Description :</label>
                  <input 
                    type="text" 
                    value={formData.adjustmentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Area :</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      type="number" 
                      value={formData.area}
                      onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="w-24 px-2 py-1 text-xs border rounded text-right"
                    />
                    <label className="text-xs flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" className="w-3 h-3" disabled={!isLocalFormEnabled} />
                      Additional Area :
                    </label>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Unit Cost :</label>
                  <input 
                    type="number" 
                    value={formData.unitCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="w-24 px-2 py-1 text-xs border rounded text-right"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">% of Base Value :</label>
                  <input 
                    type="number" 
                    defaultValue="100.00"
                    disabled={!isLocalFormEnabled}
                    className="w-24 px-2 py-1 text-xs border rounded text-right"
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">% of Unit Cost :</label>
                  <input 
                    type="number" 
                    value={formData.unitCost} // Simplified
                    disabled={!isLocalFormEnabled}
                    className="w-24 px-2 py-1 text-xs border rounded text-right bg-slate-50"
                    readOnly
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Market Value :</label>
                  <input 
                    type="number" 
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="w-24 px-2 py-1 text-xs border rounded text-right"
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Depreciation Rate :</label>
                  <input 
                    type="number" 
                    value={formData.depreciationRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, depreciationRate: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="w-24 px-2 py-1 text-xs border rounded text-right"
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Value Adjustment :</label>
                  <input 
                    type="number" 
                    value={formData.valueAdjustment}
                    onChange={(e) => setFormData(prev => ({ ...prev, valueAdjustment: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="w-24 px-2 py-1 text-xs border rounded text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingAdjustmentModal;
