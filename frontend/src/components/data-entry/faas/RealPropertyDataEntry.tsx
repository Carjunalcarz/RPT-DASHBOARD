import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, RefreshCw, Printer,
  FileText, CreditCard, Search, ChevronDown, Building2,
  User, MapPin, Info, DollarSign, GripHorizontal, Sparkles, Code, Loader2
} from 'lucide-react';
import { dummyPropertyRecord, dummyAssessmentRecords } from './dummyData';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAlert } from '@/context/AlertContext';
import { getRptMastDataDirect, RptMastRecord, getMastExtn } from '@/services/rptMastService';
import { getRptAssByTdn, RptAssRecord } from '@/services/rptAssService';
import PropertyInformationSection from './PropertyInformationSection';
import PropertyOwnerSection from './PropertyOwnerSection';
import PropertyBoundariesSection from './PropertyBoundariesSection';
import AssessmentSection from './AssessmentSection';
import ReferenceSection from './ReferenceSection';
import SignatoriesSection from './SignatoriesSection';
import PreviousTDNsSection from './PreviousTDNsSection';
import TaxDecSheetSection from './TaxDecSheetSection';
import OtherPropertyTab from '../OtherPropertyTab';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { saveDraft, submitForReview, listFaasRecords } from '@/services/faasService';
import { useIdempotency } from '@/hooks/useIdempotency';

// Types
interface PropertyRecord {
  id: string;
  tdn: string;
  arp: string;
  pin: string;
  TDN?: string;
  ARP?: string;
  PIN?: string;
  ownerNo: string;
  owner: string;
  barangay: string;
  barangayCode: string;
  cityCode: string;
  // Reference Fields
  pNewTdn?: string;
  pOldTdn?: string;
  pPin?: string;
  pMarketValue?: number;
  pAssessedValue?: number;
  pOwnerCode?: string;
  pOwnerNo?: string;
  canArp?: string;
  pArea?: number;
  pAreaM?: boolean;
  pEffDate?: string;
  pOwner?: string;

  // Signatory Fields
  appraisedBy?: string;
  appraisedPos?: string;
  appraisedDate?: string;
  assessor?: string;
  assessorPos?: string;
  assessorDate?: string;
  recApproval?: string;
  recApprovalPos?: string;
  recAppDate?: string;
  approved?: string;
  approvedPos?: string;
  approvedDate?: string;
  provAssessor?: string;
  provAssessorPos?: string;
  provAssessorDate?: string;
  cityAssessor?: string;
  cityAssessorPos?: string;
  cityAssessorDate?: string;
  deputy?: string;
  deputyPos?: string;
  deputyDate?: string;
  sgdAppraised?: boolean;
  sgdRecommend?: boolean;
  sgdApproved?: boolean;
  sgdAssessed?: boolean;
  sgdProv?: boolean;
  sgdCity?: boolean;
  sgdDeputy?: boolean;
  tpdAppraised?: boolean;
  tpdRecommend?: boolean;
  tpdApproved?: boolean;
  tpdAssessed?: boolean;
  tpdProv?: boolean;
  tpdCity?: boolean;
  tpdDeputy?: boolean;
  trees?: any[];
  status?: 'draft' | 'for-review' | 'approved';
  TRANS_CD?: string; // Transaction Code (Update Code)
  
  // Additional fields for PropertyInformationSection
  EFF_DATE?: string;
  DEC_DATE?: string;
  EFF_CANC?: string;
  DIST_NO?: string;
  BCODE?: string;
  BARANGAY?: string;
  CCN?: string;
  MTDN?: string;
  IMP_NO?: string;
  BLDGNAME?: string;
  BLDGUNIT?: string;
  CER_TIT_NO?: string;
  TCT_DATE?: string;
  CAD_LOT_NO?: string;
  ASS_LOT_NO?: string;
  BLOCK_NO?: string;
  LOTE_NO?: string;
} // Add new field for display


