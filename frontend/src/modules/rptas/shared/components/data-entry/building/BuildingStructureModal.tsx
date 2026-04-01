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
import { useAlert } from '@/context/AlertContext';
import { BldgStrucRecord, createBldgStruc, updateBldgStruc, deleteBldgStruc } from '@/modules/rptas/shared/services/bldgStrucService';
import { getBuildingTypes, getBuildingAppraisals, BuildingType, BuildingAppraisal } from '@/modules/rptas/shared/services/buildingService';
import { getBldgUnitCosts, BldgUnitCostRecord } from '@/modules/rptas/shared/services/bldgUnitCostService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getOrdinanceValues, OrdinanceValueRecord } from '@/modules/rptas/shared/services/ordinanceService';

interface BuildingStructureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  isFormEnabled: boolean;
  initialStructures?: BldgStrucRecord[];
  onUpdate?: (structures: BldgStrucRecord[]) => void;
  // Add new props to receive parent form data
  parentClassification?: string;
  parentStructureType?: string;
  parentSubType?: string;
  parentArea?: string;
  parentUnitValue?: string;
}

const BuildingStructureModal: React.FC<BuildingStructureModalProps> = ({ 
  open, 
  onOpenChange, 
  buildingId, 
  isFormEnabled, 
  initialStructures = [],
  onUpdate,
  parentClassification,
  parentStructureType,
  parentSubType,
  parentArea,
  parentUnitValue
}) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  // Ensure records is initialized as an array, even if initialStructures is undefined
  const [records, setRecords] = useState<BldgStrucRecord[]>(initialStructures || []);
  
  const prevInitialStructuresRef = useRef<BldgStrucRecord[]>(initialStructures);
  const [unitCostOptions, setUnitCostOptions] = useState<any[]>([]); // Kept for compatibility if needed
  const [ordinanceOptions, setOrdinanceOptions] = useState<OrdinanceValueRecord[]>([]);

  // New states for dynamic dropdowns
  const [buildingTypes, setBuildingTypes] = useState<BuildingType[]>([]);
  const [appraisals, setAppraisals] = useState<BuildingAppraisal[]>([]);
  const [structureClasses, setStructureClasses] = useState<string[]>([]);
  const [subClasses, setSubClasses] = useState<string[]>([]);

  const [selectedRecord, setSelectedRecord] = useState<BldgStrucRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState({
    classification: '', // Added Classification
    structureType: '', // This will now act as Structural Type
    subClass: '', // Added Sub Class
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

  // Load Building Types on Mount
  useEffect(() => {
    getBuildingTypes()
      .then(setBuildingTypes)
      .catch(err => console.error('Failed to load building types', err));
  }, []);

  // Load Appraisals when Classification changes
  useEffect(() => {
    if (formData.classification) {
      getBuildingAppraisals({ classificationCode: formData.classification })
        .then(data => {
          setAppraisals(data);
          const uniqueStructures = Array.from(new Set(data.map(a => a.buildingType.trim()))).sort();
          setStructureClasses(uniqueStructures);
        })
        .catch(err => console.error('Failed to load appraisals', err));
    } else {
      setAppraisals([]);
      setStructureClasses([]);
    }
  }, [formData.classification]);

  // Update SubClasses when Structure Type changes
  useEffect(() => {
    if (formData.structureType && appraisals.length > 0) {
      const filtered = appraisals.filter(a => a.buildingType.trim() === formData.structureType.trim());
      const uniqueSubClasses = Array.from(new Set(filtered.map(a => (a.buildingSubClass || 'NONE').trim()))).sort();
      setSubClasses(uniqueSubClasses);
    } else {
      setSubClasses([]);
    }
  }, [formData.structureType, appraisals]);

  // Update Unit Value when SubClass changes
  useEffect(() => {
    // Only update if unitValue is not already set or if explicitly changing subclass
    // We need to be careful not to overwrite user input if they manually changed it, 
    // BUT usually changing subclass implies a new base rate.
    
    if (formData.classification && formData.structureType && formData.subClass) {
       const match = appraisals.find(a => 
         a.buildingType.trim() === formData.structureType.trim() && 
         ((a.buildingSubClass || 'NONE').trim() === formData.subClass.trim())
       );
       
       if (match) {
         // Always update unit value when structure type/sub class changes to match the rate
         setFormData(prev => ({
           ...prev,
           unitValue: match.rate.toString()
         }));
       }
    }
  }, [formData.classification, formData.structureType, formData.subClass, appraisals]);

  // Load Unit Costs (Deprecated but kept for now)
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

  const handleRowSelect = (record: BldgStrucRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
    
    // We need to try and infer the classification, structural type, and sub type from the record
    // Note: Since these fields might not be directly in BldgStrucRecord, we might need to rely on what was saved or passed down.
    // However, if we assume they are stored in the record (even if not in the interface yet), we can map them.
    // Or we rely on the `Struc_type` being the ID that maps back to the OrdinanceValueRecord which has all the info.
    
    // Strategy: 
    // 1. If record.Struc_type matches an ID in ordinanceOptions, we can infer Classification, Type, SubClass from that option.
    // 2. But wait, `Struc_type` in legacy data might just be "III" or "IV". 
    //    If it's a UUID (from our new system), we can look it up.
    
    // For now, let's assume we store the "Structure Type" value (e.g. "III") in `Struc_type` column as before?
    // The user wants "BRING ALSO THE VALUE OF THE FIELD".
    // This implies when they click a row, the dropdowns should populate with the values from that row.
    
    // Let's check if we can match the existing record data to our dropdown options.
    // If record.Struc_type corresponds to the "Structural Type" (e.g. "III" or "RES-III-A"), we set it.
    
    // IMPROVEMENT: If we saved the specific Classification/StructureType/SubClass in the record, we should use them.
    // If not, we try to match based on what we have.
    
    setFormData({
      classification: (record as any).classification || '', 
      structureType: record.Struc_type || '', 
      subClass: (record as any).subClass || '',
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

  // Auto-initialize form state on open
  useEffect(() => {
    if (open) {
      if (records.length > 0) {
        // Edit existing record
        handleRowSelect(records[0]);
        setIsEditing(!!isFormEnabled);
        setIsAdding(false);
      } else {
        // Initialize new form
        setIsAdding(!!isFormEnabled);
        setIsEditing(false);
        setSelectedRecord(null);
        
        setFormData({
            classification: parentClassification || '', 
            structureType: parentStructureType || '', 
            subClass: parentSubType || '', 
            bldgCode: '',
            storey: '',
            floorOrder: '',
            description: '',
            age: '',
            floorArea: parentArea || '', // Inherit from parent
            unitValue: parentUnitValue || '', // Inherit from parent
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
      }
    }
  }, [open, records, isFormEnabled, parentClassification, parentStructureType, parentSubType, parentArea, parentUnitValue]);

  const handleAdd = () => {
    if (records.length >= 1) return;
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      classification: parentClassification || '', // Inherit from parent
      structureType: parentStructureType || '', // Inherit from parent
      subClass: parentSubType || '', // Inherit from parent
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
    const isConfirmed = await showConfirm({
      title: 'Delete Structure',
      message: 'Are you sure you want to delete this structure record?',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
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

  // Calculate Building Age
  useEffect(() => {
    if (formData.dateCompleted) {
      const completedDate = new Date(formData.dateCompleted);
      const today = new Date();
      let age = today.getFullYear() - completedDate.getFullYear();
      const m = today.getMonth() - completedDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < completedDate.getDate())) {
        age--;
      }
      // Ensure age is non-negative
      setFormData(prev => ({ ...prev, age: Math.max(0, age).toString() }));
    } else {
      setFormData(prev => ({ ...prev, age: '' }));
    }
  }, [formData.dateCompleted]);

  const handleSave = async () => {
    try {
      const recordData: Partial<BldgStrucRecord> = {
        // If editing, use selected record, else use new base
        ...(selectedRecord || {}),
        TDN: buildingId,
        FloorOrd: isAdding ? (records.length > 0 ? records.length + 1 : 1) : parseInt(formData.floorOrder),
        Struc_type: formData.structureType,
        BldgCode: formData.bldgCode,
        Storey: formData.storey,
        Struc_Desc: formData.description,
        Age: formData.age,
        Floor_area: parseFloat(formData.floorArea) || 0,
        Total_Area: parseFloat(formData.floorArea) || 0, // Ensure Total_Area is also set
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
        // Store the new fields in the record (casting as any for now since interface might not have them)
        ...({
            classification: formData.classification,
            Classification: formData.classification, // Ensure PascalCase for interface compatibility
            subClass: formData.subClass,
            SubClass: formData.subClass // Ensure PascalCase for interface compatibility
        } as any)
      };

      if (isAdding) {
        // Since we are enforcing single record mostly, but code supports array.
        // If records is empty, add new. If not, we shouldn't be here if we hid Add button.
        const newRecord = { ...recordData } as BldgStrucRecord;
        const newRecords = [newRecord]; // Replace or Add? Let's assume single record mode: Replace all.
        setRecords(newRecords); 
        onUpdate?.(newRecords);
        setSelectedRecord(newRecord);
        setIsEditing(true); // Keep editing
        setIsAdding(false);
      } else {
        // Update existing
        if (!selectedRecord?.FloorOrd && selectedRecord?.FloorOrd !== 0) return;
        
        const updatedRecord = { ...recordData } as BldgStrucRecord;
        const newRecords = records.map(r => r.FloorOrd === selectedRecord.FloorOrd ? updatedRecord : r);
        setRecords(newRecords);
        onUpdate?.(newRecords);
        setSelectedRecord(updatedRecord);
        setIsEditing(true); // Keep editing
        setIsAdding(false);
      }
      
      // Close modal on save? User might want to keep editing. 
      // But typically Save closes or shows success.
      // Let's close it for now as per typical modal behavior, or keep open.
      onOpenChange(false);
      
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
             {/* Add/Edit/Delete Buttons Removed as per requirement */}
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

          {/* Structure Table Removed */}
          {/* 
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded h-40">
            ... table content ...
          </div> 
          */}

          {/* General Description Section */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
            <div className="bg-slate-200 dark:bg-slate-700 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-600 text-center">
              General Description
            </div>
            <div className="p-3 grid grid-cols-3 gap-x-6 gap-y-2">
              {/* Column 1 */}
              <div className="space-y-2">
                {/* Classification */}
                <div className="flex items-center gap-2 relative">
                  <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    Classification:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.classification}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, classification: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span className="truncate">
                          {formData.classification ? formData.classification : "Select Classification"}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {buildingTypes.map((bt) => (
                          <SelectItem key={bt.id} value={bt.code} className="text-xs">
                            {bt.code} - {bt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Structural Type */}
                <div className="flex items-center gap-2">
                  <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    Structural Type:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.structureType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, structureType: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <SelectValue placeholder="Select Structure Type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {structureClasses.map((sc, index) => (
                          <SelectItem key={`${sc}-${index}`} value={sc} className="text-xs">
                            {sc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sub Type */}
                <div className="flex items-center gap-2">
                  <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    Sub Type:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.subClass}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subClass: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <SelectValue placeholder="Select Sub Type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {subClasses.map((sub, index) => (
                          <SelectItem key={`${sub}-${index}`} value={sub} className="text-xs">
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    Bldg. Code :
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.bldgCode}
                      onValueChange={(value) => {
                        const selectedOption = unitCostOptions.find(opt => opt.BldgCode === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          bldgCode: value,
                          ...(selectedOption && {
                            unitValue: !formData.structureType ? selectedOption.UNIT_VALUE.toString() : prev.unitValue
                          })
                        }));
                      }}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                         <span className="truncate">
                          {formData.bldgCode ? formData.bldgCode : "Select Building Code"}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {unitCostOptions
                            .reduce((unique: BldgUnitCostRecord[], item) => {
                              if (!unique.find(i => i.BldgCode === item.BldgCode)) {
                                unique.push(item);
                              }
                              return unique;
                            }, [])
                            .sort((a, b) => a.BldgCode.localeCompare(b.BldgCode))
                            .map((opt, idx) => (
                              <SelectItem key={`${opt.BldgCode}-${idx}`} value={opt.BldgCode} className="text-xs">
                                {opt.BldgCode} {opt.BldgCodeDesc ? ` - ${opt.BldgCodeDesc}` : ''}
                              </SelectItem>
                            ))
                         }
                      </SelectContent>
                    </Select>
                  </div>
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
                <div className="flex items-center gap-2">
                  <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    Deg. of Maintenance :
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select 
                      value={formData.maintenance}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, maintenance: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-32 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    Depreciation :
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select disabled={!isLocalFormEnabled} defaultValue="Auto Apply Depreciation">
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                         <SelectValue placeholder="Auto Apply Depreciation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto Apply Depreciation">Auto Apply Depreciation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
