import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Calculator } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { RptMachRecord, getMachineryByTdn } from '@/modules/rptas/shared/services/rptMachService';

interface MachineryItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tdn: string;
  onUpdate?: () => void;
}

const defaultFormData: Partial<RptMachRecord> = {
  Code: '',
  MachineDesc: '',
  Capacity: '',
  SERIALNO: '',
  Brand_Model: '',
  Condition: '',
  PurchaseType: 'Locally Purchased',
  Acq_cost: 0,
  Rep_cost: 0,
  D_acquired: '',
  D_installed: '',
  D_operated: '',
  NoYrs: 0,
  Est_life: 0,
  Rem_life: 0,
  Orig_Cost: 0,
  Freight: 0,
  Insurance: 0,
  Installation: 0,
  Others: 0,
  Depreciation: 0,
  Dep_market: 0,
  Disposal_Mvalue: 0,
  Salvage: 0,
  Adj_Mvalue: 0,
  StraightDep: 0,
  IncludeUnitCnt: '0',
  No_units: 0,
};

const purchaseTypeOptions = [
  'Locally Purchased',
  'Imported',
  'Others',
];

const equipmentOptions = [
  { value: '0060', label: '0060 - Machinery' },
  // Add more options as needed
];

const MachineryItemsModal: React.FC<MachineryItemsModalProps> = ({
  open,
  onOpenChange,
  tdn,
  onUpdate,
}) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  const [records, setRecords] = useState<RptMachRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RptMachRecord | null>(null);
  const [formData, setFormData] = useState<Partial<RptMachRecord>>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && tdn) {
      fetchRecords();
    }
  }, [open, tdn]);

  const fetchRecords = async () => {
    setLoading(true);
    const data = await getMachineryByTdn(tdn);
    setRecords(data || []);
    setLoading(false);
    if (data && data.length > 0) {
        handleRowSelect(data[0]);
    } else {
        setSelectedRecord(null);
        setFormData(defaultFormData);
    }
  };

  const handleRowSelect = (record: RptMachRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({ 
        ...record,
        // Map API fields to UI if needed, but the structure matches mostly
        D_acquired: record.D_acquired, 
        D_installed: record.D_installed,
        D_operated: record.D_operated
    });
  };

  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({ ...defaultFormData, Tdn: tdn });
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const isConfirmed = await showConfirm({
      title: 'Delete Machinery Record',
      message: 'Delete this machinery record?',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
      // TODO: Call delete API
      console.log('Deleting', selectedRecord);
      setRecords(prev => prev.filter(r => r !== selectedRecord));
      setSelectedRecord(null);
      setFormData(defaultFormData);
    }
  };

  const handleSave = () => {
    // TODO: Call save API
    console.log('Saving', formData);
    if (isAdding) {
        const newRecord = { ...formData } as RptMachRecord;
        setRecords(prev => [...prev, newRecord]);
        setSelectedRecord(newRecord);
    } else {
        setRecords(prev => prev.map(r => r === selectedRecord ? { ...formData } as RptMachRecord : r));
        setSelectedRecord(formData as RptMachRecord);
    }
    setIsEditing(false);
    setIsAdding(false);
    onUpdate?.();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      setFormData({ ...selectedRecord });
    } else {
      setFormData(defaultFormData);
    }
  };

  const handleCompute = () => {
    console.log('Computing values...');
    const origCost = formData.Orig_Cost || 0;
    const depRate = formData.Depreciation || 0;
    const freight = formData.Freight || 0;
    const insurance = formData.Insurance || 0;
    const installation = formData.Installation || 0;
    const others = formData.Others || 0;

    // Total Acquisition Cost = Original Cost + Freight + Insurance + Installation + Others
    const acqCost = origCost + freight + insurance + installation + others;

    // Depreciation Value = Total Acquisition Cost * (Depreciation Rate / 100)
    const depValue = acqCost * (depRate / 100);

    // Market Value = Total Acquisition Cost - Depreciation Value
    const marketValue = acqCost - depValue;

    setFormData(prev => ({
        ...prev,
        Acq_cost: acqCost,
        Dep_market: depValue,
        Market_val: marketValue,
        Adj_Mvalue: marketValue // Default Adj Market Value to Market Value
    }));
  };

  const formatCurrency = (val?: number) => 
    new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString();
  }

  const isLocalFormEnabled = isEditing || isAdding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Machinery Assessment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
            <button onClick={handleAdd} disabled={isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1 disabled:opacity-50">
              <Plus size={14} /> Add
            </button>
            <button onClick={handleEdit} disabled={!selectedRecord || isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1 disabled:opacity-50">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={handleDelete} disabled={!selectedRecord || isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 border rounded shadow-sm flex items-center gap-1 text-red-600 disabled:opacity-50">
              <Trash2 size={14} /> Delete
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
            <button onClick={handleSave} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-primary text-white dark:text-white hover:bg-primary-light rounded shadow-sm flex items-center gap-1 disabled:opacity-50">
              <Save size={14} /> Save
            </button>
            <button onClick={handleCancel} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1 disabled:opacity-50">
              <X size={14} /> Cancel
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
            <button onClick={fetchRecords} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleCompute} disabled={!isLocalFormEnabled} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1 disabled:opacity-50">
              <Calculator size={14} /> Compute
            </button>
            <button onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 border rounded shadow-sm flex items-center gap-1 ml-auto">
              Close
            </button>
          </div>

          {/* Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded h-48 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Equipment</th>
                  <th className="px-2 py-1.5 text-left font-medium">Brand / Model</th>
                  <th className="px-2 py-1.5 text-right font-medium">Number Of Units</th>
                  <th className="px-2 py-1.5 text-left font-medium">Capacity</th>
                  <th className="px-2 py-1.5 text-center font-medium">Date Acquired</th>
                  <th className="px-2 py-1.5 text-center font-medium">Date Installed</th>
                  <th className="px-2 py-1.5 text-center font-medium">Date Operated</th>
                  <th className="px-2 py-1.5 text-right font-medium">Estimated Life</th>
                  <th className="px-2 py-1.5 text-right font-medium">Acquisition Cost</th>
                  <th className="px-2 py-1.5 text-right font-medium">Market Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {records.length === 0 ? (
                    <tr><td colSpan={10} className="px-2 py-4 text-center text-slate-500">No machinery records found.</td></tr>
                ) : (
                    records.map((r, i) => (
                        <tr key={i} onClick={() => handleRowSelect(r)} className={`cursor-pointer hover:bg-primary/5 dark:hover:bg-slate-800 ${selectedRecord === r ? 'bg-primary/10 dark:bg-primary/10' : ''}`}>
                            <td className="px-2 py-1.5">{r.MachineDesc}</td>
                            <td className="px-2 py-1.5">{r.Brand_Model}</td>
                            <td className="px-2 py-1.5 text-right">{r.No_units}</td>
                            <td className="px-2 py-1.5">{r.Capacity}</td>
                            <td className="px-2 py-1.5 text-center">{formatDate(r.D_acquired)}</td>
                            <td className="px-2 py-1.5 text-center">{formatDate(r.D_installed)}</td>
                            <td className="px-2 py-1.5 text-center">{formatDate(r.D_operated)}</td>
                            <td className="px-2 py-1.5 text-right">{r.Est_life}</td>
                            <td className="px-2 py-1.5 text-right">{formatCurrency(r.Acq_cost)}</td>
                            <td className="px-2 py-1.5 text-right">{formatCurrency(r.Market_val)}</td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Form */}
          <div className={`bg-slate-100 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700 ${!isLocalFormEnabled ? 'opacity-90 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                
                {/* Column 1 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Equipment :</label>
                        <select 
                            value={formData.Code} 
                            onChange={e => setFormData({...formData, Code: e.target.value})}
                            className="w-20 px-2 py-1 border rounded"
                        >
                            <option value="">Select</option>
                            {equipmentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                        </select>
                        <input 
                            type="text" 
                            value={formData.MachineDesc} 
                            onChange={e => setFormData({...formData, MachineDesc: e.target.value})}
                            placeholder="Machine Description"
                            className="flex-1 px-2 py-1 border rounded"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Serial No. :</label>
                        <input type="text" value={formData.SERIALNO} onChange={e => setFormData({...formData, SERIALNO: e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Purchase Type :</label>
                        <select value={formData.PurchaseType} onChange={e => setFormData({...formData, PurchaseType: e.target.value})} className="flex-1 px-2 py-1 border rounded">
                            {purchaseTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Date Acquired :</label>
                        <input type="date" value={formData.D_acquired ? formData.D_acquired.split('T')[0] : ''} onChange={e => setFormData({...formData, D_acquired: e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Date Installed :</label>
                        <input type="date" value={formData.D_installed ? formData.D_installed.split('T')[0] : ''} onChange={e => setFormData({...formData, D_installed: e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Date Operated :</label>
                        <input type="date" value={formData.D_operated ? formData.D_operated.split('T')[0] : ''} onChange={e => setFormData({...formData, D_operated: e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">No. of Yrs Used :</label>
                        <input type="number" value={formData.NoYrs} onChange={e => setFormData({...formData, NoYrs: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Estimated Life :</label>
                        <input type="number" value={formData.Est_life} onChange={e => setFormData({...formData, Est_life: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">Remaining Life :</label>
                        <input type="number" value={formData.Rem_life} onChange={e => setFormData({...formData, Rem_life: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-24 text-right font-medium">No. of Units :</label>
                        <input type="number" value={formData.No_units} onChange={e => setFormData({...formData, No_units: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Capacity :</label>
                        <div className="flex-1 flex gap-1">
                            <input type="text" value={formData.Capacity} onChange={e => setFormData({...formData, Capacity: e.target.value})} className="flex-1 px-2 py-1 border rounded text-right" />
                            <select className="w-16 px-1 py-1 border rounded text-xs">
                                <option>HP</option>
                                <option>kW</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Brand/Model :</label>
                        <input type="text" value={formData.Brand_Model} onChange={e => setFormData({...formData, Brand_Model: e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Dollar Rate/Index :</label>
                        <input type="number" className="flex-1 px-2 py-1 border rounded text-right" placeholder="0.0000" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Dollar Rate/Index (App) :</label>
                        <input type="number" className="flex-1 px-2 py-1 border rounded text-right" placeholder="0.0000" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Conv. Factor :</label>
                        <input type="number" value={formData.Conv_Factor} onChange={e => setFormData({...formData, Conv_Factor: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Original Cost :</label>
                        <input type="number" value={formData.Orig_Cost} onChange={e => setFormData({...formData, Orig_Cost: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Freight :</label>
                        <input type="number" value={formData.Freight} onChange={e => setFormData({...formData, Freight: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Insurance :</label>
                        <input type="number" value={formData.Insurance} onChange={e => setFormData({...formData, Insurance: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Installation :</label>
                        <input type="number" value={formData.Installation} onChange={e => setFormData({...formData, Installation: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Others :</label>
                        <input type="number" value={formData.Others} onChange={e => setFormData({...formData, Others: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" checked={formData.IncludeUnitCnt === '1'} onChange={e => setFormData({...formData, IncludeUnitCnt: e.target.checked ? '1' : '0'})} className="ml-32" />
                        <label className="ml-2">Include on computation</label>
                    </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Condition :</label>
                        <input type="text" value={formData.Condition} onChange={e => setFormData({...formData, Condition: e.target.value})} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Total Acquisition Cost :</label>
                        <input type="number" value={formData.Acq_cost} onChange={e => setFormData({...formData, Acq_cost: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right font-bold" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Replacement Cost New :</label>
                        <input type="number" value={formData.Rep_cost} onChange={e => setFormData({...formData, Rep_cost: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Depreciation Rate :</label>
                        <input type="number" value={formData.Depreciation} onChange={e => setFormData({...formData, Depreciation: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Depreciation Value :</label>
                        <input type="number" value={formData.Dep_market} onChange={e => setFormData({...formData, Dep_market: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Disposal Value :</label>
                        <input type="number" value={formData.Disposal_Mvalue} onChange={e => setFormData({...formData, Disposal_Mvalue: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="w-32 text-right font-medium">Salvage Value :</label>
                        <input type="number" value={formData.Salvage} onChange={e => setFormData({...formData, Salvage: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right" />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <input type="checkbox" checked={formData.StraightDep === 1} onChange={e => setFormData({...formData, StraightDep: e.target.checked ? 1 : 0})} className="ml-32" />
                        <label className="ml-2">Use Straight Line Depreciation</label>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <label className="w-32 text-right font-bold">Adj. Market Value :</label>
                        <input type="number" value={formData.Adj_Mvalue} onChange={e => setFormData({...formData, Adj_Mvalue: Number(e.target.value)})} className="flex-1 px-2 py-1 border rounded text-right font-bold" />
                    </div>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="px-4 py-2 text-xs border border-slate-300 rounded hover:bg-slate-50">Close</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MachineryItemsModal;