const RealPropertyDataEntry: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  
  // Records state
  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PropertyRecord | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, totalPages: 1 });
  const [assessmentRecords, setAssessmentRecords] = useState<RptAssRecord[]>([]);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search/Filter state
  const [searchField, setSearchField] = useState('TDN');
  const [filterValue, setFilterValue] = useState('%');
  const [appliedFilter, setAppliedFilter] = useState({ field: 'TDN', value: '%' });
  const [additionalSearch, setAdditionalSearch] = useState('All Records');
  const [searchText, setSearchText] = useState('');

  // Sub-component editing state
  const [isSubComponentEditing, setIsSubComponentEditing] = useState(false);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const PERSISTENCE_KEY = 'rpt_data_entry_state';

  // Idempotency Hook
  const { idempotencyKey, refreshKey, getKey } = useIdempotency();

  // Restore state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(PERSISTENCE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const { record, assessments, editing, adding } = parsedState;
        
        if (record) {
          setSelectedRecord(record);
          setAssessmentRecords(assessments || []);
          setIsEditing(editing || false);
          setIsAdding(adding || false);
          toast.info('Restored previous session', { id: 'restore-session' });
        }
      } catch (e) {
        console.error('Failed to restore state', e);
      }
    }
    setIsRestored(true);
  }, []);

  // Save state on change
  useEffect(() => {
    if (!isRestored) return;

    if (selectedRecord) {
      const stateToSave = {
        record: selectedRecord,
        assessments: assessmentRecords,
        editing: isEditing,
        adding: isAdding
      };
      localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stateToSave));
    } else {
      localStorage.removeItem(PERSISTENCE_KEY);
    }
  }, [selectedRecord, assessmentRecords, isEditing, isAdding, isRestored]);

  // ... (previous state declarations)

  const handleTransactionClick = () => {
    setShowTransactionModal(true);
  };

  const handleTransactionSelect = (type: string) => {
    if (!selectedRecord) {
      toast.error('Please select a property first.', { id: 'select-property-error' });
      return;
    }

    refreshKey(); // New transaction, new key

    // Create a new record based on the selected one
    // This initiates a new transaction workflow
    const newRecord: PropertyRecord = {
      ...selectedRecord,
      // Generate a temporary ID for the transaction
      id: `TRANS-${type}-${Date.now()}`,
      
      // Clear unique identifiers that should be new for the transaction
      // tdn: '', 
      // arp: '',
      
      // Explicitly set these to empty strings for the UI inputs if they are undefined in selectedRecord
      // TDN: '',
      // ARP: '',
      tdn: selectedRecord.tdn,
      arp: selectedRecord.arp,
      
      // Link to the previous record (The "Foundation" of the transaction)
      pOldTdn: selectedRecord.tdn,
      pPin: selectedRecord.pin,
      pOwner: selectedRecord.owner,
      pOwnerNo: selectedRecord.ownerNo,
      pEffDate: selectedRecord.pEffDate, // Or current date? Usually previous eff date.
      pAssessedValue: selectedRecord.pAssessedValue, // Should be calculated or carried over
      
      // Set the Transaction Type
      TRANS_CD: type,
      
      // Reset status and dates for the new workflow
      status: 'draft',
      appraisedDate: new Date().toISOString().split('T')[0],
      assessorDate: '',
      recAppDate: '',
      approvedDate: '',
      
      // Clear approvals
      sgdAppraised: false,
      sgdRecommend: false,
      sgdApproved: false,
      sgdAssessed: false,
      sgdProv: false,
      sgdCity: false,
      sgdDeputy: false,
    };

    // Update state to reflect the new transaction record
    setSelectedRecord(newRecord);
    
    // Set UI to "Add/Edit" mode to allow data entry
    setIsAdding(true); 
    setIsEditing(true); 
    
    // Close modal and notify user
    setShowTransactionModal(false);
    toast.success(`Transaction '${type}' initiated. Source data loaded.`);
  };

  const handlePropertyInfoUpdate = (updatedData: Partial<PropertyRecord>) => {
    if (!selectedRecord) return;
    
    // Merge updates into selectedRecord
    const updatedRecord = { ...selectedRecord, ...updatedData };
    
    // Update local state
    setSelectedRecord(updatedRecord);
    
    // If we are editing, we might want to update the main records list too if the ID matches
    // But for drafts/new transactions, it's just local until saved.
    // However, the table relies on `records`.
    // If this is a new transaction (isAdding=true), it's not in `records` yet?
    // Wait, handleSaveDraft saves it to backend.
    
    // Let's just update selectedRecord for now. 
    // If we want real-time update in the table row (if it exists there), we need to update `records`.
    if (records.some(r => r.id === updatedRecord.id)) {
        setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    }
  };

  // Filter Validation
  const validateFilter = (field: string, value: string): string | null => {
    if (value === '%' || !value) return null; // Default wildcard is valid
    if (!value.trim()) return 'Filter value cannot be empty';
    
    switch (field) {
      case 'PIN':
        // Alphanumeric and hyphens allowed
        if (!/^[a-zA-Z0-9-%]+$/.test(value)) return 'PIN must contain only letters, numbers, and hyphens';
        break;
      case 'TDN':
      case 'pOldTdn':
      case 'ARP':
        // Numeric check (or alphanumeric if TDNs can have letters, but usually numeric/dashes)
        // Let's allow dashes too just in case
        if (!/^[0-9-%]+$/.test(value)) return `${field} must be numeric (hyphens allowed)`;
        break;
      case 'OWNER':
        if (value.length < 2) return 'Owner name must be at least 2 characters';
        break;
    }
    return null;
  };

  const handleApplyFilter = () => {
    // If empty filter, treat as reset to all records
    if (!filterValue || !filterValue.trim()) {
        setPagination(prev => ({ ...prev, page: 1 }));
        setAppliedFilter({ field: searchField, value: '%' });
        toast.success('Filter cleared');
        return;
    }

    const error = validateFilter(searchField, filterValue);
    if (error) {
      toast.error(error);
      return;
    }
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
    setAppliedFilter({ field: searchField, value: filterValue });
    toast.success(`Filter applied: ${searchField} = ${filterValue}`);
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyFilter();
    }
  };

  // Table Resize Logic
  const ROW_HEIGHT = 45; // Approximate height of a table row
  const HEADER_HEIGHT = 45; // Approximate height of the table header
  const INITIAL_ROWS = 5;
  
  const [tableHeight, setTableHeight] = useState(HEADER_HEIGHT + (INITIAL_ROWS * ROW_HEIGHT));
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault(); // Prevent text selection
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        setTableHeight((previousHeight) => {
          const newHeight = previousHeight + mouseMoveEvent.movementY;
          const minHeight = HEADER_HEIGHT + ROW_HEIGHT; // At least header + 1 row
          const maxHeight = 800; // Maximum reasonable height
          return Math.max(minHeight, Math.min(newHeight, maxHeight));
        });
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // SWR Data Fetching
  const { data: apiData, error, isLoading: isSwrLoading, mutate } = useSWR(
    ['rpt-mast', pagination.page, pagination.limit, appliedFilter.field, appliedFilter.value],
    ([_, page, limit, searchField, filterValue]) => getRptMastDataDirect({ page, limit, searchField, filterValue }),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // Sync data to state
  useEffect(() => {
    if (apiData?.success) {
      const mappedRecords: PropertyRecord[] = apiData.data.map((item, index) => ({
        ...item,
        id: `${item.TDN}-${index}`, // Ensure unique ID even with duplicate TDNs
        tdn: item.TDN || '',
        arp: item.TDN || '', // ARP should use CURRENT TDN
        pin: item.PIN || '',
        ownerNo: item.OWNER_NO || '',
        owner: item.Owner_Name || 'N/A',
        barangay: item.BARANGAY || 'N/A',
        barangayCode: item['BRGY.CODE'] || '',
        cityCode: item.CITY || '',
        // Map Reference Fields
        pNewTdn: item.P_NEW_TDN,
        pOldTdn: item.P_OLD_TDN,
        pPin: item.P_PIN,
        pMarketValue: item.P_MARKET_VALUE,
        pAssessedValue: item.P_ASS_VALUE,
        pOwnerCode: item.P_OWNER_CODE,
        pOwnerNo: item.P_OWNER_NO,
        canArp: item.CAN_ARP,
        pArea: item.P_AREA,
        pAreaM: item.P_AREA_M,
        pEffDate: item.P_EFF_DATE,
        pOwner: item.P_OWNER,
        // Map Signatory Fields
        appraisedBy: item.Appraiser,
        appraisedPos: item.AppraiserPos,
        appraisedDate: item.AppraisedDate,
        assessor: item.Assessor,
        assessorPos: item.AssessorPos,
        assessorDate: item.AssessorDate,
        recApproval: item.Rec_Approval,
        recApprovalPos: item.Rec_ApprovalPos,
        recAppDate: item.Rec_AppDate,
        approved: item.Approved,
        approvedPos: item.ApprovedPos,
        approvedDate: item.ApprovedDate,
        provAssessor: item.ProvAssessor,
        provAssessorPos: item.ProvAssessorPos,
        provAssessorDate: item.ProvAssessorDate,
        cityAssessor: item.CityAssessor,
        cityAssessorPos: item.CityAssessorPos,
        cityAssessorDate: item.CityAssessorDate,
        deputy: item.Deputy,
        deputyPos: item.DeputyPos,
        deputyDate: item.DeputyDate,
        sgdAppraised: item.SGD_APPRAISED,
        sgdRecommend: item.SGD_RECOMMEND,
        sgdApproved: item.SGD_APPROVED,
        sgdAssessed: item.SGD_ASSESSED,
        sgdProv: item.SGD_PROV,
        sgdCity: item.SGD_CITY,
        sgdDeputy: item.SGD_DEPUTY,
        tpdAppraised: item.TPD_APPRAISED,
        tpdRecommend: item.TPD_RECOMMEND,
        tpdApproved: item.TPD_APPROVED,
        tpdAssessed: item.TPD_ASSESSED,
        tpdProv: item.TPD_PROV,
        tpdCity: item.TPD_CITY,
        tpdDeputy: item.TPD_DEPUTY
      }));

      setRecords(mappedRecords);
      setTotalRecords(apiData.pagination.total);
      
      setPagination(prev => ({
        ...prev,
        totalPages: apiData.pagination.totalPages
      }));

      // Select first record if none selected and not adding
      // if (mappedRecords.length > 0 && !selectedRecord && !isAdding) {
      //   const firstRecord = mappedRecords[0];
      //   setSelectedRecord(firstRecord);
        
      //   // Fetch assessments for default selection
      //   setIsAssessmentLoading(true);
      //   getRptAssByTdn(firstRecord.tdn)
      //     .then(setAssessmentRecords)
      //     .catch((err) => {
      //       console.error(err);
      //       setAssessmentRecords([]);
      //     })
      //     .finally(() => setIsAssessmentLoading(false));
      // }
    }
  }, [apiData, selectedRecord, isAdding]);

  // Error handling
  useEffect(() => {
    if (error) {
      console.error('Failed to load RPTMAST data:', error);
      toast.error('Failed to load records from database');
    }
  }, [error]);

  // Sync loading state
  useEffect(() => {
    setIsLoading(isSwrLoading);
  }, [isSwrLoading]);

  // Prevent accidental navigation/refresh when editing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing || isAdding) {
        e.preventDefault();
        e.returnValue = ''; // Standard for Chrome/Firefox
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing, isAdding]);

  // Handlers
  const handleRowSelect = (record: PropertyRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);

    // Fetch assessments
    setIsAssessmentLoading(true);
    getRptAssByTdn(record.tdn)
      .then(setAssessmentRecords)
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load assessment records');
        setAssessmentRecords([]);
      })
      .finally(() => setIsAssessmentLoading(false));
  };

  const handleAdd = () => {
    refreshKey();
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord({
        id: `TRANS-NEW-${Date.now()}`,
        tdn: '',
        arp: '',
        pin: '',
        owner: '',
        ownerNo: '',
        barangay: '',
        barangayCode: '',
        cityCode: '',
        status: 'draft'
    } as PropertyRecord);
    setAssessmentRecords([]); // Clear assessment records
  };

  const handlePopulateDummy = () => {
    // Cast to any because the dummy record has extra fields (raw keys) that the interface doesn't strictly define
    // but are required by the child components (PropertyInformationSection, etc.)
    setSelectedRecord(dummyPropertyRecord as any);
    setAssessmentRecords(dummyAssessmentRecords as any); // Populate assessment records
    toast.success('Form populated with dummy data');
  };

  // Auto-save mechanism for sub-components
  // This callback is passed down to children (AssessmentSection -> LandAssessment)
  // When they save locally, we trigger a save to backend
  const handleAutoSave = async (updatedAssessmentRecords: any[]) => {
    if (!selectedRecord) return;
    
    // Update local state first
    setAssessmentRecords(updatedAssessmentRecords);
    
    // Construct the full record payload
    // Clean lowercase keys and ensure TDN/ARP sync
    const { id: _, tdn, pin, arp, ...recordData } = selectedRecord as any;
    const dataToSave = {
      ...recordData,
      TDN: selectedRecord.TDN || selectedRecord.tdn,
      ARP: selectedRecord.TDN || selectedRecord.tdn, // Ensure ARP = TDN
      PIN: selectedRecord.PIN || selectedRecord.pin,
      assessments: updatedAssessmentRecords,
      status: 'draft'
    };

    try {
      // Determine if we should update an existing record or create new
      // Check if we have a real ID (not temp/dummy)
      const isTempId = !selectedRecord.id || selectedRecord.id.includes('DUMMY') || selectedRecord.id.startsWith('TRANS');
      let targetId = isTempId ? undefined : selectedRecord.id;

      // If it's a temp ID, check if there's an existing draft with the same TDN we can take over
      if (isTempId && dataToSave.TDN) {
          try {
            const existingDrafts = await listFaasRecords({
                searchField: 'TDN',
                filterValue: dataToSave.TDN,
                limit: 1
            });
            const match = existingDrafts.data?.find((r: any) => r.status === 'draft');
            if (match) {
                targetId = match.id;
            }
          } catch (err) {
            console.warn('Failed to check for existing drafts', err);
          }
      }

      // Sync to Supabase
      const savedRecord = await saveDraft(dataToSave, targetId);
      toast.success('Changes synced to server');
      
      // Update local ID if we got a new one or took over an existing one
      const newId = savedRecord.id || targetId;
      if (newId && selectedRecord.id !== newId) {
          setSelectedRecord({
              ...selectedRecord,
              id: newId,
              status: 'draft'
          });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to sync changes');
    }
  };

  const checkDuplicatePinTdn = async (pin: string, tdn: string): Promise<string | null> => {
    // Skip check if values are empty
    if (!pin && !tdn) return null;

    try {
      // Parallelize checks to reduce latency
      const checks = [];
      
      if (pin) {
        checks.push(
          listFaasRecords({ searchField: 'PIN', filterValue: pin, limit: 1 })
            .then(res => ({ type: 'PIN', data: res.data }))
        );
      }
      
      if (tdn) {
        checks.push(
          listFaasRecords({ searchField: 'TDN', filterValue: tdn, limit: 1 })
            .then(res => ({ type: 'TDN', data: res.data }))
        );
      }

      const results = await Promise.all(checks);

      for (const result of results) {
        const duplicates = result.data;
        const conflict = duplicates?.find((r: any) => {
            // Ignore self if editing
            if (selectedRecord?.id && r.id === selectedRecord.id) return false;
            
            // Allow duplicate if the conflicting record is a draft, 
            // because we will overwrite/update it in the save/submit process
            if (r.status === 'draft') return false;

            return true; 
        });

        if (conflict) {
            if (result.type === 'PIN') {
                const duplicateTdn = conflict.tdn || conflict.data?.tdn || conflict.data?.TDN;
                // Allow if the PIN belongs to the parent record (General Revision / Update)
                if (selectedRecord?.pOldTdn && duplicateTdn === selectedRecord.pOldTdn) {
                     continue; // Valid continuity
                }
                const tdn = duplicateTdn || 'Unknown TDN';
                return `PIN ${pin} already exists in a pending/approved record (TDN: ${tdn}, Status: ${conflict.status})`;
            }
            
            if (result.type === 'TDN') {
                const ownerName = conflict.data?.owner || conflict.data?.owner_name || conflict.data?.OWNER_NAME || 'Unknown Owner';
                return `TDN ${tdn} already exists in the records under the name: ${ownerName}.`;
            }
        }
      }

    } catch (error: any) {
      console.error('Validation check failed:', error);
      // Return error message only if critical failure, otherwise allow save?
      // Better to fail safe.
      return `Validation check failed: ${error.message || 'Network Error'}`;
    }
    return null;
  };

  const handleSaveDraft = async () => {
    if (!selectedRecord) return;
    const currentRecord = selectedRecord;

    // Check duplicates
    const errorMsg = await checkDuplicatePinTdn(currentRecord.pin, currentRecord.tdn);
    if (errorMsg) {
      // Use a persistent toast for validation errors so the user has time to read it
      toast.error('Validation Error', {
        description: errorMsg,
        duration: Infinity, // User must dismiss
        action: {
          label: 'Dismiss',
          onClick: () => console.log('Dismissed')
        }
      });
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Saving draft...');

    try {
      // Prepare data for saving
      // If ID is temporary (starts with TRANS or DUMMY), remove it so backend creates a new record
      const isTempId = currentRecord.id && (currentRecord.id.startsWith('TRANS') || currentRecord.id.startsWith('DUMMY') || currentRecord.id.includes('DUMMY'));
      
      // Clean lowercase keys and ensure TDN/ARP sync
      const { id, tdn, pin, arp, ...recordData } = currentRecord as any;
      const dataToSave = {
        ...recordData,
        TDN: currentRecord.TDN || currentRecord.tdn,
        ARP: currentRecord.TDN || currentRecord.tdn, // Ensure ARP = TDN
        PIN: currentRecord.PIN || currentRecord.pin,
        assessments: assessmentRecords,
        status: 'draft'
      };

      let targetId = isTempId ? undefined : currentRecord.id;

      // Check if there is an existing draft with this TDN to overwrite (to prevent duplicates)
      if (isTempId && dataToSave.TDN) {
          try {
            const existingDrafts = await listFaasRecords({
                searchField: 'TDN',
                filterValue: dataToSave.TDN,
                limit: 1
            });
            const match = existingDrafts.data?.find((r: any) => r.status === 'draft');
            if (match) {
                targetId = match.id;
            }
          } catch (err) {
            console.warn('Failed to check for existing drafts', err);
          }
      }

      const savedRecord = await saveDraft(dataToSave, targetId, idempotencyKey);
      
      refreshKey(); // New key for next action
      toast.dismiss(toastId);
      toast.success('Draft saved successfully');
      
      // Update local state with the saved record (capture the new backend ID)
      const newId = savedRecord.id || targetId || currentRecord.id;
      setSelectedRecord({
        ...currentRecord,
        id: newId,
        status: 'draft'
      });
      
      // If it was a new record, we might want to refresh the list or add it to records
      if (isTempId && savedRecord.id) {
          // Ideally refresh list, but for now just update local view
          // setRecords(prev => [savedRecord, ...prev]); 
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      // Prioritize the error message from the backend response (AppError)
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || error.message || 'Failed to save draft';
      
      toast.error(errorMessage, {
        duration: 5000, // Longer duration for reading
        description: backendMessage ? 'Please check your input.' : 'Server Error'
      });
      console.error('Save Draft Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecord) return;
    const currentRecord = selectedRecord;

    // Check duplicates
    const errorMsg = await checkDuplicatePinTdn(currentRecord.pin, currentRecord.tdn);
    if (errorMsg) {
      toast.error('Validation Error', {
        description: errorMsg,
        duration: Infinity,
        action: {
          label: 'Dismiss',
          onClick: () => console.log('Dismissed')
        }
      });
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Submitting record...');

    try {
      // First ensure it's saved
      // Similar logic to saveDraft
      const isTempId = currentRecord.id && (currentRecord.id.startsWith('TRANS') || currentRecord.id.startsWith('DUMMY') || currentRecord.id.includes('DUMMY'));
      
      // Clean lowercase keys and ensure TDN/ARP sync
      const { id, tdn, pin, arp, ...recordData } = currentRecord as any;
      const dataToSave = {
        ...recordData,
        TDN: currentRecord.TDN || currentRecord.tdn,
        ARP: currentRecord.TDN || currentRecord.tdn, // Ensure ARP = TDN
        PIN: currentRecord.PIN || currentRecord.pin,
        assessments: assessmentRecords,
        status: 'for-review' // Optimistically set status
      };
      
      let recordId = currentRecord.id;
      
      // If it's a new/temp record, we MUST save it first to get an ID
      if (isTempId) {
         let targetId = undefined;
         if (dataToSave.TDN) {
             try {
                const existingDrafts = await listFaasRecords({ searchField: 'TDN', filterValue: dataToSave.TDN, limit: 1 });
                const match = existingDrafts.data?.find((r: any) => r.status === 'draft');
                if (match) targetId = match.id;
             } catch (e) { console.warn(e); }
         }

         const saved = await saveDraft(dataToSave, targetId, idempotencyKey);
         recordId = saved.id || ''; 
         // refreshKey(); // No need to refresh yet, let's use a fresh key for submit
      } else {
         // If it exists, we can just save with new status (which saveDraft handles if we pass status)
         // OR call submitForReview if we want to trigger specific workflow
         // But submitForReview takes ID. So we need to ensure data is up to date.
         // Let's just use saveDraft to ensure all fields are updated, then submit.
         const saved = await saveDraft(dataToSave, dataToSave.id, idempotencyKey);
         recordId = saved.id || recordId;
         // refreshKey(); 
      }
      
      if (!recordId) throw new Error("Failed to obtain Record ID");

      // Generate a NEW key for the submit action to avoid conflict with the save action
      const submitKey = refreshKey(); 
      await submitForReview(recordId, submitKey);
      
      refreshKey(); // New key for next action
      
      toast.dismiss(toastId);
      toast.success('Record submitted for review');
      setSelectedRecord({
        ...currentRecord,
        id: recordId,
        status: 'for-review'
      });
      setIsAdding(false);
      setIsEditing(false);
    } catch (error: any) {
      toast.dismiss(toastId);
      // Prioritize the error message from the backend response (AppError)
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || error.message || 'Failed to submit record';
      
      toast.error(errorMessage, {
        duration: 5000,
        description: backendMessage ? 'Please check your input.' : 'Server Error'
      });
      console.error('Submit Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    refreshKey();
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const isConfirmed = await showConfirm({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this record?',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
    }
  };

  // Active tab state
  const [activeTab, setActiveTab] = useState('property-info');
  const [showJson, setShowJson] = useState(false);

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
    setIsAdding(false);
    toast.success('Record saved successfully');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleRefresh = () => {
    mutate();
    toast.success('Data refreshed');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination(prev => ({ ...prev, page: 1, limit: newSize }));
  };

  const handlePrint = () => {
    window.print();
  };

  const isFormEnabled = isEditing || isAdding;

  const tabs = [
    { id: 'property-info', label: 'Property Information', icon: Building2 },
    { id: 'assessment', label: 'Assessment', icon: DollarSign },
    { id: 'reference', label: 'Reference', icon: FileText },
    { id: 'signatories', label: 'Signatories / Memorandum', icon: User },
    { id: 'other-info', label: 'Other Property Information', icon: Info },
    { id: 'previous-tdns', label: 'Previous TDNs', icon: FileText },
    { id: 'tax-dec', label: 'Tax Dec. Sheet', icon: FileText },
  ];

  return (
    <div className="h-full flex flex-col" data-testid="real-property-data-entry">
      {/* Main Toolbar */}
      <div className="bg-transparent border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* FAAS/TDN Button */}
          <button className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 font-medium">
            <FileText size={14} />
            FAAS/TDN
          </button>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* CRUD Buttons */}
          <button
            onClick={handleAdd}
            disabled={isFormEnabled}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-green-50 dark:hover:bg-green-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-green-700 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-add"
          >
            <Plus size={14} />
            Add
          </button>
          
          {isAdding && (
            <button
              onClick={handlePopulateDummy}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-purple-700 dark:text-purple-400"
              title="Populate Dummy Data"
            >
              <Sparkles size={14} />
              Populate
            </button>
          )}

          {/* Save/Cancel - Main Record Control */}
          {/* Note: 'Save' here is redundant if we have 'Save Draft' and 'Submit'. 
              However, 'Save' might be intended for local edit finalization before syncing?
              Actually, the original design had Edit -> Save/Cancel.
              With the new Draft/Submit workflow, the 'Save' button is confusing.
              
              Let's Hide/Remove the old 'Save' button if we are in the new workflow.
              OR rename it to 'Apply Changes' if it's just exiting edit mode.
              But 'Save Draft' does the persistence.
              
              Let's clean up the toolbar to be logical:
              1. Add (Starts new record)
              2. Edit (Enables form)
              3. Delete (Removes record)
              ---
              4. Save Draft (Persists to Server as Draft)
              5. Submit (Persists to Server as For-Review)
              
              The old 'Save' button logic was:
              setIsEditing(false);
              setIsAdding(false);
              toast.success('Record saved successfully');
              
              It didn't actually call an API in the original dummy version.
              Now 'Save Draft' calls the API.
              
              Decision: Remove the old green 'Save' button and rely on 'Save Draft' / 'Submit'.
              BUT, we need a way to exit "Edit Mode" (unlock the UI).
              'Save Draft' can optionally exit edit mode, or we keep a 'Done Editing' button.
              
              Let's consolidate:
              - 'Save Draft': Saves to DB, keeps you in edit mode or exits? Usually keeps you there.
              - 'Submit': Saves and exits edit mode + locks.
              
              If the user clicks 'Edit', the form unlocks.
              If they click 'Save Draft', it saves but stays unlocked?
              
              Let's hide the old confusing 'Save' button and make 'Save Draft' the primary way to save work in progress.
          */}
          
          <button
            onClick={handleSaveDraft}
            disabled={!selectedRecord || selectedRecord.status === 'for-review' || selectedRecord.status === 'approved' || isSaving}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-blue-700 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save as Draft (Work in Progress)"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={!selectedRecord || selectedRecord.status === 'for-review' || selectedRecord.status === 'approved' || isSaving}
            className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white border border-transparent rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Submit for Review (Finalize)"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Submitting...' : 'Submit'}
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          {/* Edit/Delete Controls */}
          <button
            onClick={handleEdit}
            disabled={!selectedRecord || isFormEnabled || selectedRecord.status === 'for-review'}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-blue-700 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-edit"
          >
            <Edit2 size={14} />
            Edit
          </button>
          
          <button
            onClick={handleDelete}
            disabled={!selectedRecord || isFormEnabled}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-delete"
          >
            <Trash2 size={14} />
            Delete
          </button>
          
          {/* Cancel Changes */}
          {isFormEnabled && (
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              data-testid="btn-cancel"
            >
              <X size={14} />
              Cancel Transaction
            </button>
          )}

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* Utility Buttons */}
          <button
            onClick={() => setShowJson(true)}
            disabled={!selectedRecord}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-orange-700 dark:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Show JSON Data"
          >
            <Code size={14} />
            JSON
          </button>

          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="btn-refresh"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            data-testid="btn-print"
          >
            <Printer size={14} />
            Print
          </button>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* Additional Actions */}
          <button className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
            <Info size={14} />
            Other Info
          </button>
          <button 
            onClick={handleTransactionClick}
            disabled={!selectedRecord}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={14} />
            Transaction
          </button>
          <button className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
            <DollarSign size={14} />
            Payment Inq.
          </button>
          
          <div className="flex-1" />
          
          <div className="px-3 py-2 text-xs bg-cyan-600 text-white rounded-lg shadow-sm font-medium">
            Number of Records: {totalRecords.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Records Grid - Hidden when in adding/editing mode */}
        {(!isAdding && !isEditing) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <div 
            className="overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
            style={{ height: `${tableHeight}px`, maxHeight: '80vh' }}
          >
            <table className="w-full text-sm" data-testid="records-table">
              <thead
                className="text-white sticky top-0 z-10"
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
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">TDN</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">OLD TDN</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">ARP</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[200px]">PIN</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[150px]">STATUS</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide min-w-[250px]">OWNER</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[100px]">CITY CODE</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[100px]">BRGY CODE</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide min-w-[150px]">BARANGAY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={8} className="px-4 py-3">
                         <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  records.map((record, index) => (
                  <tr
                    key={record.id}
                    onClick={() => handleRowSelect(record)}
                    className={`cursor-pointer transition-colors ${
                      selectedRecord?.id === record.id
                        ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-l-blue-500'
                        : index % 2 === 0
                        ? 'bg-blue-50/30 dark:bg-slate-800/30 hover:bg-blue-100/50 dark:hover:bg-blue-900/20'
                        : 'bg-white dark:bg-slate-900 hover:bg-blue-100/50 dark:hover:bg-blue-900/20'
                    }`}
                    data-testid={`record-row-${record.id}`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.TDN || record.tdn}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.pOldTdn || ''}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.ARP || record.tdn}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.PIN || record.pin}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        record.status === 'approved' 
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                          : record.status === 'for-review'
                          ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                          : record.status === 'draft'
                          ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                        {record.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate max-w-xs">{record.owner}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap text-center">{record.cityCode}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap text-center">{record.barangayCode}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap truncate max-w-xs">{record.barangay}</td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Resize Handle */}
          <div
            className={`w-full h-5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 cursor-row-resize flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none ${isResizing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            onMouseDown={startResizing}
          >
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium">
                {Math.max(1, Math.floor((tableHeight - HEADER_HEIGHT) / ROW_HEIGHT))} Rows
              </span>
              <GripHorizontal size={14} />
            </div>
          </div>
          
          {/* Pagination */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
             <DataTablePagination 
               pageIndex={pagination.page}
               pageSize={pagination.limit}
               totalCount={totalRecords}
               totalPages={pagination.totalPages}
               setPageIndex={handlePageChange}
               setPageSize={handlePageSizeChange}
               isLoading={isLoading}
             />
          </div>
        </div>
        )}

          {/* Search and Filter Section - Hidden when in adding/editing mode */}
          {(!isAdding && !isEditing) && (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Field */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Search Field:
                </label>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="search-field"
                >
                  <option value="TDN">TDN</option>
                  <option value="pOldTdn">OLD TDN</option>
                  <option value="ARP">ARP</option>
                  <option value="PIN">PIN</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>

              {/* Filter Value */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Filter Value:
                </label>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    onKeyDown={handleFilterKeyDown}
                    className={`flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      appliedFilter.value !== '%' && appliedFilter.value === filterValue
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    data-testid="filter-value"
                    placeholder={
                      searchField === 'TDN' ? 'Enter TDN...' : 
                      searchField === 'pOldTdn' ? 'Enter OLD TDN...' :
                      searchField === 'ARP' ? 'Enter ARP...' :
                      `Enter ${searchField}...`
                    }
                  />
                  <button 
                    onClick={handleApplyFilter}
                    disabled={isLoading}
                    className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
                    APPLY FILTER
                  </button>
                </div>
              </div>

              {/* Additional Search */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Additional Search:
                </label>
                <select
                  value={additionalSearch}
                  onChange={(e) => setAdditionalSearch(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="additional-search"
                >
                  <option value="All Records">All Records</option>
                  <option value="Active">Active Records</option>
                  <option value="Cancelled">Cancelled Records</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Search:
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Enter search text..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="search-text"
                />
                <button className="px-3 py-2 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap">
                  SEARCH BY OWNER INDEX
                </button>
              </div>
            </div>
          </div>
          )}

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 pt-2">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-4">
            {activeTab === 'property-info' && (
              <>
                <PropertyInformationSection
                  isEnabled={isFormEnabled}
                  isAdding={isAdding}
                  selectedRecord={selectedRecord}
                  onUpdate={handlePropertyInfoUpdate}
                />
                <PropertyOwnerSection
                  isEnabled={isFormEnabled}
                  selectedRecord={selectedRecord}
                  onUpdate={handlePropertyInfoUpdate}
                />
                <PropertyBoundariesSection
                  isEnabled={isFormEnabled}
                  selectedRecord={selectedRecord}
                  onUpdate={handlePropertyInfoUpdate}
                />
              </>
            )}

            {activeTab === 'assessment' && (
              <AssessmentSection
                isEnabled={isFormEnabled}
                assessmentRecords={assessmentRecords}
                isLoading={isAssessmentLoading}
                onUpdate={handleAutoSave}
              />
            )}
            
            {activeTab === 'reference' && (
              <ReferenceSection 
                selectedRecord={selectedRecord} 
                isEnabled={isFormEnabled} 
                onUpdate={handlePropertyInfoUpdate}
              />
            )}
            
            {activeTab === 'signatories' && (
              <SignatoriesSection 
                selectedRecord={selectedRecord} 
                isEnabled={isFormEnabled} 
                onEditModeChange={setIsSubComponentEditing}
                onUpdate={handlePropertyInfoUpdate}
              />
            )}
            
            {activeTab === 'other-info' && (
              <OtherPropertyTab
                isEditing={isFormEnabled}
                onEnterEdit={() => {}}
                onSave={handleSave}
                onCancel={handleCancel}
                onDataChange={() => {}}
              />
            )}
            
            {activeTab === 'previous-tdns' && (
              <PreviousTDNsSection />
            )}
            
            {activeTab === 'tax-dec' && (
              <TaxDecSheetSection />
            )}
          </div>
        </div>
      </div>
      {/* Transaction Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Select Transaction Type</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <button
              onClick={() => handleTransactionSelect('GR')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <FileText size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">General Revision (GR)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Mass update of property assessments</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('REV')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                <RefreshCw size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Revision (REV)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Specific updates or corrections</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('MIGRATE')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Migrate (MIGRATE)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Import or transfer legacy data</div>
              </div>
            </button>

            <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>

            <button
              onClick={() => handleTransactionSelect('CN')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <X size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Cancellation (CN)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Cancel existing assessment</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('CS')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Building2 size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Consolidation (CS)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Combine multiple properties</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('SD')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50 transition-colors">
                <GripHorizontal size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Subdivision (SD)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Split property into multiple lots</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('CS-SD')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                <RefreshCw size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">Consolidation and Subdivision (CS-SD)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Complex split and merge operation</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* JSON Viewer Modal */}
      <Dialog open={showJson} onOpenChange={setShowJson}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Form Data (JSON)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-lg text-xs font-mono text-green-400">
            <pre>
              {JSON.stringify({
                ...selectedRecord,
                assessments: assessmentRecords.map(ass => ({
                  ...ass,
                  // Include trees if they exist on the record (assuming we store them on the assessment record in frontend state)
                  // Note: In current implementation, trees might be stored inside the assessment record object in state
                  // or fetched separately. If they are in `ass.trees`, this will show them.
                  // If they are separate state, we'd need to merge them.
                  // Based on LandAssessment.tsx: `trees: selectedRecord?.trees || [],`
                  // So if we are looking at `assessmentRecords` from `RealPropertyDataEntry`, 
                  // we need to make sure those records actually contain the `trees` property.
                  // The `RptAssRecord` interface doesn't strictly have `trees` but `LandRecord` does.
                  // Let's assume the state in LandAssessment updates the object reference in the array.
                }))
              }, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RealPropertyDataEntry;
