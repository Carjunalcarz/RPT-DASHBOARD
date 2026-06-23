import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, RefreshCw, Printer,
  FileText, CreditCard, Search, ChevronDown, Building2,
  User, MapPin, Info, DollarSign, GripHorizontal, Sparkles, Code
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { dummyPropertyRecord, dummyAssessmentRecords } from '@/modules/rptas/shared/components/data-entry/faas/dummyData';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { getRptMastDataDirect, RptMastRecord, getMastExtn } from '@/modules/rptas/shared/services/rptMastService';
import { getRptAssByTdn, RptAssRecord } from '@/modules/rptas/shared/services/rptAssService';
import PropertyDetailsView from './rpt_m_PropertyDetailsView';
import PrintDocument from '../rpt_m_PrintDocument';
import PrintBuildingDocument from '../rpt_m_PrintBuildingDocument';
import PrintEmptyFormsDropdown from '../rpt_m_PrintEmptyFormsDropdown';
import { getBldgStrucByTdn, BldgStrucRecord } from '@/modules/rptas/shared/services/bldgStrucService';
import { getBldgAdjByTdn, BldgAdjRecord } from '@/modules/rptas/shared/services/bldgAdjService';
import { toast } from 'sonner';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/modules/rptas/ui/dialog';
import { saveDraft, submitForReview, listFaasRecords, getFaasRecord, deleteFaasRecord, cancelFaasTransaction, getDistinctTaxBegYears } from '@/modules/rptas/shared/services/faasService';
import { validateTransactionStart, validateTransactionSave } from '@/modules/rptas/shared/services/transactionValidation';
import { PropertyRecord } from './types';
import { cleanPin } from '@/modules/rptas/shared/components/data-entry/utils';
import { RptManagementThemeProvider } from '../theme/rpt_m_ThemeContext';
import { RptManagementThemeToggle } from '../theme/rpt_m_ThemeToggle';

