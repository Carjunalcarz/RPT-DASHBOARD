import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { BldgStrucRecord, createBldgStruc, updateBldgStruc, deleteBldgStruc } from '@/modules/rptas/shared/services/bldgStrucService';
import { getBuildingTypes, getBuildingAppraisals, BuildingType, BuildingAppraisal } from '@/modules/rptas/shared/services/buildingService';
import {
  listBldgUnitCostSets,
  listBldgUnitCostSetItems,
  BldgUnitCostSetRecord,
  BldgUnitCostSetItemRecord,
} from '@/modules/rptas/shared/services/bldgUnitCostService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/modules/rptas/ui/select";

import { getOrdinanceValues, OrdinanceValueRecord } from '@/modules/rptas/shared/services/ordinanceService';
import { toast } from 'sonner';

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
  const initStateRef = useRef<{ buildingId: string; hadRecords: boolean } | null>(null);
  const [ordinanceOptions, setOrdinanceOptions] = useState<OrdinanceValueRecord[]>([]);
  const [unitCostSets, setUnitCostSets] = useState<BldgUnitCostSetRecord[]>([]);
  const [unitCostItems, setUnitCostItems] = useState<BldgUnitCostSetItemRecord[]>([]);
  const [selectedUnitCostSetId, setSelectedUnitCostSetId] = useState<string>('');
  const [isLoadingUnitCostSets, setIsLoadingUnitCostSets] = useState(false);
  const [isLoadingUnitCostItems, setIsLoadingUnitCostItems] = useState(false);

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

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    const run = async () => {
      setIsLoadingUnitCostSets(true);
      try {
        const resp = await listBldgUnitCostSets({
          page: 1,
          limit: 200,
          city: userCity || undefined,
          includeDeleted: false,
        });
        if (!mounted) return;
        if (resp?.success) {
          setUnitCostSets(resp.data || []);
          if (!selectedUnitCostSetId && (resp.data || []).length === 1) {
            setSelectedUnitCostSetId(resp.data[0].id);
          }
        } else {
          setUnitCostSets([]);
        }
      } catch {
        if (!mounted) return;
        setUnitCostSets([]);
      } finally {
        if (!mounted) return;
        setIsLoadingUnitCostSets(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [open, userCity, selectedUnitCostSetId]);

  useEffect(() => {
    if (!open) return;
    if (!selectedUnitCostSetId) {
      setUnitCostItems([]);
      return;
    }

    let mounted = true;
    const run = async () => {
      setIsLoadingUnitCostItems(true);
      try {
        const resp = await listBldgUnitCostSetItems(selectedUnitCostSetId, {
          page: 1,
          limit: 1000,
          includeDeleted: false,
        });
        if (!mounted) return;
        if (resp?.success) {
          setUnitCostItems(resp.data || []);
        } else {
          setUnitCostItems([]);
        }
      } catch {
        if (!mounted) return;
        setUnitCostItems([]);
      } finally {
        if (!mounted) return;
        setIsLoadingUnitCostItems(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [open, selectedUnitCostSetId]);

  const unitCostStructureTypes = useMemo(() => {
    if (!selectedUnitCostSetId) return [];
    const types = unitCostItems
      .filter((i) => !i.deleted_at)
      .map((i) => String(i.struc_type || '').trim())
      .filter(Boolean);
    return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
  }, [selectedUnitCostSetId, unitCostItems]);

  const unitCostBldgCodes = useMemo(() => {
    if (!selectedUnitCostSetId) return [];
    const st = String(formData.structureType || '').trim();
    if (!st) return [];
    const map = new Map<string, { code: string; desc: string | null }>();
    for (const i of unitCostItems) {
      if (i.deleted_at) continue;
      if (String(i.struc_type || '').trim() !== st) continue;
      const code = String(i.bldg_code || '').trim();
      if (!code) continue;
      if (!map.has(code)) {
        map.set(code, { code, desc: i.bldg_code_desc ?? null });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [selectedUnitCostSetId, unitCostItems, formData.structureType]);

  useEffect(() => {
    if (!selectedUnitCostSetId) return;
    const st = String(formData.structureType || '').trim();
    const bc = String(formData.bldgCode || '').trim();
    if (!st || !bc) return;

    const match = unitCostItems
      .filter((i) => !i.deleted_at)
      .filter((i) => String(i.struc_type || '').trim() === st)
      .filter((i) => String(i.bldg_code || '').trim() === bc)
      .sort((a, b) => String(b.eff_date || '').localeCompare(String(a.eff_date || '')))[0];
    if (!match) return;

    setFormData((prev) => ({
      ...prev,
      unitValue: String(match.unit_value ?? ''),
      description: prev.description || String(match.bldg_code_desc || '').trim(),
    }));
  }, [selectedUnitCostSetId, unitCostItems, formData.structureType, formData.bldgCode]);

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
    if (selectedUnitCostSetId) return;
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
    if (prevInitialStructuresRef.current !== initialStructures) {
      setRecords(initialStructures || []);
      prevInitialStructuresRef.current = initialStructures;
    }
  }, [initialStructures]);

  // Notify parent when records change
  // Removed useEffect to prevent infinite loop.
  // Instead, onUpdate is called explicitly in handleSave and handleDelete.

  const handleRowSelect = (record: BldgStrucRecord) => {
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
    
    const pickString = (...vals: unknown[]) => {
      for (const v of vals) {
        const s = String(v ?? '').trim();
        if (s) return s;
      }
      return '';
    };

    const classification = pickString(
      (record as any).Classification,
      (record as any).CLASSIFICATION,
      (record as any).classification,
      parentClassification
    );
    const structureType = pickString(
      (record as any).Struc_type,
      (record as any).STRUC_TYPE,
      (record as any).Actual_use,
      (record as any).ACTUAL_USE,
      (record as any).structureType,
      parentStructureType
    );
    const subClass = pickString(
      (record as any).SubClass,
      (record as any).SUB_CLASS,
      (record as any).Sub_Class,
      (record as any).subClass,
      parentSubType
    );

    setFormData({
      classification,
      structureType,
      subClass,
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
      const hasRecords = records.length > 0;
      const shouldInit =
        !initStateRef.current ||
        initStateRef.current.buildingId !== buildingId ||
        (hasRecords && !initStateRef.current.hadRecords);
      if (!shouldInit) return;

      if (records.length > 0) {
        handleRowSelect(records[0]);
        setIsEditing(false);
        setIsAdding(false);
      } else {
        const nextFloorOrd = Math.max(0, ...records.map((r) => Number(r.FloorOrd || 0))) + 1;
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
            floorOrder: String(nextFloorOrd),
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

      initStateRef.current = { buildingId, hadRecords: hasRecords };
    } else {
      initStateRef.current = null;
    }
  }, [open, records, isFormEnabled, parentClassification, parentStructureType, parentSubType, parentArea, parentUnitValue]);

  const handleAdd = () => {
    const nextFloorOrd = Math.max(0, ...records.map((r) => Number(r.FloorOrd || 0))) + 1;
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      classification: parentClassification || '', // Inherit from parent
      structureType: parentStructureType || '', // Inherit from parent
      subClass: parentSubType || '', // Inherit from parent
      bldgCode: '',
      storey: '',
      floorOrder: String(nextFloorOrd),
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
        const resolvedTdn = String(buildingId || '').trim();
        if (!resolvedTdn) {
          toast.error('No TDN selected.');
          return;
        }
        const success = await deleteBldgStruc(resolvedTdn, selectedRecord.FloorOrd);
        if (success) {
          const newRecords = records.filter(r => r.FloorOrd !== selectedRecord.FloorOrd);
          setRecords(newRecords);
          onUpdate?.(newRecords);
          setSelectedRecord(null);
          setIsEditing(false);
          setIsAdding(false);
          const nextFloorOrd = Math.max(0, ...newRecords.map((r) => Number(r.FloorOrd || 0))) + 1;
          setFormData((prev) => ({
            ...prev,
            classification: parentClassification || '',
            structureType: parentStructureType || '',
            subClass: parentSubType || '',
            floorOrder: String(nextFloorOrd),
            bldgCode: '',
            storey: '',
            description: '',
            age: '',
            floorArea: parentArea || '',
            unitValue: parentUnitValue || '',
            marketValue: '',
          }));
          toast.success('Structure deleted.');
        }
      } catch (error) {
        console.error('Error deleting structure:', error);
        toast.error('Failed to delete structure.');
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
      const resolvedTdn = String(buildingId || '').trim();
      if (!resolvedTdn) {
        toast.error('No TDN selected.');
        return;
      }

      const structureType = String(formData.structureType || '').trim();
      if (!structureType) {
        toast.error('Structural Type is required.');
        return;
      }

      const bldgCode = String(formData.bldgCode || '').trim();
      if (!bldgCode) {
        toast.error('Bldg. Code is required.');
        return;
      }

      const nextFloorOrd = Math.max(0, ...records.map((r) => Number(r.FloorOrd || 0))) + 1;
      const resolvedFloorOrd = isAdding
        ? nextFloorOrd
        : Number(selectedRecord?.FloorOrd ?? parseInt(formData.floorOrder) ?? 0);
      const recordData: Partial<BldgStrucRecord> = {
        // If editing, use selected record, else use new base
        ...(selectedRecord || {}),
        TDN: resolvedTdn,
        FloorOrd: resolvedFloorOrd,
        Actual_use: structureType,
        Struc_type: structureType,
        BldgCode: bldgCode,
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
        const created = await createBldgStruc(recordData);
        const newRecord = ((created as any) || recordData) as BldgStrucRecord;
        const newRecords = [...records, newRecord].sort((a, b) => Number(a.FloorOrd || 0) - Number(b.FloorOrd || 0));
        setRecords(newRecords); 
        onUpdate?.(newRecords);
        setSelectedRecord(newRecord);
        setIsEditing(false);
        setIsAdding(false);
        toast.success('Structure added.');
      } else {
        // Update existing
        if (!selectedRecord?.FloorOrd && selectedRecord?.FloorOrd !== 0) return;
        
        const updated = await updateBldgStruc(resolvedTdn, Number(selectedRecord.FloorOrd), recordData);
        const updatedRecord = ((updated as any) || recordData) as BldgStrucRecord;
        const newRecords = records
          .map((r) => (r.FloorOrd === selectedRecord.FloorOrd ? updatedRecord : r))
          .sort((a, b) => Number(a.FloorOrd || 0) - Number(b.FloorOrd || 0));
        setRecords(newRecords);
        onUpdate?.(newRecords);
        setSelectedRecord(updatedRecord);
        setIsEditing(false);
        setIsAdding(false);
        toast.success('Structure updated.');
      }
    } catch (error) {
      console.error('Error saving structure:', error);
      toast.error('Failed to save structure.');
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
          <DialogDescription className="sr-only">
            Building structure details and characteristics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mini Toolbar */}
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              disabled={!isFormEnabled || isLocalFormEnabled}
              className="px-2 py-1 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Add
            </button>
            <button
              onClick={handleEdit}
              disabled={!isFormEnabled || isLocalFormEnabled || !selectedRecord}
              className="px-2 py-1 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 size={12} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={!isFormEnabled || isLocalFormEnabled || !selectedRecord}
              className="px-2 py-1 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} />
              Delete
            </button>
            {isLocalFormEnabled && (
              <>
                <button
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1"
                >
                  <Save size={12} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2 py-1 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1"
                >
                  <X size={12} />
                  Cancel
                </button>
              </>
            )}
          </div>

          <div className="overflow-auto border border-border dark:border-border rounded max-h-44 bg-white dark:bg-background">
            <table className="w-full text-xs">
              <thead className="bg-white dark:bg-background sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left border-b border-border dark:border-border">Structural Type</th>
                  <th className="px-2 py-1 text-left border-b border-border dark:border-border">Bldg. Code</th>
                  <th className="px-2 py-1 text-left border-b border-border dark:border-border">Storey</th>
                  <th className="px-2 py-1 text-left border-b border-border dark:border-border">Floor Order</th>
                  <th className="px-2 py-1 text-left border-b border-border dark:border-border">Description</th>
                  <th className="px-2 py-1 text-left border-b border-border dark:border-border">Age</th>
                  <th className="px-2 py-1 text-right border-b border-border dark:border-border">Floor Area</th>
                  <th className="px-2 py-1 text-right border-b border-border dark:border-border">Unit Value</th>
                  <th className="px-2 py-1 text-right border-b border-border dark:border-border">Market Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-muted dark:text-muted">
                      No structures yet. Click Add to create one.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const isActive = selectedRecord?.FloorOrd === r.FloorOrd;
                    const structureType = String((r as any).Struc_type || (r as any).Actual_use || '').trim();
                    const floorOrd = String(r.FloorOrd ?? '');
                    const desc = String((r as any).Struc_Desc || '').trim();
                    const age = String((r as any).Age || '').trim();
                    const area = Number((r as any).Floor_area || (r as any).Total_Area || 0);
                    const unitValue = Number(r.UNIT_VALUE || 0);
                    const marketVal = Number((r as any).Market_Val || area * unitValue || 0);
                    return (
                      <tr
                        key={`${r.TDN}-${r.FloorOrd}`}
                        onClick={() => {
                          setIsEditing(false);
                          setIsAdding(false);
                          handleRowSelect(r);
                        }}
                        className={`cursor-pointer ${isActive ? 'bg-primary/10' : 'hover:bg-muted/5 dark:hover:bg-muted/10'}`}
                      >
                        <td className={`px-2 py-1 border-l-4 ${isActive ? 'border-primary font-semibold' : 'border-transparent'}`}>{structureType}</td>
                        <td className="px-2 py-1">{r.BldgCode}</td>
                        <td className="px-2 py-1">{r.Storey}</td>
                        <td className="px-2 py-1">{floorOrd}</td>
                        <td className="px-2 py-1">{desc}</td>
                        <td className="px-2 py-1">{age}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(area)}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(unitValue)}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(marketVal)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* General Description Section */}
          <div className="bg-white dark:bg-background border border-border dark:border-border rounded">
            <div className="bg-white dark:bg-background px-3 py-1 text-xs font-bold text-foreground dark:text-foreground border-b border-border dark:border-border text-center">
              General Description
            </div>
            <div className="p-3 grid grid-cols-3 gap-x-6 gap-y-2">
              {/* Column 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Ordinance:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={selectedUnitCostSetId}
                      onValueChange={(value) => {
                        setSelectedUnitCostSetId(value);
                        setFormData((prev) => ({
                          ...prev,
                          structureType: '',
                          bldgCode: '',
                          unitValue: '',
                        }));
                      }}
                      disabled={!isLocalFormEnabled || isLoadingUnitCostSets}
                    >
                      <SelectTrigger
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <SelectValue placeholder={isLoadingUnitCostSets ? 'Loading ordinances…' : 'Select Ordinance'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {unitCostSets.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.city} • {s.ordinance_no}
                            {s.ordinance_date ? ` • ${String(s.ordinance_date).split('T')[0]}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Classification */}
                <div className="flex items-center gap-2 relative">
                  <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Classification:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.classification}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, classification: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                  <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Structural Type:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.structureType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          structureType: value,
                          bldgCode: '',
                          unitValue: selectedUnitCostSetId ? '' : prev.unitValue,
                        }))
                      }
                      disabled={!isLocalFormEnabled || !selectedUnitCostSetId || isLoadingUnitCostItems}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span className="truncate">
                          {formData.structureType ? formData.structureType : "Select Structure Type"}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {(selectedUnitCostSetId ? unitCostStructureTypes : structureClasses).map((sc, index) => (
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
                  <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Sub Type:
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.subClass}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subClass: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span className="truncate">
                          {formData.subClass ? formData.subClass : "Select Sub Type"}
                        </span>
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
                  <label className="w-28 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Bldg. Code :
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select
                      value={formData.bldgCode}
                      onValueChange={(value) => {
                        const picked = unitCostBldgCodes.find((o) => o.code === value);
                        setFormData((prev) => ({
                          ...prev,
                          bldgCode: value,
                          description: prev.description || String(picked?.desc || '').trim(),
                        }));
                      }}
                      disabled={!isLocalFormEnabled || !selectedUnitCostSetId || !formData.structureType || isLoadingUnitCostItems}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                         <span className="truncate">
                          {formData.bldgCode ? formData.bldgCode : "Select Building Code"}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {unitCostBldgCodes.map((opt) => (
                          <SelectItem key={opt.code} value={opt.code} className="text-xs">
                            {opt.code} {opt.desc ? ` - ${opt.desc}` : ''}
                          </SelectItem>
                        ))}
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
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Description :</label>
                  <input 
                    type="text" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-28 text-xs font-medium text-right mr-2">Floor Order :</label>
                  <input 
                    type="number" 
                    value={formData.floorOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, floorOrder: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
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
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                    readOnly
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Bldg. Permit :</label>
                  <input 
                    type="text" 
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Floor Area :</label>
                  <input 
                    type="number" 
                    value={formData.floorArea}
                    onChange={(e) => setFormData(prev => ({ ...prev, floorArea: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Unit Value :</label>
                  <input 
                    type="number" 
                    value={formData.unitValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitValue: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">% of Construction :</label>
                  <input 
                    type="number" 
                    defaultValue="100.00"
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded text-right" 
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
                      className="w-16 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded text-right" 
                    />
                    <input 
                      type="text" 
                      value={formData.adjustedUnitValue}
                      disabled={!isLocalFormEnabled}
                      className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded text-right"
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
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Date Occupied :</label>
                  <input 
                    type="date" 
                    value={formData.dateOccupied}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOccupied: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Date Completed :</label>
                  <input 
                    type="date" 
                    value={formData.dateCompleted}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateCompleted: e.target.value }))}
                    disabled={!isLocalFormEnabled}
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-32 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Deg. of Maintenance :
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select 
                      value={formData.maintenance}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, maintenance: value }))}
                      disabled={!isLocalFormEnabled}
                    >
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                  <label className="w-32 text-xs font-medium text-foreground dark:text-foreground text-right">
                    Depreciation :
                  </label>
                  <div className="flex-1 relative min-w-0">
                    <Select disabled={!isLocalFormEnabled} defaultValue="Auto Apply Depreciation">
                      <SelectTrigger 
                        className={`w-full h-8 text-xs bg-surface dark:bg-background border-border dark:border-border ${!isLocalFormEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                    className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded text-right" 
                  />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Cert. of Occ. Iss. on:</label>
                  <input type="date" disabled={!isLocalFormEnabled} className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" />
                </div>
                <div className="flex items-center">
                  <label className="w-32 text-xs font-medium text-right mr-2">Cert. of Comp. Iss. on:</label>
                  <input type="date" disabled={!isLocalFormEnabled} className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Structural Characteristics Section */}
          <div className="bg-white dark:bg-background border border-border dark:border-border rounded">
            <div className="bg-white dark:bg-background px-3 py-1 text-xs font-bold text-foreground dark:text-foreground border-b border-border dark:border-border text-center">
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
                      className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
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
                      className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
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
                      className="flex-1 px-2 py-1 text-xs border border-border bg-surface dark:bg-background rounded" 
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
            className="px-4 py-2 text-xs border border-border dark:border-border bg-surface dark:bg-muted/20 rounded hover:bg-muted/5 dark:hover:bg-muted/30 transition-colors"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuildingStructureModal;
