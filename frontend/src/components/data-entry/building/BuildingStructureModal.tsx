import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import { BldgStrucRecord, createBldgStruc, updateBldgStruc, deleteBldgStruc } from '@/services/bldgStrucService';
import { getBldgUnitCosts, BldgUnitCostRecord } from '@/services/bldgUnitCostService';

import { getOrdinanceValues, OrdinanceValueRecord } from '@/services/ordinanceService';

interface BuildingStructureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  isFormEnabled: boolean;
  initialStructures?: BldgStrucRecord[];
  onUpdate?: (structures: BldgStrucRecord[]) => void;
}

const BuildingStructureModal: React.FC<BuildingStructureModalProps> = ({ 
  open, 
  onOpenChange, 
  buildingId, 
  isFormEnabled, 
  initialStructures = [],
  onUpdate
}) => {
  const { headerColor, headerColorDark } = useThemeColor();
  // Ensure records is initialized as an array, even if initialStructures is undefined
  const [records, setRecords] = useState<BldgStrucRecord[]>(initialStructures || []);
  
  const prevInitialStructuresRef = useRef<BldgStrucRecord[]>(initialStructures);
  const [unitCostOptions, setUnitCostOptions] = useState<BldgUnitCostRecord[]>([]);
  const [ordinanceOptions, setOrdinanceOptions] = useState<OrdinanceValueRecord[]>([]);

  // Get current user's municipality code (City)
  const [userCity, setUserCity] = useState<string>('');

  useEffect(() => {
    // Attempt to get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.municipalityCode) {
                // If user has municipalityCode (e.g. "10"), use it as City filter
                // If code is ADN/ALL, maybe treat as null or don't filter? 
                // But for rates, usually we want specific city rates.
                // Assuming municipalityCode maps directly to CITY column.
                if (user.municipalityCode !== 'ADN' && user.municipalityCode !== 'ALL') {
                    setUserCity(user.municipalityCode);
                }
            }
        } catch (e) {
            console.error('Error parsing user info', e);
        }
    }
  }, []);

  // Reset editing state when modal closes or form becomes disabled
  useEffect(() => {
    if (!open || !isFormEnabled) {
      setIsEditing(false);
      setIsAdding(false);
    }
  }, [open, isFormEnabled]);

  // Create a mapping from structural type code to description for easier lookup
  const strucTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    ordinanceOptions.forEach(opt => {
      // Map ID to readable code (e.g. "III - B")
      // Only structureClass and subClass
      const label = `${opt.structureClass || ''}${opt.subClass ? ' - ' + opt.subClass : ''}`;
      map[opt.id] = label;
    });
    return map;
  }, [ordinanceOptions]);

  // Load Unit Costs
  useEffect(() => {
    const costParams: any = { limit: 1000 };
    if (userCity) {
        costParams.city = userCity;
    }

    getBldgUnitCosts(costParams)
      .then(response => {
        if (response.success) {
          setUnitCostOptions(response.data);
        }
      })
      .catch(err => console.error('Failed to load unit costs', err));
  }, [userCity]);

  // Load Ordinance Values (Independent of City)
  useEffect(() => {
    getOrdinanceValues({ limit: 1000 })
      .then(response => {
        if (response.success) {
          setOrdinanceOptions(response.data);
        }
      })
      .catch(err => console.error('Failed to load ordinance values', err));
  }, []);

  useEffect(() => {
    if (JSON.stringify(prevInitialStructuresRef.current) !== JSON.stringify(initialStructures)) {
      setRecords(initialStructures || []); // Safety check
      prevInitialStructuresRef.current = initialStructures;
    }
  }, [initialStructures]);

  // Notify parent when records change
  // Removed useEffect to prevent infinite loop.
  // Instead, onUpdate is called explicitly in handleSave and handleDelete.


  const [selectedRecord, setSelectedRecord] = useState<BldgStrucRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    structureType: '',
    bldgCode: '',
    storey: '',
    floorOrder: '',
    description: '',
    age: '',
    floorArea: '',
    unitValue: '',
    marketValue: '',
    dateConstructed: '',
    dateOccupied: '',
    dateCompleted: '',
    maintenance: '',
    depreciationRate: '',
    buccAdj: '',
    adjustedUnitValue: '',
    foundation: '',
    columns: '',
    beams: '',
    trussFraming: '',
    roof: '',
    exteriorWalls: '',
    flooring: '',
    floorJoists: '',
    doors: '',
    ceiling: '',
    windows: '',
    stairs: '',
    partition: '',
    wallFinish: '',
    electrical: '',
    toiletBath: '',
    plumbing: '',
    fixtures: '',
    others: '',
  });

  const handleRowSelect = (record: BldgStrucRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    setFormData({
      structureType: record.Struc_type || '',
      bldgCode: record.BldgCode || '',
      storey: record.Storey || '',
      floorOrder: record.FloorOrd?.toString() || '0',
      description: record.Struc_Desc || '',
      age: record.Age || '',
      floorArea: record.Floor_area?.toString() || '0',
      unitValue: record.UNIT_VALUE?.toString() || '0',
      marketValue: record.Market_Val?.toString() || '0',
      dateConstructed: record.D_construct ? record.D_construct.split('T')[0] : '',
      dateOccupied: record.D_occupied ? record.D_occupied.split('T')[0] : '',
      dateCompleted: record.D_complete ? record.D_complete.split('T')[0] : '',
      maintenance: record.Maintenance || '',
      depreciationRate: record.Dep_Rate?.toString() || '0',
      buccAdj: record.BUCC_Rate?.toString() || '0',
      adjustedUnitValue: record.AdjustedUnitValue?.toString() || '0',
      foundation: record.Foundation || '',
      columns: record.Posts || '',
      beams: record.Beams || '',
      trussFraming: record.Truss_Framing || '',
      roof: record.Roof || '',
      exteriorWalls: record.Ext_Walls || '',
      flooring: record.Flooring || '',
      floorJoists: record.FloorJoists || '',
      doors: record.Doors || '',
      ceiling: record.Ceiling || '',
      windows: record.Windows || '',
      stairs: record.Stairs || '',
      partition: record.Partition || '',
      wallFinish: record.Wall_Finish || '',
      electrical: record.Electrical || '',
      toiletBath: record.Toilet_Bath || '',
      plumbing: record.Plumbing || '',
      fixtures: record.Fixtures || '',
      others: record.Others || '',
    });
  };

  // Auto-select the single record if it exists
  useEffect(() => {
    if (records.length === 1 && !selectedRecord && !isAdding && !isEditing) {
      // Use setTimeout to avoid setting state during render cycle (Maximum update depth exceeded)
      const timer = setTimeout(() => {
        handleRowSelect(records[0]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [records, selectedRecord, isAdding, isEditing]);

  const handleAdd = () => {
    if (records.length >= 1) return;
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      structureType: '',
      bldgCode: '',
      storey: '',
      floorOrder: '',
      description: '',
      age: '',
      floorArea: '',
      unitValue: '',
      marketValue: '',
      dateConstructed: '',
      dateOccupied: '',
      dateCompleted: '',
      maintenance: '',
      depreciationRate: '',
      buccAdj: '',
      adjustedUnitValue: '',
      foundation: '',
      columns: '',
      beams: '',
      trussFraming: '',
      roof: '',
      exteriorWalls: '',
      flooring: '',
      floorJoists: '',
      doors: '',
      ceiling: '',
      windows: '',
      stairs: '',
      partition: '',
      wallFinish: '',
      electrical: '',
      toiletBath: '',
      plumbing: '',
      fixtures: '',
      others: '',
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
    if (window.confirm('Delete this structure record?')) {
      try {
        const success = await deleteBldgStruc(buildingId, selectedRecord.FloorOrd);
        if (success) {
          const newRecords = records.filter(r => r.FloorOrd !== selectedRecord.FloorOrd);
          setRecords(newRecords);
          onUpdate?.(newRecords);
          setSelectedRecord(null);
          handleAdd(); 
        }
      } catch (error) {
        console.error('Error deleting structure:', error);
      }
    }
  };

  // Calculate Market Value automatically when floor area or unit value changes
  useEffect(() => {
    if (isEditing || isAdding) {
      const floorArea = parseFloat(formData.floorArea) || 0;
      const unitValue = parseFloat(formData.unitValue) || 0;
      const calculatedMarketValue = floorArea * unitValue;
      
      setFormData(prev => ({
        ...prev,
        marketValue: calculatedMarketValue.toFixed(2)
      }));
    }
  }, [formData.floorArea, formData.unitValue, isEditing, isAdding]);

  const handleSave = async () => {
    try {
      const recordData: Partial<BldgStrucRecord> = {
        ...selectedRecord,
        TDN: buildingId,
        FloorOrd: isAdding ? records.length + 1 : parseInt(formData.floorOrder),
        Struc_type: formData.structureType,
        BldgCode: formData.bldgCode,
        Storey: formData.storey,
        Struc_Desc: formData.description,
        Age: formData.age,
        Floor_area: parseFloat(formData.floorArea) || 0,
        UNIT_VALUE: parseFloat(formData.unitValue) || 0,
        Market_Val: parseFloat(formData.marketValue) || 0,
        D_construct: formData.dateConstructed,
        D_occupied: formData.dateOccupied,
        D_complete: formData.dateCompleted,
        Maintenance: formData.maintenance,
        Dep_Rate: parseFloat(formData.depreciationRate) || 0,
        BUCC_Rate: parseFloat(formData.buccAdj) || 0,
        AdjustedUnitValue: parseFloat(formData.adjustedUnitValue) || 0,
        Foundation: formData.foundation,
        Posts: formData.columns,
        Beams: formData.beams,
        Truss_Framing: formData.trussFraming,
        Roof: formData.roof,
        Ext_Walls: formData.exteriorWalls,
        Flooring: formData.flooring,
        FloorJoists: formData.floorJoists,
        Doors: formData.doors,
        Ceiling: formData.ceiling,
        Windows: formData.windows,
        Stairs: formData.stairs,
        Partition: formData.partition,
        Wall_Finish: formData.wallFinish,
        Electrical: formData.electrical,
        Toilet_Bath: formData.toiletBath,
        Plumbing: formData.plumbing,
        Fixtures: formData.fixtures,
        Others: formData.others,
      };

      if (isAdding) {
        // Optimistically add to local state
        // For new properties (no ID yet), we might rely on the parent to save everything.
        // But the user said "can save only when click the mother save button"
        // This implies we should ONLY update local state here, and not call API create/update yet.
        
        // Wait, if "mother save button" means the main form save button, then this modal is just for editing the array in memory.
        
        const newRecord = { ...recordData } as BldgStrucRecord;
        const newRecords = [...records, newRecord];
        setRecords(newRecords); 
        onUpdate?.(newRecords);
        setSelectedRecord(newRecord);
        setIsEditing(false);
        setIsAdding(false);
      } else {
        // Optimistically update local state
        if (!selectedRecord?.FloorOrd && selectedRecord?.FloorOrd !== 0) return;
        
        const updatedRecord = { ...recordData } as BldgStrucRecord;
        const newRecords = records.map(r => r.FloorOrd === selectedRecord.FloorOrd ? updatedRecord : r);
        setRecords(newRecords);
        onUpdate?.(newRecords);
        setSelectedRecord(updatedRecord);
        setIsEditing(false);
        setIsAdding(false);
      }
      
      // We don't call createBldgStruc or updateBldgStruc here anymore.
      // The `onUpdate` prop (useEffect) will bubble these changes up to the parent.
      
    } catch (error) {
      console.error('Error saving structure:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    if (selectedRecord) {
      handleRowSelect(selectedRecord);
    } else {
      handleAdd();
    }
  };

  const formatCurrency = (value: number) => {
    if (value === null || value === undefined) return '0.00';
    return new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const isLocalFormEnabled = isEditing || isAdding;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Building Structure Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mini Toolbar */}
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              disabled={isLocalFormEnabled || !isFormEnabled || records.length >= 1}
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

          {/* Structure Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded h-40">
            <table className="w-full text-xs">
              <thead
                className="text-white sticky top-0"
                style={{
                  backgroundColor: 'var(--table-header-bg)',
                  ['--table-header-bg' as any]: headerColor,
                }}
              >
                <style>{`
                  @media (prefers-color-scheme: dark) {
                    .dark thead[style*="--table-header-bg"] {
                      --table-header-bg: ${headerColorDark} !important;
                    }
                  }
                `}</style>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Structural Type</th>
                  <th className="px-3 py-2 text-left font-medium">Bldg. Code</th>
                  <th className="px-3 py-2 text-center font-medium">Storey</th>
                  <th className="px-3 py-2 text-center font-medium">Floor Order</th>
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-center font-medium">Age</th>
                  <th className="px-3 py-2 text-right font-medium">Floor Area</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Value</th>
                  <th className="px-3 py-2 text-right font-medium">Market Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                      No structure records found for this building.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => (
                    <tr
                      key={record.FloorOrd || index}
                      onClick={() => handleRowSelect(record)}
                      className={`cursor-pointer transition-colors ${
                        selectedRecord?.FloorOrd === record.FloorOrd
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : index % 2 === 0
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-slate-50 dark:bg-slate-800/50'
                      } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                    >
                      <td className="px-3 py-1.5">{strucTypeMap[record.Struc_type] || record.Struc_type || '-'}</td>
                      <td className="px-3 py-1.5">{record.BldgCode || '-'}</td>
                      <td className="px-3 py-1.5 text-center">{record.Storey || '-'}</td>
                      <td className="px-3 py-1.5 text-center">{record.FloorOrd || '0'}</td>
                      <td className="px-3 py-1.5">{record.Struc_Desc || '-'}</td>
                      <td className="px-3 py-1.5 text-center">{record.Age || '-'}</td>
                      <td className="px-3 py-1.5 text-right">{record.Floor_area || 0}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(record.UNIT_VALUE || 0)}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(record.Market_Val || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* General Description Section */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
            <div className="bg-slate-200 dark:bg-slate-700 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-600 text-center">
              General Description
            </div>
            <div className="p-3 grid grid-cols-3 gap-x-6 gap-y-2">
              {/* Column 1 */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Structural Type :</label>
                  <select 
                    value={formData.structureType}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedOrdinance = ordinanceOptions.find(opt => opt.id === selectedId);
                      
                      // Auto-select Bldg Code if only one exists, or reset
                      // Filter based on selected Structural Type if needed? 
                      // Currently BldgCode dropdown shows ALL.
                      
                      setFormData(prev => ({ 
                        ...prev, 
                        structureType: selectedId,
                        // If an ordinance value is selected, it sets the base unit value
                        unitValue: selectedOrdinance ? selectedOrdinance.unitValue.toString() : prev.unitValue,
                      }));
                    }}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded w-full max-w-[200px]"
                  >
                    <option value="">Select Structure Type</option>
                    {/* Unique Structure Types from Ordinance API */}
                    {/* Group by Building Type Code (RES, COM, etc.) and list Classes */}
                    {Object.values(ordinanceOptions.reduce((acc, curr) => {
                        // Create unique key for display
                        const key = `${curr.buildingType.code}-${curr.structureClass}-${curr.subClass || ''}`;
                        if (!acc[key]) {
                            acc[key] = curr;
                        }
                        return acc;
                    }, {} as Record<string, OrdinanceValueRecord>))
                    .sort((a, b) => {
                        // Sort by Type, then Class (I, II, III, IV, V), then SubClass
                        const typeCompare = a.buildingType.code.localeCompare(b.buildingType.code);
                        if (typeCompare !== 0) return typeCompare;
                        
                        // Roman Numeral Sorting Helper
                        const romanMap: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 };
                        const classA = romanMap[a.structureClass] || 0;
                        const classB = romanMap[b.structureClass] || 0;
                        
                        if (classA !== classB) return classA - classB;
                        
                        return (a.subClass || '').localeCompare(b.subClass || '');
                    })
                    .map((opt, index) => (
                      <option key={`${opt.id}-${index}`} value={opt.id}>
                        {opt.buildingType.name} - {opt.structureClass}{opt.subClass ? `-${opt.subClass}` : ''} ({opt.unitValue})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Bldg. Code :</label>
                  <select 
                    value={formData.bldgCode}
                    onChange={(e) => {
                       const selectedCode = e.target.value;
                       // Find the matching record from BLDG_UNITCOST
                       const selectedOption = unitCostOptions.find(opt => opt.BldgCode === selectedCode);
                       
                       setFormData(prev => ({ 
                         ...prev, 
                         bldgCode: selectedCode,
                         ...(selectedOption && {
                           // If a building code is selected, we might want to update unit value
                           // BUT if an Ordinance Value (Structure Type) is ALSO selected, which one takes precedence?
                           // Usually, Structure Type defines the Unit Value for tax declaration.
                           // Building Code might be secondary or supplementary.
                           // For now, let's keep unit value from Ordinance if selected, else from BldgCode.
                           // Or maybe prompt?
                           // Let's assume Ordinance Value takes precedence if set.
                           // If not set, use Bldg Code value.
                           unitValue: !formData.structureType ? selectedOption.UNIT_VALUE.toString() : prev.unitValue
                         })
                       }));
                    }}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  >
                    <option value="">Select Building Code</option>
                     {/* Show ALL Building Codes for the user's city */}
                     {unitCostOptions
                        .reduce((unique: BldgUnitCostRecord[], item) => {
                          if (!unique.find(i => i.BldgCode === item.BldgCode)) {
                            unique.push(item);
                          }
                          return unique;
                        }, [])
                        .sort((a, b) => a.BldgCode.localeCompare(b.BldgCode))
                        .map((opt, idx) => (
                          <option key={`${opt.BldgCode}-${idx}`} value={opt.BldgCode}>
                            {opt.BldgCode} {opt.BldgCodeDesc ? ` - ${opt.BldgCodeDesc}` : ''}
                          </option>
                        ))
                     }
                  </select>
                </div>
                <div className="flex items-center justify-end pr-2">
                  <label className="text-xs flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3" disabled={!isLocalFormEnabled} />
                    Other Improvement
                  </label>
                </div>
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Storey :</label>
                  <input 
                    type="text" 
                    value={formData.storey}
                    onChange={(e) => setFormData(prev => ({ ...prev, storey: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Description :</label>
                  <input 
                    type="text" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Floor Order :</label>
                  <input 
                    type="number" 
                    value={formData.floorOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, floorOrder: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Bldg. Age :</label>
                  <input 
                    type="text" 
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded bg-slate-50" 
                    readOnly
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Bldg. Permit :</label>
                  <input 
                    type="text" 
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Floor Area :</label>
                  <input 
                    type="number" 
                    value={formData.floorArea}
                    onChange={(e) => setFormData(prev => ({ ...prev, floorArea: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Unit Value :</label>
                  <input 
                    type="number" 
                    value={formData.unitValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitValue: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">% of Construction :</label>
                  <input 
                    type="number" 
                    defaultValue="100.00"
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">% Adj. of BUCC :</label>
                  <div className="flex-1 flex gap-1">
                    <input 
                      type="number" 
                      value={formData.buccAdj}
                      onChange={(e) => setFormData(prev => ({ ...prev, buccAdj: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="w-16 px-2 py-1 text-xs border rounded text-right" 
                    />
                    <input 
                      type="text" 
                      value={formData.adjustedUnitValue}
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border rounded text-right bg-slate-50"
                      placeholder="Adjusted Unit Value (BUCC)"
                      readOnly 
                    />
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Date Constructed :</label>
                  <input 
                    type="date" 
                    value={formData.dateConstructed}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateConstructed: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Date Occupied :</label>
                  <input 
                    type="date" 
                    value={formData.dateOccupied}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOccupied: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Date Completed :</label>
                  <input 
                    type="date" 
                    value={formData.dateCompleted}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateCompleted: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Deg. of Maintenance :</label>
                  <select 
                    value={formData.maintenance}
                    onChange={(e) => setFormData(prev => ({ ...prev, maintenance: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                  >
                    <option value="">Select</option>
                    <option value="Average">Average</option>
                    <option value="Good">Good</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Depreciation :</label>
                  <select disabled={!isLocalFormEnabled} className="flex-1 px-2 py-1 text-xs border rounded">
                    <option>Auto Apply Depreciation</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Depreciation Rate :</label>
                  <input 
                    type="number" 
                    value={formData.depreciationRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, depreciationRate: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Cert. of Occ. Iss. on:</label>
                  <input type="date" disabled={!isLocalFormEnabled} className="flex-1 px-2 py-1 text-xs border rounded" />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Cert. of Comp. Iss. on:</label>
                  <input type="date" disabled={!isLocalFormEnabled} className="flex-1 px-2 py-1 text-xs border rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Structural Characteristics Section */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
            <div className="bg-slate-200 dark:bg-slate-700 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-600 text-center">
              Structural Characteristics
            </div>
            <div className="p-3 grid grid-cols-3 gap-x-6 gap-y-2">
              {/* Column 1 */}
              <div className="space-y-2">
                {[
                  { label: 'Foundation :', key: 'foundation' },
                  { label: 'Columns :', key: 'columns' },
                  { label: 'Beams :', key: 'beams' },
                  { label: 'Truss Framing :', key: 'trussFraming' },
                  { label: 'Roof :', key: 'roof' },
                  { label: 'Exterior Walls :', key: 'exteriorWalls' },
                ].map((field) => (
                  <div key={field.key} className="flex items-center">
                    <label className="w-28 text-xs font-medium text-right mr-2">{field.label}</label>
                    <input 
                      type="text"
                      value={(formData as any)[field.key]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border rounded" 
                    />
                  </div>
                ))}
              </div>

              {/* Column 2 */}
              <div className="space-y-2">
                {[
                  { label: 'Flooring :', key: 'flooring' },
                  { label: 'Floor Joists :', key: 'floorJoists' },
                  { label: 'Doors :', key: 'doors' },
                  { label: 'Ceiling :', key: 'ceiling' },
                  { label: 'Windows :', key: 'windows' },
                  { label: 'Stairs :', key: 'stairs' },
                ].map((field) => (
                  <div key={field.key} className="flex items-center">
                    <label className="w-28 text-xs font-medium text-right mr-2">{field.label}</label>
                    <input 
                      type="text"
                      value={(formData as any)[field.key]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border rounded" 
                    />
                  </div>
                ))}
              </div>

              {/* Column 3 */}
              <div className="space-y-2">
                {[
                  { label: 'Partition :', key: 'partition' },
                  { label: 'Wall Finish :', key: 'wallFinish' },
                  { label: 'Electrical :', key: 'electrical' },
                  { label: 'Toilet/Bath :', key: 'toiletBath' },
                  { label: 'Plumbing :', key: 'plumbing' },
                  { label: 'Fixtures :', key: 'fixtures' },
                  { label: 'Others :', key: 'others' },
                ].map((field) => (
                  <div key={field.key} className="flex items-center">
                    <label className="w-28 text-xs font-medium text-right mr-2">{field.label}</label>
                    <input 
                      type="text"
                      value={(formData as any)[field.key]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border rounded" 
                    />
                  </div>
                ))}
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

export default BuildingStructureModal;