const RealPropertyDataEntry: React.FC = () => {
  const { user } = useAuth();
  const { showConfirm } = useAlert();
  
  const deriveTaxBegYearFromTdn = (value: unknown): string => {
    const tdn = String(value || '').trim();
    const prefix = tdn.split('-')[0];
    const n = Number.parseInt(prefix, 10);
    if (Number.isNaN(n)) return '';
    if (n < 0 || n > 99) return '';
    return String(2001 + n);
  };

  const getDisplayTaxBegYear = (record: any): string => {
    const eff = String(record?.EFF_DATE || record?.pEffDate || '').split('T')[0];
    const effYear = eff && eff.includes('-') ? eff.split('-')[0] : '';
    if (effYear) return effYear;

    const derived = deriveTaxBegYearFromTdn(record?.TDN);
    if (derived) return derived;

    return String(record?.TAX_BEG_YR || '');
  };

  // Records state
  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PropertyRecord | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, totalPages: 1 });
  const [assessmentRecords, setAssessmentRecords] = useState<RptAssRecord[]>([]);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [bldgStruc, setBldgStruc] = useState<BldgStrucRecord[]>([]);
  const [bldgAdj, setBldgAdj] = useState<BldgAdjRecord[]>([]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastAutoSaveSignatureRef = useRef('');
  const latestAutoSaveContextRef = useRef<{ record: PropertyRecord; assessments: any[] } | null>(null);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  // Search/Filter state
  const [searchField, setSearchField] = useState('TDN');
  const [filterValue, setFilterValue] = useState('%');
  const [appliedFilter, setAppliedFilter] = useState({ field: 'TDN', value: '%' });
  const [additionalSearch, setAdditionalSearch] = useState('All Records');
  const [searchText, setSearchText] = useState('');
  
  // Tax Beg Years dropdown state
  const [taxBegYears, setTaxBegYears] = useState<string[]>([]);

  // Sub-component editing state
  const [isSubComponentEditing, setIsSubComponentEditing] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState('property-info');
  const [showJson, setShowJson] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const getApprovedDate = (record: any): string | null => {
    return record?.approvedDate || record?.ApprovedDate || null;
  };

  const getRecommendedDate = (record: any): string | null => {
    return (
      record?.recAppDate ||
      record?.Rec_AppDate ||
      record?.municipal_approval_date ||
      null
    );
  };

  const formatShortDate = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
  };

  const getStatusDateText = (record: any): string | null => {
    const status = String(record?.status || '').toLowerCase();
    if (!status) return null;

    if (status === 'approved') {
      return (
        formatShortDate(getApprovedDate(record)) ||
        formatShortDate(record?.updatedAt || record?.createdAt)
      );
    }

    if (status === 'pending-provincial') {
      return (
        formatShortDate(getRecommendedDate(record)) ||
        formatShortDate(record?.updatedAt || record?.createdAt)
      );
    }

    if (status === 'pending-municipal' || status === 'for-review' || status === 'draft') {
      return formatShortDate(record?.updatedAt || record?.createdAt);
    }

    return null;
  };

  const getStatusBadgeClassName = (value: unknown): string => {
    const status = String(value || '').toLowerCase();

    if (status === 'approved') {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
    }

    if (status === 'pending-provincial') {
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    }

    if (status === 'pending-municipal' || status === 'for-review') {
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
    }

    if (status === 'rejected' || status === 'cancelled' || status === 'canceled') {
      return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
    }

    if (status === 'draft') {
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700';
    }

    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700';
  };
  
  const [isRestored, setIsRestored] = useState(false);
  const PERSISTENCE_KEY = 'rpt_m_data_entry_state';

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

  // Fetch building details if needed
  useEffect(() => {
    const fetchBuildingData = async () => {
      if (selectedRecord && selectedRecord.TDN) {
        // Check if any assessment record is a building
        const isBuilding = assessmentRecords.some(ass => ass.KIND === 'B' || ass.KIND === 'Building');
        if (isBuilding) {
          try {
            const struc = await getBldgStrucByTdn(selectedRecord.TDN);
            setBldgStruc(struc);
            const adj = await getBldgAdjByTdn(selectedRecord.TDN);
            setBldgAdj(adj);
          } catch (e) {
            console.error('Error fetching building details', e);
          }
        } else {
            setBldgStruc([]);
            setBldgAdj([]);
        }
      }
    };
    fetchBuildingData();
  }, [selectedRecord?.TDN, assessmentRecords]);

  const handleTransactionClick = () => {
    setShowTransactionModal(true);
  };

  const handleTransactionSelect = (type: string) => {
    if (!selectedRecord) {
      toast.error('Please select a property first.', { id: 'select-property-error' });
      return;
    }

    const newRecord: PropertyRecord = {
      ...selectedRecord,
      // Generate a temporary ID for the transaction
      id: `TRANS-${type}-${Date.now()}`,
      
      // We don't clear the entire TDN anymore, we just let PropertyInformationSection
      // change the first two digits based on the new effectivity date
      TDN: selectedRecord.TDN || (selectedRecord as any).tdn || '',
      ARP: selectedRecord.ARP || (selectedRecord as any).arp || '',
      
      // Link to the previous record (The "Foundation" of the transaction)
      pOldTdn: selectedRecord.TDN,
      pPin: selectedRecord.PIN,
      pOwner: selectedRecord.owner,
      pOwnerNo: selectedRecord.OWNER_NO,
      pEffDate: selectedRecord.pEffDate, // Or current date? Usually previous eff date.
      pAssessedValue: selectedRecord.pAssessedValue, // Should be calculated or carried over
      
      // Set the Transaction Type
      TRANS_CD: type,
      
      // Reset status and dates for the new workflow
      status: 'draft',
      appraisedDate: new Date().toISOString().split('T')[0],
      // Reset approvals
      sgdAppraised: false,
      sgdRecommend: false,
      sgdApproved: false,
      sgdAssessed: false,
      sgdProv: false,
      sgdCity: false,
      sgdDeputy: false,
    };

    setSelectedRecord(newRecord);
    setIsAdding(true); 
    setIsEditing(true); 
    setShowTransactionModal(false);
    toast.success(`Transaction '${type}' initiated.`);
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
  const { data: apiData, error, isLoading: isSwrLoading, isValidating, mutate } = useSWR(
    ['faas-records', pagination.page, pagination.limit, appliedFilter.field, appliedFilter.value],
    ([_, page, limit, searchField, filterValue]) => listFaasRecords({ page, limit, searchField, filterValue }),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // Sync data to state
  useEffect(() => {
    if (apiData?.data) {
      const mappedRecords: PropertyRecord[] = apiData.data.map((item: any) => {
        const innerData = item.data || {};
        
        // Ensure TDN and ARP are prioritized from item.tdn or innerData
        const currentTdn = item.tdn || innerData.tdn || innerData.TDN || '';
        const currentPin = innerData.pin || innerData.PIN || '';
        
        // Remove lowercase keys to avoid redundancy
        const { tdn, pin, arp, ...cleanInnerData } = innerData;

        return {
          ...cleanInnerData,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          TDN: currentTdn,
          ARP: currentTdn, // ARP should always match TDN as per user request
          PIN: currentPin,
          status: item.status,
          // Ensure essential fields have defaults if missing in JSON
          owner: innerData.owner || innerData.owner_name || 'N/A',
          barangay: innerData.barangay || 'N/A',
          OWNER_NO: innerData.OWNER_NO || '',
        };
      });

      setRecords(mappedRecords);
      setTotalRecords(apiData.pagination.total);
      
      setPagination(prev => ({
        ...prev,
        totalPages: apiData.pagination.totalPages
      }));

      if (!isEditing && !isAdding) {
        setSelectedRecord(prev => {
          if (!prev) return prev;
          return mappedRecords.find(r => r.id === prev.id) || prev;
        });
      }
    }
  }, [apiData, isAdding, isEditing]);

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

  // Fetch distinct Tax Beginning Years
  useEffect(() => {
    let mounted = true;
    const fetchTaxBegYears = async () => {
      try {
        const years = await getDistinctTaxBegYears();
        if (mounted) {
          setTaxBegYears(years || []);
        }
      } catch (err) {
        console.error('Failed to fetch distinct tax beginning years:', err);
      }
    };
    fetchTaxBegYears();
    return () => {
      mounted = false;
    };
  }, []);

  // Restore draft on mount
  useEffect(() => {
    if (localStorage.getItem(PERSISTENCE_KEY)) return;

    const savedDraftId = localStorage.getItem('currentDraftId');
    if (savedDraftId) {
      // Don't set global loading here to avoid flashing if SWR is also loading list
      // But maybe good to indicate restoration
      const restore = async () => {
          try {
              const record = await getFaasRecord(savedDraftId);
              if (record) {
                  const innerData = record.data || {};
                  const currentTdn = record.tdn || innerData.tdn || innerData.TDN || '';
                  const currentPin = innerData.pin || innerData.PIN || '';
                  
                  // Clean lowercase keys
                  const { tdn, pin, arp, ...cleanInnerData } = innerData;

                  const mappedRecord: PropertyRecord = {
                      ...cleanInnerData,
                      id: record.id,
                      TDN: currentTdn,
                      ARP: currentTdn, // Use TDN for ARP
                      PIN: currentPin,
                      status: record.status,
                      owner: innerData.owner || innerData.owner_name || 'N/A',
                      barangay: innerData.barangay || 'N/A',
                      OWNER_NO: innerData.OWNER_NO || '',
                  };
                  
                  setSelectedRecord(mappedRecord);
                  if (mappedRecord.assessments) {
                      setAssessmentRecords(mappedRecord.assessments);
                  }
                  toast.success('Restored unsubmitted draft');
              }
          } catch (err) {
              console.error('Failed to restore draft', err);
              localStorage.removeItem('currentDraftId');
          }
      };
      restore();
    }
  }, []);

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

    // Use embedded assessments if available, otherwise clear or fetch
    if (record.assessments) {
        setAssessmentRecords(record.assessments);
    } else {
        setAssessmentRecords([]);
    }
  };

  // Handle updates from child components
  const handleRecordUpdate = useCallback((updatedData: Partial<PropertyRecord>) => {
    setSelectedRecord(prev => {
      if (!prev) return null;
      return { ...prev, ...updatedData };
    });
  }, []);

  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
    setAssessmentRecords([]); // Clear assessment records
  };

  const handlePopulateDummy = () => {
    // Cast to any because the dummy record has extra fields (raw keys) that the interface doesn't strictly define
    // but are required by the child components (PropertyInformationSection, etc.)
    setSelectedRecord(dummyPropertyRecord as any);
    setAssessmentRecords(dummyAssessmentRecords as any); // Populate assessment records
    toast.success('Form populated with dummy data');
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    if (user?.role !== 'admin' && user?.role !== 'Administrator') {
      toast.error('Only administrators can edit records.');
      return;
    }
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleTransactionCancel = async () => {
    if (!selectedRecord) return;
    
    const isConfirmed = await showConfirm({
      title: 'Cancel Transaction',
      message: 'Are you sure you want to cancel this transaction? This action cannot be undone.',
      confirmLabel: 'Yes, Cancel Transaction',
      cancelLabel: 'No, Keep It',
      variant: 'destructive'
    });

    if (isConfirmed) {
        try {
            // Check if it's actually a transaction
            const isTransaction = selectedRecord.id && selectedRecord.id.startsWith('TRANS');
            
            // Allow cancelling if it's a draft transaction OR if it's a new record being added (which has a TRANS- id locally)
            if (isTransaction) {
                // If it's a drafted transaction that hasn't been submitted/approved, we can just delete it
                // But if we want to log it as "Cancelled", we might want a specific endpoint
                await cancelFaasTransaction(selectedRecord.id);
                toast.success('Transaction cancelled successfully');
            } else {
                // If it's not a transaction ID but user clicked cancel transaction, it might be a misunderstanding or legacy data.
                // However, for drafted records that are NOT yet transactions (just simple adds), we should just delete/reset.
                // But the button is only shown if id starts with TRANS.
                toast.error('This is not an active transaction.');
                return;
            }

            if (selectedRecord.id === localStorage.getItem(PERSISTENCE_KEY)) {
                 // Actually persistence key stores the whole state object, not just ID.
                 // We should clear the state.
                 localStorage.removeItem(PERSISTENCE_KEY);
            }
            // Also check currentDraftId legacy
            if (selectedRecord.id === localStorage.getItem('currentDraftId')) {
                localStorage.removeItem('currentDraftId');
            }
            
            setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
            setSelectedRecord(null);
            setIsEditing(false);
            setIsAdding(false);
            mutate();
        } catch (error) {
            console.error('Failed to cancel transaction:', error);
            // If error is 404 (Not Found), it means it's a local-only transaction not yet saved to backend.
            // In that case, just clearing local state is enough.
            if ((error as any)?.response?.status === 404 || (error as any)?.message?.includes('not found')) {
                 toast.info('Local transaction discarded.');
                 localStorage.removeItem(PERSISTENCE_KEY);
                 setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
                 setSelectedRecord(null);
                 setIsEditing(false);
                 setIsAdding(false);
            } else {
                 toast.error('Failed to cancel transaction');
            }
        }
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    if (user?.role !== 'admin' && user?.role !== 'Administrator') {
      toast.error('Only administrators can delete records.');
      return;
    }

    const isConfirmed = await showConfirm({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this record? This action cannot be undone.',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        // Only attempt to delete from backend if it's a real record (not dummy/temp)
        const isRealRecord = selectedRecord.id && 
                           !selectedRecord.id.includes('DUMMY') && 
                           !selectedRecord.id.startsWith('TRANS');
                           
        if (isRealRecord) {
            await deleteFaasRecord(selectedRecord.id);
            toast.success('Record deleted successfully');
        } else {
            toast.success('Local record removed');
        }

        if (selectedRecord.id === localStorage.getItem('currentDraftId')) {
            localStorage.removeItem('currentDraftId');
        }
        
        setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
        setSelectedRecord(null);
        mutate(); // Refresh the list
      } catch (error) {
        console.error('Failed to delete record:', error);
        toast.error('Failed to delete record');
      }
    }
  };

  // Auto-save mechanism for sub-components
  const handleAutoSave = async (updatedAssessmentRecords: any[]) => {
    if (!selectedRecord) return; // Guard clause

    // Update local state first
    setAssessmentRecords(updatedAssessmentRecords);

    if (!isEditing && !isAdding) return;

    const signature = (updatedAssessmentRecords || [])
      .map((r: any) =>
        [
          r?.KIND,
          r?.CLASSIFICATION,
          r?.ACTUAL_USE,
          r?.SUB_CLASS,
          r?.AREA,
          r?.UNIT_VALUE,
          r?.MARKET_VAL,
          r?.ASS_LEVEL,
          r?.ASS_VALUE,
          r?.TAXABILITY,
          r?.TAXABLE_RATE,
          r?.IdleLand,
        ].join('|')
      )
      .join('~');

    if (signature === lastAutoSaveSignatureRef.current) return;
    lastAutoSaveSignatureRef.current = signature;
    latestAutoSaveContextRef.current = { record: selectedRecord, assessments: updatedAssessmentRecords };

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      const ctx = latestAutoSaveContextRef.current;
      if (!ctx) return;

      const currentRecord = ctx.record;
      const { id: _, tdn, pin, arp, ...recordData } = currentRecord as any;
      const dataToSave = {
        ...recordData,
        TDN: currentRecord.TDN,
        ARP: currentRecord.TDN,
        PIN: cleanPin(currentRecord.PIN),
        assessments: ctx.assessments,
        status: 'draft'
      };

      try {
        const isUpdate =
          currentRecord.id &&
          !String(currentRecord.id).includes('DUMMY') &&
          !String(currentRecord.id).startsWith('TRANS');

        let targetId = isUpdate ? currentRecord.id : undefined;

        if (!isUpdate && dataToSave.TDN) {
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
                       
        const savedRecord = await saveDraft(dataToSave, targetId);
        toast.success('Changes synced to server', { id: 'autosave-sync' });
      
        const savedId = savedRecord.id || targetId || currentRecord?.id;
        if (savedId) {
          localStorage.setItem('currentDraftId', savedId);
        }
      
        if (savedId && currentRecord.id !== savedId) {
          setSelectedRecord((prev) => {
            if (!prev) return prev;
            if (prev.id !== currentRecord.id) return prev;
            return { ...prev, id: savedId, status: 'draft' } as any;
          });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to sync changes', { id: 'autosave-sync-error' });
      }
    }, 800);
  };

  const checkDuplicatePinTdn = async (pin: string, tdn: string): Promise<string | null> => {
    // Clean PIN before checking
    const cleanedPin = cleanPin(pin);
    
    // Skip check if values are empty
    if (!cleanedPin && !tdn) return null;

    try {
      // 1. Check Supabase (New System) - Primary Validation
      // We check for conflicts in Drafts/For-Review/Approved records in Supabase
      
      // Check PIN in Supabase
      if (cleanedPin) {
        const pinResult = await listFaasRecords({
          searchField: 'PIN',
          filterValue: cleanedPin,
          limit: 1
        });

        const duplicatePin = pinResult.data?.find((r: any) => {
            // If editing an existing Supabase record, ID matches
            if (selectedRecord?.id && r.id === selectedRecord.id) return false;
            // If editing a new transaction (TRANS-...), no Supabase record should match
            return true;
        });

        if (duplicatePin) {
             const duplicateTdn = duplicatePin.tdn || duplicatePin.data?.tdn || duplicatePin.data?.TDN;

             // Allow if the PIN belongs to the parent record (General Revision / Update)
             // This ensures we can reuse the PIN for the new revision of the same property
             if (selectedRecord?.pOldTdn && duplicateTdn === selectedRecord.pOldTdn) {
                 // Valid continuity - The found record is the predecessor of this transaction
             } else {
                 const tdn = duplicateTdn || 'Unknown TDN';
                 return `PIN ${cleanedPin} already exists in a pending/approved record (TDN: ${tdn}, Status: ${duplicatePin.status})`;
             }
         }
      }

      // Check TDN in Supabase
      if (tdn) {
        const tdnResult = await listFaasRecords({
          searchField: 'TDN',
          filterValue: tdn,
          limit: 1
        });

        const duplicateTdn = tdnResult.data?.find((r: any) => {
             if (selectedRecord?.id && r.id === selectedRecord.id) return false;
             // Allow updates if the existing record is a draft
             if (r.status === 'draft') return false;
             return true;
         });
 
         if (duplicateTdn) {
             const ownerName = duplicateTdn.data?.owner || duplicateTdn.data?.owner_name || duplicateTdn.data?.OWNER_NAME || 'Unknown Owner';
             return `TDN already exists in the records under the name: ${ownerName}. Please use a new TDN.`;
         }
      }

      // 2. Legacy Check (RPTMAST) - Disabled/Warning Only
      // As per user request, we only validate against Supabase FAAS_records.
      // Legacy conflicts are allowed for migration purposes.

    } catch (error: any) {
      console.error('Validation check failed:', error);
      return `Validation check failed: ${error.message || 'Network Error'}`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedRecord) return;
    
    // 1. Comprehensive Input Data & Business Rule Validation
    const saveValidation = validateTransactionSave(selectedRecord);
    if (!saveValidation.isValid) {
      toast.error('Validation Error', {
        description: saveValidation.errors[0],
        duration: 5000,
      });
      return;
    }

    // 2. Check duplicates
    const errorMsg = await checkDuplicatePinTdn(selectedRecord.PIN, selectedRecord.TDN);
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
    const toastId = toast.loading('Saving draft...');

    try {
      // Artificial delay to show spinner
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare data for saving
      const isTempId = selectedRecord.id && (selectedRecord.id.startsWith('TRANS') || selectedRecord.id.startsWith('DUMMY') || selectedRecord.id.includes('DUMMY'));
      
      // Clean lowercase keys and ensure TDN/ARP sync
      const { id, tdn, pin, arp, ...recordData } = selectedRecord as any;
      const dataToSave = {
        ...recordData,
        TDN: selectedRecord.TDN,
        ARP: selectedRecord.TDN, // Ensure ARP = TDN as per user request
        PIN: cleanPin(selectedRecord.PIN),
        assessments: assessmentRecords,
        status: 'draft'
      };

      // Pass ID if it's an update to existing record (not a new temp one)
      let targetId = isTempId ? undefined : selectedRecord.id;

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

      const savedRecord = await saveDraft(dataToSave, targetId);
      
      toast.success('Draft saved successfully', { id: toastId });
      
      const savedId = savedRecord.id || targetId || selectedRecord.id;
      localStorage.setItem('currentDraftId', savedId);

      const updatedRecord = {
        ...selectedRecord,
        id: savedId,
        assessments: assessmentRecords, // Explicitly update assessments
        status: 'draft'
      };

      setSelectedRecord(updatedRecord);
      
      // Update the record in the main list (records state)
      setRecords(prev => prev.map(r => r.id === selectedRecord.id ? updatedRecord : r));
      
      // Exit edit mode after successful save
      setIsEditing(false);
      setIsAdding(false);
      localStorage.removeItem('currentDraftId');
    } catch (error: any) {
      // Prioritize the error message from the backend response (AppError)
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || error.message || 'Failed to save draft';
      
      toast.error(errorMessage, {
        id: toastId,
        duration: 5000,
        description: backendMessage ? 'Please check your input.' : 'Server Error'
      });
      console.error('Save Draft Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecord) return;
    
    // 1. Comprehensive Input Data & Business Rule Validation
    const saveValidation = validateTransactionSave(selectedRecord);
    if (!saveValidation.isValid) {
      toast.error('Validation Error', {
        description: saveValidation.errors[0],
        duration: 5000,
      });
      return;
    }

    // 2. Check duplicates
    const errorMsg = await checkDuplicatePinTdn(selectedRecord.PIN, selectedRecord.TDN);
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
      const isTempId = selectedRecord.id && (selectedRecord.id.startsWith('TRANS') || selectedRecord.id.startsWith('DUMMY') || selectedRecord.id.includes('DUMMY'));
      
      // Clean lowercase keys and ensure TDN/ARP sync
      const { id, tdn, pin, arp, ...recordData } = selectedRecord as any;
      const dataToSave = {
        ...recordData,
        TDN: selectedRecord.TDN,
        ARP: selectedRecord.TDN, // Ensure ARP = TDN
        PIN: cleanPin(selectedRecord.PIN),
        assessments: assessmentRecords,
        status: 'for-review'
      };
      
      let recordId = selectedRecord.id;
      
      if (isTempId) {
         let targetId = undefined;
         if (dataToSave.TDN) {
             try {
                const existingDrafts = await listFaasRecords({ searchField: 'TDN', filterValue: dataToSave.TDN, limit: 1 });
                const match = existingDrafts.data?.find((r: any) => r.status === 'draft');
                if (match) targetId = match.id;
             } catch (e) { console.warn(e); }
         }

         const saved = await saveDraft(dataToSave, targetId);
         recordId = saved.id || ''; 
      } else {
         const saved = await saveDraft(dataToSave, recordId);
         recordId = saved.id || recordId;
      }
      
      if (!recordId) throw new Error("Failed to obtain Record ID");
      
      await submitForReview(recordId);
      
      toast.success('Record submitted for review', { id: toastId });
      setSelectedRecord({
        ...selectedRecord,
        id: recordId,
        status: 'for-review'
      });
      setIsAdding(false);
      setIsEditing(false);
    } catch (error: any) {
      // Prioritize the error message from the backend response (AppError)
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || error.message || 'Failed to submit record';
      
      toast.error(errorMessage, {
        id: toastId,
        duration: 5000,
        description: backendMessage ? 'Please check your input.' : 'Server Error'
      });
      console.error('Submit Error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    localStorage.removeItem('currentDraftId');
  };

  const handleRefresh = async () => {
    await mutate();
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

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `FAAS_${selectedRecord?.TDN || 'Record'}`,
  });

  const emptyPrintRef = useRef<HTMLDivElement>(null);
  const handleEmptyPrint = useReactToPrint({
    contentRef: emptyPrintRef,
    documentTitle: 'Empty_Building_FAAS',
  });

  const emptyLandPrintRef = useRef<HTMLDivElement>(null);
  const handleEmptyLandPrint = useReactToPrint({
    contentRef: emptyLandPrintRef,
    documentTitle: 'Empty_Land_FAAS',
  });

  const emptyMachineryPrintRef = useRef<HTMLDivElement>(null);
  const handleEmptyMachineryPrint = useReactToPrint({
    contentRef: emptyMachineryPrintRef,
    documentTitle: 'Empty_Machinery_FAAS',
  });

  const isFormEnabled = isEditing || isAdding;

  return (
    <RptManagementThemeProvider>
    <div className="h-full flex flex-col" data-testid="real-property-data-entry">
      {/* Main Toolbar */}
      <div className="bg-transparent  dark:border-border px-3 py-2">
        <div className="flex flex-col gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-nowrap overflow-x-auto pb-2 pr-2">
            <button
              onClick={handleAdd}
              disabled={isFormEnabled}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-success/10 dark:hover:bg-success/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-success dark:text-success disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              data-testid="btn-add"
            >
              <Plus size={14} />
              Add
            </button>

            {isAdding && (
              <button
                onClick={handlePopulateDummy}
                className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-accent/10 dark:hover:bg-accent/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-accent dark:text-accent h-9 whitespace-nowrap"
                title="Populate Dummy Data"
              >
                <Sparkles size={14} />
                Populate
              </button>
            )}

            <button
              onClick={() => setShowJson(true)}
              disabled={!selectedRecord}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-warning/10 dark:hover:bg-warning/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-warning dark:text-warning disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              title="Show JSON Data"
            >
              <Code size={14} />
              JSON
            </button>

            <button
              onClick={handleEdit}
              disabled={!selectedRecord || isFormEnabled}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-primary/10 dark:hover:bg-primary/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-primary dark:text-primary disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              data-testid="btn-edit"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={!selectedRecord || isFormEnabled}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-danger/10 dark:hover:bg-danger/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-danger dark:text-danger disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              data-testid="btn-delete"
            >
              <Trash2 size={14} />
              Delete
            </button>

            {isFormEnabled && (
              <button
                onClick={handleSave}
                disabled={isSubComponentEditing || isSaving}
                className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-primary/10 dark:hover:bg-primary/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-primary dark:text-primary disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
                data-testid="btn-save-draft"
                title="Save as Draft"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            )}

            {isFormEnabled && (
              <button
                onClick={handleSubmit}
                disabled={isSubComponentEditing || isSaving}
                className="px-3 py-2 text-xs bg-success hover:bg-success/90 text-surface rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
                data-testid="btn-submit"
                title="Submit for Review"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {isSaving ? 'Submitting...' : 'Submit'}
              </button>
            )}

            {selectedRecord && selectedRecord.id && selectedRecord.id.startsWith('TRANS') ? (
              <button
                onClick={handleTransactionCancel}
                disabled={!selectedRecord || isSaving}
                className="px-3 py-2 text-xs bg-danger hover:bg-danger/90 text-surface rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
                data-testid="btn-cancel-transaction"
              >
                <X size={14} />
                Cancel Transaction
              </button>
            ) : isFormEnabled ? (
              <button
                onClick={handleCancel}
                disabled={isSubComponentEditing || isSaving}
                className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
                data-testid="btn-cancel"
              >
                <X size={14} />
                Cancel
              </button>
            ) : null}

            <button
              onClick={handleRefresh}
              disabled={isValidating}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70 h-9 whitespace-nowrap"
              data-testid="btn-refresh"
            >
              <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} />
              {isValidating ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handlePrint}
              disabled={!selectedRecord || selectedRecord.status !== 'approved'}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              data-testid="btn-print"
              title={selectedRecord && selectedRecord.status !== 'approved' ? "Only approved records can be printed" : "Print Record"}
            >
              <Printer size={14} />
              Print
            </button>

            <PrintEmptyFormsDropdown 
              onPrintBuilding={handleEmptyPrint} 
              onPrintLand={handleEmptyLandPrint}
              onPrintMachinery={handleEmptyMachineryPrint}
            />

            <button className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 h-9 whitespace-nowrap">
              <Info size={14} />
              Other Info
            </button>
            {(!isAdding && !isEditing) && (
              <button 
                onClick={handleTransactionClick}
                disabled={!selectedRecord}
                className="px-3 py-2 text-xs bg-primary hover:bg-primary-light text-surface rounded-lg shadow-sm transition-colors flex items-center gap-1.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              >
                <FileText size={14} />
                Transaction
              </button>
            )}
            <button className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-accent/10 dark:hover:bg-accent/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-accent dark:text-accent h-9 whitespace-nowrap">
              <DollarSign size={14} />
              Payment Inq.
            </button>
            <div className="shrink-0">
              <RptManagementThemeToggle />
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto p-4 space-y-4 ${activeTab === 'property-info' ? 'no-scrollbar' : ''}`}>
        {/* Records Grid */}
        {!isFormEnabled && (
        <div className="bg-surface dark:bg-surface rounded-xl shadow-sm border border-border dark:border-border overflow-hidden flex flex-col">
          <div 
            className="overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
            style={{ height: `${tableHeight}px`, maxHeight: '80vh' }}
          >
            <table className="w-full text-xs" data-testid="records-table">
              <thead
                className="text-surface sticky top-0 z-10"
                style={{
                  backgroundColor: 'var(--color-primary)',
                }}
              >
                <tr className="text-surface">
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">TDN</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">OLD TDN</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">ARP</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[200px]">PIN</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[150px]">STATUS</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide min-w-[250px]">OWNER</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[120px]">TAX BEG YR</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[100px]">CITY CODE</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[100px]">BRGY CODE</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide min-w-[150px]">BARANGAY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={10} className="px-3 py-2">
                         <div className="h-4 bg-muted/20 dark:bg-muted/20 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  records.map((record, index) => {
                    const statusDateText = getStatusDateText(record);

                    return (
                      <tr
                        key={record.id}
                        onClick={() => handleRowSelect(record)}
                        className={`cursor-pointer transition-colors ${
                          selectedRecord?.id === record.id
                            ? 'bg-emerald-100 dark:bg-emerald-900/20 border-l-4 border-l-emerald-600 dark:border-l-emerald-400'
                            : index % 2 === 0
                            ? 'bg-background dark:bg-background/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                            : 'bg-surface dark:bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                        }`}
                        data-testid={`record-row-${record.id}`}
                      >
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap">{record.TDN}</td>
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap">{record.pOldTdn || ''}</td>
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap">{record.TDN}</td>
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap">{cleanPin(record.PIN)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClassName(record.status)}`}
                          >
                            <span>{record.status || 'N/A'}</span>
                            {statusDateText ? <span className="opacity-80">• {statusDateText}</span> : null}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-foreground dark:text-foreground whitespace-nowrap truncate max-w-xs">{record.owner}</td>
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap text-center">{getDisplayTaxBegYear(record) || 'N/A'}</td>
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap text-center">{record.cityCode}</td>
                        <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap text-center">{record.barangayCode}</td>
                        <td className="px-3 py-2 text-muted dark:text-muted whitespace-nowrap truncate max-w-xs">{record.barangay}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Resize Handle */}
          <div
            className={`w-full h-5 bg-background dark:bg-background cursor-row-resize flex items-center justify-center hover:bg-muted/10 dark:hover:bg-muted/20 transition-colors select-none ${isResizing ? 'bg-primary/10 dark:bg-primary/20' : ''}`}
            onMouseDown={startResizing}
          >
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium">
                {Math.max(1, Math.floor((tableHeight - HEADER_HEIGHT) / ROW_HEIGHT))} Rows
              </span>
              <GripHorizontal size={14} />
            </div>
          </div>
          
          {/* Pagination */}
          <div className="p-2 bg-background dark:bg-background/50">
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

          {/* Search and Filter Section */}
          {!isFormEnabled && (
          <div className="bg-surface dark:bg-surface rounded-xl shadow-sm border border-border dark:border-border p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Field */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <label className="text-xs font-medium text-muted dark:text-muted whitespace-nowrap">
                  Search Field:
                </label>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="search-field"
                >
                  <option value="TDN">TDN</option>
                  <option value="pOldTdn">OLD TDN</option>
                  <option value="ARP">ARP</option>
                  <option value="PIN">PIN</option>
                  <option value="OWNER">OWNER</option>
                  <option value="TAX_BEG_YR">TAX BEG YR</option>
                </select>
              </div>

              {/* Filter Value */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <label className="text-xs font-medium text-muted dark:text-muted whitespace-nowrap">
                  Filter Value:
                </label>
                <div className="flex-1 flex gap-2">
                  {searchField === 'TAX_BEG_YR' ? (
                    <select
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      onKeyDown={handleFilterKeyDown}
                      className={`flex-1 px-3 py-2 text-xs bg-background dark:bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        appliedFilter.value !== '%' && appliedFilter.value === filterValue
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-border dark:border-border'
                      }`}
                      data-testid="filter-value-dropdown"
                    >
                      <option value="%">All Years</option>
                      {taxBegYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      onKeyDown={handleFilterKeyDown}
                      className={`flex-1 px-3 py-2 text-xs bg-background dark:bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        appliedFilter.value !== '%' && appliedFilter.value === filterValue
                          ? 'border-primary bg-primary/10 dark:bg-primary/20'
                          : 'border-border dark:border-border'
                      }`}
                      data-testid="filter-value"
                      placeholder={
                        searchField === 'TDN' ? 'Enter TDN...' : 
                        searchField === 'pOldTdn' ? 'Enter OLD TDN...' :
                        searchField === 'ARP' ? 'Enter ARP...' :
                        `Enter ${searchField}...`
                      }
                    />
                  )}
                  <button 
                    onClick={handleApplyFilter}
                    disabled={isLoading}
                    className="px-4 py-2 text-xs bg-primary hover:bg-primary-light text-surface rounded-lg font-medium transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? <RefreshCw size={12} className="animate-spin" /> : null}
                    APPLY FILTER
                  </button>
                </div>
              </div>

              {/* Additional Search */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <label className="text-xs font-medium text-muted dark:text-muted whitespace-nowrap">
                  Additional Search:
                </label>
                <select
                  value={additionalSearch}
                  onChange={(e) => setAdditionalSearch(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="additional-search"
                >
                  <option value="All Records">All Records</option>
                  <option value="Active">Active Records</option>
                  <option value="Cancelled">Cancelled Records</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                <label className="text-xs font-medium text-muted dark:text-muted whitespace-nowrap">
                  Search:
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Enter search text..."
                  className="flex-1 px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="search-text"
                />
                <button className="px-3 py-2 text-xs bg-muted hover:bg-muted text-surface rounded-lg font-medium transition-colors whitespace-nowrap">
                  SEARCH BY OWNER INDEX
                </button>
              </div>
            </div>
          </div>
          )}

        {/* Property Details View */}
        <PropertyDetailsView 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isFormEnabled={isFormEnabled}
          selectedRecord={selectedRecord}
          assessmentRecords={assessmentRecords}
          isAssessmentLoading={isAssessmentLoading}
          onRecordUpdate={handleRecordUpdate}
          onAssessmentUpdate={handleAutoSave}
          onEditModeChange={setIsSubComponentEditing}
          isAdding={isAdding}
          onSave={handleSave}
          onCancel={handleCancel}
        />
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
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center text-primary dark:text-primary group-hover:bg-primary/30 dark:group-hover:bg-primary/50 transition-colors">
                <FileText size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">General Revision (GR)</div>
                <div className="text-xs text-muted dark:text-muted">Mass update of property assessments</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('REV')}
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-warning/20 dark:bg-orange-900/30 flex items-center justify-center text-warning dark:text-warning group-hover:bg-warning/30 dark:group-hover:bg-orange-900/50 transition-colors">
                <RefreshCw size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">Revision (REV)</div>
                <div className="text-xs text-muted dark:text-muted">Specific updates or corrections</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('MIGRATE')}
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-accent/20 dark:bg-purple-900/30 flex items-center justify-center text-accent dark:text-accent group-hover:bg-accent/30 dark:group-hover:bg-purple-900/50 transition-colors">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">Migrate (MIGRATE)</div>
                <div className="text-xs text-muted dark:text-muted">Import or transfer legacy data</div>
              </div>
            </button>

            <div className="border-t border-border dark:border-border my-2"></div>

            <button
              onClick={() => handleTransactionSelect('CN')}
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-danger/20 dark:bg-red-900/30 flex items-center justify-center text-danger dark:text-danger group-hover:bg-danger/30 dark:group-hover:bg-red-900/50 transition-colors">
                <X size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">Cancellation (CN)</div>
                <div className="text-xs text-muted dark:text-muted">Cancel existing assessment</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('CS')}
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-success/20 dark:bg-green-900/30 flex items-center justify-center text-success dark:text-success group-hover:bg-success/30 dark:group-hover:bg-green-900/50 transition-colors">
                <Building2 size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">Consolidation (CS)</div>
                <div className="text-xs text-muted dark:text-muted">Combine multiple properties</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('SD')}
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-warning/20 dark:bg-yellow-900/30 flex items-center justify-center text-warning dark:text-warning group-hover:bg-warning/30 dark:group-hover:bg-yellow-900/50 transition-colors">
                <GripHorizontal size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">Subdivision (SD)</div>
                <div className="text-xs text-muted dark:text-muted">Split property into multiple lots</div>
              </div>
            </button>

            <button
              onClick={() => handleTransactionSelect('CS-SD')}
              className="p-4 text-left border rounded-lg hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-info/20 dark:bg-indigo-900/30 flex items-center justify-center text-info dark:text-info group-hover:bg-info/30 dark:group-hover:bg-indigo-900/50 transition-colors">
                <RefreshCw size={20} />
              </div>
              <div>
                <div className="font-semibold text-foreground dark:text-surface">Consolidation and Subdivision (CS-SD)</div>
                <div className="text-xs text-muted dark:text-muted">Complex split and merge operation</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* JSON Viewer Modal */}
      <Dialog open={showJson} onOpenChange={setShowJson}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" aria-describedby={ undefined }>
          <DialogHeader>
            <DialogTitle>Form Data (JSON)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-foreground p-4 rounded-lg text-xs font-mono text-success">
            <pre>
              {JSON.stringify({
                ...selectedRecord,
                assessments: assessmentRecords.map(ass => ({
                  ...ass,
                  // Include trees/adjustments/structures if they exist
                  // This relies on the child components updating the object references in this array
                }))
              }, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Document */}
      <div className="hidden print:block">
        <div ref={printRef}>
          {selectedRecord && (
            assessmentRecords.some(ass => ass.KIND === 'B' || ass.KIND === 'Building') ? (
              <PrintBuildingDocument
                propertyInfo={{
                  ownerName: selectedRecord.owner || '',
                  ownerAddress: selectedRecord.Owner_Address || '',
                  ownerTin: selectedRecord.Owner_TIN || '',
                  ownerTel: selectedRecord.Owner_Tel_no || '',
                  adminName: (selectedRecord as any).ADMIN_NAME || selectedRecord.ADMIN_NO || '',
                adminAddress: selectedRecord.ADMIN_ADDRESS || '',
                adminTin: selectedRecord.ADMIN_TIN || '',
                adminTel: selectedRecord.ADMIN_TEL || '',
                pin: selectedRecord.PIN || selectedRecord.pPin || '',
                tdNo: selectedRecord.TDN || selectedRecord.pNewTdn || '',
                arpNo: selectedRecord.ARP || '',
                transactionCode: selectedRecord.TRANS_CD || 'GR',
                octTctNo: selectedRecord.CER_TIT_NO || '',
                octTctDate: selectedRecord.TCT_DATE || '',
                cadLotNo: selectedRecord.CAD_LOT_NO || '',
                lotNo: selectedRecord.LOTE_NO || '',
                cloaCscNo: selectedRecord.CLOA_NO || '',
                cloaDate: selectedRecord.CLOA_DATE || '',
                surveyNo: selectedRecord.ASS_LOT_NO || '',
                blockNo: selectedRecord.BLOCK_NO || '',
                location: {
                  street: selectedRecord.STREET || '',
                  barangay: selectedRecord.barangay || '',
                  municipality: (selectedRecord as any).CITY || (selectedRecord.cityCode === '053' ? 'Tubay' : selectedRecord.cityCode) || 'Tubay',
                  province: (selectedRecord as any).PROV || 'Agusan del Norte',
                },
                  backPart: {
                    taxable: selectedRecord.taxable || false,
                    exempt: selectedRecord.exempt || false,
                    effQtr: selectedRecord.effQtr || '',
                    effYear: selectedRecord.effYear || '',
                    memoranda: selectedRecord.memoranda || selectedRecord.REM || '',
                    superseded: {
                      pin: selectedRecord.pPin || '',
                      tdNo: selectedRecord.pOldTdn || '',
                      landValue: selectedRecord.pAssValueLand || 0,
                      impvtValue: selectedRecord.pAssValueImpvt || 0,
                      totalValue: selectedRecord.pAssValueTotal || 0,
                      previousOwner: selectedRecord.pOwner || '',
                      effectivity: selectedRecord.pEffDate || '',
                      arPageNo: selectedRecord.pArPageNo || '',
                      recordingPersonnel: selectedRecord.pRecordingPersonnel || '',
                    },
                    signatories: {
                      appraiser: selectedRecord.appraisedBy || '',
                      appraiserDate: selectedRecord.appraisedDate || '',
                      recommending: selectedRecord.recApproval || '',
                      recommendingDate: selectedRecord.recAppDate || '',
                      approver: selectedRecord.approved || '',
                      approverDate: selectedRecord.approvedDate || '',
                    },
                  },
                  effectivityDate: selectedRecord.pEffDate || '',
                  declarationDate: selectedRecord.approvedDate || '',
                }}
                bldgStruc={bldgStruc}
                bldgAdj={bldgAdj}
                assessmentRows={assessmentRecords.map((ass, idx) => ({
                  id: ass.id || ass.uniqueId || `ass-${selectedRecord.id || selectedRecord.TDN || 'rec'}-${idx}`,
                  kind: ass.KIND || '',
                  class: ass.CLASSIFICATION || '',
                  actualUse: ass.ACTUAL_USE || '',
                  subClass: ass.SUB_CLASS || '',
                  area: (ass.AREA || 0).toString(),
                  unitValue: (ass.UNIT_VALUE || 0).toString(),
                  baseMarketValue: (ass.MARKET_VAL || 0).toString(),
                  adjustedMarketValue: (ass.MARKET_VAL || 0).toString(),
                  assessmentLevel: (ass.ASS_LEVEL || 0).toString(),
                  assessedValue: (ass.ASS_VALUE || 0).toString(),
                  taxability: ass.TAXABILITY || 'Taxable',
                }))}
                summary={{
                  totalArea: assessmentRecords.reduce((acc, curr) => acc + (curr.AREA || 0), 0),
                  totalAdjustedMarketValue: assessmentRecords.reduce((acc, curr) => acc + ((curr as any).ADJ_MARKET_VAL || curr.MARKET_VAL || 0), 0),
                  totalAssessedValue: assessmentRecords.reduce((acc, curr) => acc + (curr.ASS_VALUE || 0), 0),
                }}
              />
            ) : (
            <PrintDocument
              propertyInfo={{
                ownerName: selectedRecord.owner || '',
                ownerAddress: selectedRecord.Owner_Address || '',
                ownerTin: selectedRecord.Owner_TIN || '',
                ownerTel: selectedRecord.Owner_Tel_no || '',
                adminName: (selectedRecord as any).ADMIN_NAME || selectedRecord.ADMIN_NO || '',
                adminAddress: selectedRecord.ADMIN_ADDRESS || '',
                adminTin: selectedRecord.ADMIN_TIN || '',
                adminTel: selectedRecord.ADMIN_TEL || '',
                pin: selectedRecord.PIN || selectedRecord.pPin || '',
                tdNo: selectedRecord.TDN || selectedRecord.pNewTdn || '',
                arpNo: selectedRecord.ARP || '',
                transactionCode: selectedRecord.TRANS_CD || 'GR',
                octTctNo: selectedRecord.CER_TIT_NO || '',
                octTctDate: selectedRecord.TCT_DATE || '',
                cadLotNo: selectedRecord.CAD_LOT_NO || '',
                lotNo: selectedRecord.LOTE_NO || '',
                cloaCscNo: selectedRecord.CLOA_NO || '',
                cloaDate: selectedRecord.CLOA_DATE || '',
                surveyNo: selectedRecord.ASS_LOT_NO || '',
                blockNo: selectedRecord.BLOCK_NO || '',
                location: {
                  street: selectedRecord.STREET || '',
                  barangay: selectedRecord.barangay || '',
                  municipality: (selectedRecord as any).CITY || (selectedRecord.cityCode === '053' ? 'Tubay' : selectedRecord.cityCode) || 'Tubay',
                  province: (selectedRecord as any).PROV || 'Agusan del Norte',
                },
                boundaries: {
                  north: selectedRecord.NORTH || '',
                  east: selectedRecord.EAST || '',
                  south: selectedRecord.SOUTH || '',
                  west: selectedRecord.WEST || '',
                },
                backPart: {
                  taxable: selectedRecord.taxable || false,
                  exempt: selectedRecord.exempt || false,
                  effQtr: selectedRecord.effQtr || '',
                  effYear: selectedRecord.effYear || '',
                  memoranda: selectedRecord.memoranda || selectedRecord.REM || '',
                  superseded: {
                    pin: selectedRecord.pPin || '',
                    tdNo: selectedRecord.pOldTdn || '',
                    landValue: selectedRecord.pAssValueLand || 0,
                    impvtValue: selectedRecord.pAssValueImpvt || 0,
                    totalValue: selectedRecord.pAssValueTotal || 0,
                    previousOwner: selectedRecord.pOwner || '',
                    effectivity: selectedRecord.pEffDate || '',
                    arPageNo: selectedRecord.pArPageNo || '',
                    recordingPersonnel: selectedRecord.pRecordingPersonnel || '',
                  },
                  signatories: {
                    appraiser: selectedRecord.appraisedBy || '',
                    appraiserDate: selectedRecord.appraisedDate || '',
                    recommending: selectedRecord.recApproval || '',
                    recommendingDate: selectedRecord.recAppDate || '',
                    approver: selectedRecord.approved || '',
                    approverDate: selectedRecord.approvedDate || '',
                  },
                },
                effectivityDate: selectedRecord.pEffDate || '',
                declarationDate: selectedRecord.approvedDate || '',
              }}
              assessmentRows={assessmentRecords.map((ass, idx) => ({
                id: ass.id || ass.uniqueId || `ass-${selectedRecord.id || selectedRecord.TDN || 'rec'}-${idx}`,
                kind: ass.KIND || '',
                class: ass.CLASSIFICATION || '',
                actualUse: ass.ACTUAL_USE || '',
                subClass: ass.SUB_CLASS || '',
                area: (ass.AREA || 0).toString(),
                unitValue: (ass.UNIT_VALUE || 0).toString(),
                baseMarketValue: (ass.MARKET_VAL || 0).toString(),
                adjustedMarketValue: (ass.MARKET_VAL || 0).toString(),
                assessmentLevel: (ass.ASS_LEVEL || 0).toString(),
                assessedValue: (ass.ASS_VALUE || 0).toString(),
                taxability: ass.TAXABILITY || 'Taxable',
              }))}
              improvementRows={[
                ...(selectedRecord.trees || []),
                ...assessmentRecords.flatMap(ass => ass.trees || [])
              ].map((tree: any, idx) => {
                // Map from either internal UI format or raw database format
                const kind = tree.name || tree.Prod_Code || '';
                const subClass = tree.class || '';
                const unitValue = tree.unitPrice || tree.Unit_Price || 0;
                const baseMarketValue = tree.totalValue || tree.Market_Value || 0;
                
                let nfb = '0';
                let fb = '0';
                
                if (tree.type === 'NFB') {
                  nfb = (tree.quantity || 0).toString();
                } else if (tree.type === 'FB') {
                  fb = (tree.quantity || 0).toString();
                } else {
                  // Fallback to raw database fields
                  if (tree.Non_FB > 0) nfb = tree.Non_FB.toString();
                  if (tree.Tot_FB > 0) fb = (tree.Tot_FB || tree.FB || 0).toString();
                }

                return {
                  id: tree.id || `tree-${idx}-${Math.random()}`,
                  kind,
                  subClass,
                  nonFruitBearing: nfb,
                  fruitBearing: fb,
                  unitValue: unitValue.toString(),
                  baseMarketValue: baseMarketValue.toString(),
                };
              })}
              valueAdjustmentRows={assessmentRecords.filter(ass => (ass as any).ADJ_FACTOR).map((ass, idx) => ({
                id: `adj-${ass.id || ass.uniqueId || `${selectedRecord.id || selectedRecord.TDN || 'rec'}-${idx}`}`,
                baseMarketValue: ass.MARKET_VAL || 0,
                adjustmentFactor: (ass as any).ADJ_FACTOR || '',
                percentAdjustment: (ass as any).PERC_ADJ || '0%',
                valueAdjustment: (ass as any).VAL_ADJ || 0,
                marketValue: (ass as any).ADJ_MARKET_VAL || ass.MARKET_VAL || 0,
              }))}
              propertyAssessmentRows={assessmentRecords.map((ass, idx) => ({
                id: `ass-${ass.id || ass.uniqueId || `${selectedRecord.id || selectedRecord.TDN || 'rec'}-${idx}`}`,
                actualUse: ass.ACTUAL_USE || '',
                adjustedMarketValue: (ass as any).ADJ_MARKET_VAL || ass.MARKET_VAL || 0,
                assessmentLevel: (ass.ASS_LEVEL || 0).toString() + '%',
                assessedValue: ass.ASS_VALUE || 0,
              }))}
              summary={{
                totalArea: assessmentRecords.reduce((acc, curr) => acc + (curr.AREA || 0), 0),
                totalAdjustedMarketValue: assessmentRecords.reduce((acc, curr) => acc + ((curr as any).ADJ_MARKET_VAL || curr.MARKET_VAL || 0), 0),
                totalAssessedValue: assessmentRecords.reduce((acc, curr) => acc + (curr.ASS_VALUE || 0), 0),
              }}
            />
          ))}
        </div>

        {/* Empty Building Document for "Empty Bldg" print */}
        <div ref={emptyPrintRef}>
          <PrintBuildingDocument
            propertyInfo={{
              ownerName: '',
              ownerAddress: '',
              ownerTin: '',
              ownerTel: '',
              adminName: '',
              adminAddress: '',
              adminTin: '',
              adminTel: '',
              pin: '',
              tdNo: '',
              arpNo: '',
              transactionCode: '',
              octTctNo: '',
              octTctDate: '',
              cadLotNo: '',
              lotNo: '',
              cloaCscNo: '',
              cloaDate: '',
              surveyNo: '',
              blockNo: '',
              location: {
                street: '',
                barangay: '',
                municipality: '',
                province: '',
              },
              backPart: {
                taxable: false,
                exempt: false,
                effQtr: '',
                effYear: '',
                memoranda: '',
                superseded: {
                  pin: '',
                  tdNo: '',
                  landValue: 0,
                  impvtValue: 0,
                  totalValue: 0,
                  previousOwner: '',
                  effectivity: '',
                  arPageNo: '',
                  recordingPersonnel: '',
                },
                signatories: {
                  appraiser: '',
                  appraiserDate: '',
                  recommending: 'FELIX S. BALANSAG, JR.',
                  recommendingDate: '',
                  approver: 'JUNIE P. VINATERO, REA',
                  approverDate: '',
                },
              },
              effectivityDate: '',
              declarationDate: '',
            }}
            bldgStruc={[]}
            bldgAdj={[]}
            assessmentRows={[]}
            summary={{
              totalArea: 0,
              totalAdjustedMarketValue: 0,
              totalAssessedValue: 0,
            }}
          />
        </div>

        {/* Empty Land Document */}
        <div ref={emptyLandPrintRef}>
          <PrintDocument
            propertyInfo={{
              ownerName: '',
              ownerAddress: '',
              ownerTin: '',
              ownerTel: '',
              adminName: '',
              adminAddress: '',
              adminTin: '',
              adminTel: '',
              pin: '',
              tdNo: '',
              arpNo: '',
              transactionCode: '',
              octTctNo: '',
              octTctDate: '',
              cadLotNo: '',
              lotNo: '',
              cloaCscNo: '',
              cloaDate: '',
              surveyNo: '',
              blockNo: '',
              location: {
                street: '',
                barangay: '',
                municipality: '',
                province: '',
              },
              boundaries: {
                north: '',
                east: '',
                south: '',
                west: '',
              },
              backPart: {
                taxable: false,
                exempt: false,
                effQtr: '',
                effYear: '',
                memoranda: '',
                superseded: {
                  pin: '',
                  tdNo: '',
                  landValue: 0,
                  impvtValue: 0,
                  totalValue: 0,
                  previousOwner: '',
                  effectivity: '',
                  arPageNo: '',
                  recordingPersonnel: '',
                },
                signatories: {
                  appraiser: '',
                  appraiserDate: '',
                  recommending: 'FELIX S. BALANSAG, JR.',
                  recommendingDate: '',
                  approver: 'JUNIE P. VINATERO, REA',
                  approverDate: '',
                },
              },
              effectivityDate: '',
              declarationDate: '',
            }}
            assessmentRows={[]}
            summary={{
              totalArea: 0,
              totalAdjustedMarketValue: 0,
              totalAssessedValue: 0,
            }}
            reportTitle="LAND & OTHER IMPROVEMENTS"
          />
        </div>

        {/* Empty Machinery Document */}
        <div ref={emptyMachineryPrintRef}>
          <PrintDocument
            propertyInfo={{
              ownerName: '',
              ownerAddress: '',
              ownerTin: '',
              ownerTel: '',
              adminName: '',
              adminAddress: '',
              adminTin: '',
              adminTel: '',
              pin: '',
              tdNo: '',
              arpNo: '',
              transactionCode: '',
              octTctNo: '',
              octTctDate: '',
              cadLotNo: '',
              lotNo: '',
              cloaCscNo: '',
              cloaDate: '',
              surveyNo: '',
              blockNo: '',
              location: {
                street: '',
                barangay: '',
                municipality: '',
                province: '',
              },
              boundaries: {
                north: '',
                east: '',
                south: '',
                west: '',
              },
              backPart: {
                taxable: false,
                exempt: false,
                effQtr: '',
                effYear: '',
                memoranda: '',
                superseded: {
                  pin: '',
                  tdNo: '',
                  landValue: 0,
                  impvtValue: 0,
                  totalValue: 0,
                  previousOwner: '',
                  effectivity: '',
                  arPageNo: '',
                  recordingPersonnel: '',
                },
                signatories: {
                  appraiser: '',
                  appraiserDate: '',
                  recommending: 'FELIX S. BALANSAG, JR.',
                  recommendingDate: '',
                  approver: 'JUNIE P. VINATERO, REA',
                  approverDate: '',
                },
              },
              effectivityDate: '',
              declarationDate: '',
            }}
            assessmentRows={[]}
            summary={{
              totalArea: 0,
              totalAdjustedMarketValue: 0,
              totalAssessedValue: 0,
            }}
            reportTitle="MACHINERY ASSESSMENT"
          />
        </div>
      </div>
    </div>
    </RptManagementThemeProvider>
  );
};

export default RealPropertyDataEntry;
