import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, RefreshCw, Printer,
  FileText, Building2,
  User, Info, DollarSign, GripHorizontal, Sparkles, Code, Loader2
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { dummyPropertyRecord, dummyAssessmentRecords } from './dummyData';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { cleanPin } from '../utils';
import { getRptMastDataDirect } from '@/modules/rptas/shared/services/rptMastService';
import { getRptAssByTdn, RptAssRecord } from '@/modules/rptas/shared/services/rptAssService';
import PropertyInformationSection from './PropertyInformationSection';
import PropertyOwnerSection from './PropertyOwnerSection';
import PropertyBoundariesSection from './PropertyBoundariesSection';
import AssessmentSection from './AssessmentSection';
import ReferenceSection from './ReferenceSection';
import SignatoriesSection from './SignatoriesSection';
import PreviousTDNsSection from './PreviousTDNsSection';
import TaxDecSheetSection from './TaxDecSheetSection';
import OtherPropertyTab from '../OtherPropertyTab';
import PrintDocument from '../PrintDocument';
import { toast } from 'sonner';
import { DataTablePagination } from '@/modules/rptas/ui/data-table-pagination';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/modules/rptas/ui/dialog';
import { saveDraft, submitForReview, listFaasRecords, getDistinctTaxBegYears } from '@/modules/rptas/shared/services/faasService';
import { validateTransactionStart, validateTransactionSave } from '@/modules/rptas/shared/services/transactionValidation';
import { useIdempotency } from '@/modules/rptas/hooks/useIdempotency';
import { useMigrationCart } from '@/modules/rptas/context/MigrationCartContext';
import MigrationCartIndicator from '@/modules/rptas/domains/migration/MigrationCartIndicator';
import { Database } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchActualUseOrdinances } from '@/modules/rptas/domains/RPT-management/queries/actualUseOrdinancesQuery';
import { getClassifications } from '@/modules/rptas/shared/services/classificationService';
import { getCustomMainClasses } from '@/modules/rptas/shared/services/mainClassCustomService';
import { getCities } from '@/modules/rptas/shared/services/cityService';
import { getBarangays } from '@/modules/rptas/shared/services/barangayService';
import { getTreeLibrary } from '@/modules/rptas/shared/services/rptTreeService';
import { getBuildingTypes } from '@/modules/rptas/shared/services/buildingService';
import { getMunicipalities } from '@/services/landTaxService';

// Types
export interface PropertyRecord {
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
  status?: 'draft' | 'for-review' | 'approved' | 'pending-municipal' | 'pending-provincial' | 'rejected' | string;
  municipalApprover?: string;
  municipalApprovalDate?: string;
  provincialApprover?: string;
  provincialApprovalDate?: string;
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
  TAX_BEG_YR?: string;
} // Add new field for display


interface RealPropertyDataEntryProps {
  dataSource?: 'mssql' | 'supabase';
}

const RealPropertyDataEntry: React.FC<RealPropertyDataEntryProps> = ({ dataSource = 'mssql' }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  const { addToCart, removeFromCart, isInCart } = useMigrationCart();

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

    const derived = deriveTaxBegYearFromTdn(record?.TDN || record?.tdn);
    if (derived) return derived;

    return String(record?.TAX_BEG_YR || '');
  };

  const getApprovedDate = (record: any): string | null => {
    return record?.approvedDate || record?.ApprovedDate || null;
  };

  const getRecommendedDate = (record: any): string | null => {
    return record?.recAppDate || record?.Rec_AppDate || record?.municipal_approval_date || null;
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
      return formatShortDate(getApprovedDate(record)) || formatShortDate(record?.updatedAt || record?.createdAt);
    }

    if (status === 'pending-provincial') {
      return formatShortDate(getRecommendedDate(record)) || formatShortDate(record?.updatedAt || record?.createdAt);
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
  
  // Records state
  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<PropertyRecord | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, totalPages: 1 });
  const [assessmentRecords, setAssessmentRecords] = useState<RptAssRecord[]>([]);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
  const [isPrefetchingData, setIsPrefetchingData] = useState(false);

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
  
  // Tax Beg Years dropdown state
  const [taxBegYears, setTaxBegYears] = useState<string[]>([]);

  // Sub-component editing state
  const [isSubComponentEditing, setIsSubComponentEditing] = useState(false);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionSource, setTransactionSource] = useState<{ record: PropertyRecord; assessments: RptAssRecord[] } | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const PERSISTENCE_KEY = 'rpt_data_entry_state';

  // Idempotency Hook
  const { idempotencyKey, refreshKey } = useIdempotency();
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastAutoSaveSignatureRef = useRef('');
  const latestAutoSaveContextRef = useRef<{ record: PropertyRecord; assessments: any[] } | null>(null);
  const lastFetchedAssessmentTdnRef = useRef<string>('');
  const assessmentFetchInFlightRef = useRef<{ tdn: string } | null>(null);
  const persistenceTimerRef = useRef<number | null>(null);
  const lastAutoSaveToastAtRef = useRef<number>(0);
  const lastAutoSaveErrorToastAtRef = useRef<number>(0);
  const lastPrefetchedTdnRef = useRef<string>('');
  const prefetchInFlightRef = useRef<{ tdn: string } | null>(null);
  const queryClient = useQueryClient();
  const pendingRestoreRef = useRef<{ id?: string; tdn?: string; pin?: string } | null>(null);

  const resolveTdn = useCallback((record: PropertyRecord | null | undefined) => {
    return String(record?.tdn || record?.TDN || '').trim();
  }, []);

  const prefetchForRecord = useCallback(
    async (record: PropertyRecord) => {
      const tdn = resolveTdn(record);
      if (!tdn) return;
      if (prefetchInFlightRef.current?.tdn === tdn) return;
      if (lastPrefetchedTdnRef.current === tdn) return;

      prefetchInFlightRef.current = { tdn };
      setIsPrefetchingData(true);

      const isMockMode =
        typeof window !== 'undefined' &&
        typeof window.localStorage?.getItem === 'function' &&
        window.localStorage.getItem('auth_mode') === 'mock';
      const hasApiKey = Boolean(import.meta.env.VITE_API_ACCESS_KEY);

      const cityCode = String(record.cityCode || '').trim();

      try {
        const tasks: Promise<unknown>[] = [];
        if (!isMockMode && hasApiKey) {
          tasks.push(prefetchActualUseOrdinances(queryClient));
        }

        tasks.push(getClassifications());
        tasks.push(getCustomMainClasses());
        tasks.push(getTreeLibrary());
        tasks.push(getBuildingTypes());
        tasks.push(getMunicipalities());

        tasks.push(getCities());
        if (cityCode) {
          tasks.push(getBarangays(1, 100, undefined, cityCode));
        }

        await Promise.allSettled(tasks);
        lastPrefetchedTdnRef.current = tdn;
      } finally {
        prefetchInFlightRef.current = null;
        setIsPrefetchingData(false);
      }
    },
    [queryClient, resolveTdn]
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (persistenceTimerRef.current) {
        window.clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = null;
      }
    };
  }, []);

  // Restore state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(PERSISTENCE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        if (parsedState?.v === 2) {
          pendingRestoreRef.current = {
            id: typeof parsedState.id === 'string' ? parsedState.id : undefined,
            tdn: typeof parsedState.tdn === 'string' ? parsedState.tdn : undefined,
            pin: typeof parsedState.pin === 'string' ? parsedState.pin : undefined,
          };
        } else if (parsedState?.record) {
          const record = parsedState.record as PropertyRecord;
          const tdn = resolveTdn(record);
          const pin = cleanPin((record as any)?.pin || (record as any)?.PIN || '');
          const id = typeof (record as any)?.id === 'string' ? String((record as any).id).trim() : '';
          pendingRestoreRef.current = { id: id || undefined, tdn: tdn || undefined, pin: pin || undefined };
          localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({ v: 2, id: id || undefined, tdn: tdn || undefined, pin: pin || undefined }));
        }
      } catch (e) {
        console.error('Failed to restore state', e);
      }
    }
    setIsRestored(true);
  }, [resolveTdn]);

  // Save state on change
  useEffect(() => {
    if (!isRestored) return;

    if (selectedRecord) {
      if (persistenceTimerRef.current) {
        window.clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = null;
      }
      persistenceTimerRef.current = window.setTimeout(() => {
        const tdn = resolveTdn(selectedRecord);
        const pin = cleanPin((selectedRecord as any)?.pin || (selectedRecord as any)?.PIN || '');
        localStorage.setItem(
          PERSISTENCE_KEY,
          JSON.stringify({
            v: 2,
            id: selectedRecord.id,
            tdn,
            pin,
          })
        );
      }, 400);
    } else {
      if (persistenceTimerRef.current) {
        window.clearTimeout(persistenceTimerRef.current);
        persistenceTimerRef.current = null;
      }
      localStorage.removeItem(PERSISTENCE_KEY);
    }
  }, [selectedRecord, isRestored, resolveTdn]);

  useEffect(() => {
    if (!isRestored) return;
    if (selectedRecord) return;
    const pending = pendingRestoreRef.current;
    if (!pending) return;

    const match = records.find((r) => {
      if (pending.id && r.id === pending.id) return true;
      const tdn = resolveTdn(r);
      if (!pending.tdn || tdn !== pending.tdn) return false;
      if (!pending.pin) return true;
      const pin = cleanPin((r as any)?.pin || (r as any)?.PIN || '');
      return pin === pending.pin;
    });

    if (match) {
      setSelectedRecord(match);
    }
    pendingRestoreRef.current = null;
  }, [isRestored, records, resolveTdn, selectedRecord]);

  // ... (previous state declarations)

  const handleTransactionClick = () => {
    setShowTransactionModal(true);
  };

  const handleTransactionSelect = (type: string) => {
    if (!selectedRecord) {
      toast.error('Please select a property first.', { id: 'select-property-error' });
      return;
    }

    const eff = String(selectedRecord.EFF_DATE || selectedRecord.pEffDate || '').split('T')[0];
    const nextTaxBegYear = eff && eff.includes('-') ? eff.split('-')[0] : String(selectedRecord.TAX_BEG_YR || '').trim();

    setTransactionSource({ record: selectedRecord, assessments: assessmentRecords });
    refreshKey(); // New transaction, new key

    // Create a new record based on the selected one
    // This initiates a new transaction workflow
    const newRecord: PropertyRecord = {
      ...selectedRecord,
      // Generate a temporary ID for the transaction
      id: `TRANS-${type}-${Date.now()}`,
      
      // We don't clear the entire TDN anymore, we just let PropertyInformationSection
      // change the first two digits based on the new effectivity date
      tdn: selectedRecord.tdn || selectedRecord.TDN || '',
      arp: selectedRecord.arp || selectedRecord.ARP || '',
      TDN: selectedRecord.TDN || selectedRecord.tdn || '',
      ARP: selectedRecord.ARP || selectedRecord.arp || '',
      
      // Link to the previous record (The "Foundation" of the transaction)
      pOldTdn: selectedRecord.tdn || selectedRecord.TDN,
      pPin: selectedRecord.pin || selectedRecord.PIN,
      pOwner: selectedRecord.owner,
      pOwnerNo: selectedRecord.ownerNo,
      pEffDate: selectedRecord.pEffDate, // Or current date? Usually previous eff date.
      pAssessedValue: selectedRecord.pAssessedValue, // Should be calculated or carried over
      
      // Set the Transaction Type
      TRANS_CD: type,
      
      // Reset status and dates for the new workflow
      status: 'draft',
      TAX_BEG_YR: nextTaxBegYear || selectedRecord.TAX_BEG_YR,
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

  const { data: apiData, error, isLoading: isSwrLoading, isValidating, mutate } = useSWR(
    ['faas-records', dataSource, pagination.page, pagination.limit, appliedFilter.field, appliedFilter.value],
    ([_, ds, page, limit, searchField, filterValue]: [string, string, number, number, string, string]) =>
      ds === 'supabase' ? listFaasRecords({ page, limit, searchField, filterValue }) : getRptMastDataDirect({ page, limit, searchField, filterValue }),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // Sync data to state
  useEffect(() => {
    if (!apiData) return;

    if (dataSource === 'supabase') {
      const list = (apiData as any)?.data;
      const paginationData = (apiData as any)?.pagination;
      if (!Array.isArray(list) || !paginationData) return;

      const mappedRecords: PropertyRecord[] = list.map((item: any) => {
        const innerData = item.data || {};
        const currentTdn = item.tdn || innerData.tdn || innerData.TDN || '';
        const currentPin = innerData.pin || innerData.PIN || '';
        const { tdn, pin, arp, ...cleanInnerData } = innerData;

        return {
          ...cleanInnerData,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          TDN: currentTdn,
          ARP: currentTdn,
          PIN: currentPin,
          status: item.status,
          owner: innerData.owner || innerData.owner_name || 'N/A',
          barangay: innerData.barangay || 'N/A',
          ownerNo: innerData.OWNER_NO || '',
        } as any;
      });

      setRecords(mappedRecords);
      setTotalRecords(paginationData.total);
      setPagination((prev) => ({ ...prev, totalPages: paginationData.totalPages }));

      if (!isEditing && !isAdding) {
        setSelectedRecord((prev) => {
          if (!prev) return prev;
          return mappedRecords.find((r) => r.id === prev.id) || prev;
        });
      }

      return;
    }

    const success = (apiData as any)?.success;
    const list = (apiData as any)?.data;
    const paginationData = (apiData as any)?.pagination;
    if (typeof success !== 'boolean' || !Array.isArray(list) || !paginationData) return;

    const mappedRecords: PropertyRecord[] = list.map((item: any, index: number) => {
      const tdn = String(item.TDN || '').trim();
      const pin = cleanPin(item.PIN || '');
      const id = tdn && pin ? `${tdn}-${pin}` : tdn || pin || `row-${index}`;
      const status = item.status || item.STATUS || item.Status || '';

      return {
        ...item,
        id,
        tdn,
        arp: tdn,
        pin,
        status,
        ownerNo: item.OWNER_NO || '',
        owner: item.Owner_Name || 'N/A',
        barangay: item.BARANGAY || 'N/A',
        barangayCode: item['BRGY.CODE'] || '',
        cityCode: item.CITY || '',
        CITY: item.CITY || '',
        BCODE: item.BCODE || item['BRGY.CODE'] || '',
        BARANGAY: item.BARANGAY || '',
        pNewTdn: item.P_NEW_TDN,
        pOldTdn: item.P_OLD_TDN,
        pPin: cleanPin(item.P_PIN || ''),
        pMarketValue: item.P_MARKET_VALUE,
        pAssessedValue: item.P_ASS_VALUE,
        pOwnerCode: item.P_OWNER_CODE,
        pOwnerNo: item.P_OWNER_NO,
        canArp: item.CAN_ARP,
        pArea: item.P_AREA,
        pAreaM: item.P_AREA_M,
        pEffDate: item.P_EFF_DATE,
        pOwner: item.P_OWNER,
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
        tpdDeputy: item.TPD_DEPUTY,
      };
    });

    setRecords(mappedRecords);
    setTotalRecords(paginationData.total);
    setPagination((prev) => ({ ...prev, totalPages: paginationData.totalPages }));
  }, [apiData, dataSource, isAdding, isEditing]);

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
    setAssessmentRecords([]);
    const w = window as any;
    const run = () => {
      prefetchForRecord(record);
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(run, { timeout: 2000 });
    } else {
      window.setTimeout(run, 0);
    }
  };

  const assessmentFetchSeqRef = useRef(0);
  useEffect(() => {
    const tdn = resolveTdn(selectedRecord);
    if (!tdn) return;
    if (isEditing || isAdding) return;
    if (lastFetchedAssessmentTdnRef.current === tdn && assessmentRecords.length > 0) return;
    if (assessmentFetchInFlightRef.current?.tdn === tdn) return;

    assessmentFetchInFlightRef.current = { tdn };
    const seq = ++assessmentFetchSeqRef.current;
    setIsAssessmentLoading(true);

    getRptAssByTdn(tdn)
      .then((rows) => {
        if (seq !== assessmentFetchSeqRef.current) return;
        setAssessmentRecords(rows || []);
        lastFetchedAssessmentTdnRef.current = tdn;
      })
      .catch((err) => {
        if (seq !== assessmentFetchSeqRef.current) return;
        console.error(err);
        toast.error('Failed to load assessment records');
        setAssessmentRecords([]);
      })
      .finally(() => {
        if (seq !== assessmentFetchSeqRef.current) return;
        assessmentFetchInFlightRef.current = null;
        setIsAssessmentLoading(false);
      });
  }, [assessmentRecords.length, isAdding, isEditing, resolveTdn, selectedRecord]);

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
    const dummyTdn = resolveTdn(dummyPropertyRecord as any);
    if (dummyTdn) lastFetchedAssessmentTdnRef.current = dummyTdn;
    toast.success('Form populated with dummy data');
  };

  // Auto-save mechanism for sub-components
  // This callback is passed down to children (AssessmentSection -> LandAssessment)
  // When they save locally, we trigger a save to backend
  const handleAutoSave = async (updatedAssessmentRecords: any[]) => {
    if (!selectedRecord) return;
    
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
        TDN: currentRecord.TDN || currentRecord.tdn,
        ARP: currentRecord.TDN || currentRecord.tdn,
        PIN: cleanPin(currentRecord.PIN || currentRecord.pin || ''),
        assessments: ctx.assessments,
        status: 'draft'
      };

      try {
        const isTempId =
          !currentRecord.id ||
          String(currentRecord.id).includes('DUMMY') ||
          String(currentRecord.id).startsWith('TRANS');
        let targetId = isTempId ? undefined : currentRecord.id;

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
        const now = Date.now();
        if (now - lastAutoSaveToastAtRef.current > 5000) {
          lastAutoSaveToastAtRef.current = now;
          toast.success('Changes synced to server', { id: 'autosave-sync' });
        }
        
        const newId = savedRecord.id || targetId;
        if (newId && currentRecord.id !== newId) {
          setSelectedRecord((prev) => {
            if (!prev) return prev;
            if (prev.id !== currentRecord.id) return prev;
            return { ...prev, id: newId, status: 'draft' } as any;
          });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        const now = Date.now();
        if (now - lastAutoSaveErrorToastAtRef.current > 5000) {
          lastAutoSaveErrorToastAtRef.current = now;
          toast.error('Failed to sync changes', { id: 'autosave-sync-error' });
        }
      }
    }, 800);
  };

  const checkDuplicatePinTdn = async (pin: string, tdn: string): Promise<string | null> => {
    // Clean PIN before checking
    const cleanedPin = cleanPin(pin);
    
    // Skip check if values are empty
    if (!cleanedPin && !tdn) return null;

    try {
      // Parallelize checks to reduce latency
      const checks = [];
      
      if (cleanedPin) {
        checks.push(
          listFaasRecords({ searchField: 'PIN', filterValue: cleanedPin, limit: 1 })
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
                return `PIN ${cleanedPin} already exists in a pending/approved record (TDN: ${tdn}, Status: ${conflict.status})`;
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

    // 1. Comprehensive Input Data & Business Rule Validation
    const saveValidation = validateTransactionSave(currentRecord);
    if (!saveValidation.isValid) {
      toast.error('Validation Error', {
        description: saveValidation.errors[0],
        duration: 5000,
      });
      return;
    }

    // 2. Check duplicates (Database uniqueness check)
    const pinVal = currentRecord.PIN || currentRecord.pin || '';
    const tdnVal = currentRecord.TDN || currentRecord.tdn || '';
    const errorMsg = await checkDuplicatePinTdn(pinVal, tdnVal);
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
        PIN: cleanPin(currentRecord.PIN || currentRecord.pin || ''),
        TAX_BEG_YR: String((currentRecord as any).TAX_BEG_YR || '').trim() || undefined,
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
      toast.success('Draft saved successfully', { id: toastId });
      
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
      // Prioritize the error message from the backend response (AppError)
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || error.message || 'Failed to save draft';
      
      toast.error(errorMessage, {
        id: toastId,
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

    // 1. Comprehensive Input Data & Business Rule Validation
    const saveValidation = validateTransactionSave(currentRecord);
    if (!saveValidation.isValid) {
      toast.error('Validation Error', {
        description: saveValidation.errors[0],
        duration: 5000,
      });
      return;
    }

    // 2. Check duplicates (Database uniqueness check)
    const pinVal = currentRecord.PIN || currentRecord.pin || '';
    const tdnVal = currentRecord.TDN || currentRecord.tdn || '';
    const errorMsg = await checkDuplicatePinTdn(pinVal, tdnVal);
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
        PIN: cleanPin(currentRecord.PIN || currentRecord.pin || ''),
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
      
      toast.success('Record submitted for review', { id: toastId });
      setSelectedRecord({
        ...currentRecord,
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
  const jsonPreview = useMemo(() => {
    if (!showJson) return '';
    if (!selectedRecord) {
      return JSON.stringify({ assessments: assessmentRecords.map((ass) => ({ ...ass })) }, null, 2);
    }
    return JSON.stringify(
      {
        ...selectedRecord,
        assessments: assessmentRecords.map((ass) => ({ ...ass })),
      },
      null,
      2
    );
  }, [assessmentRecords, selectedRecord, showJson]);

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

  const handleCancelTransaction = () => {
    setIsEditing(false);
    setIsAdding(false);

    if (transactionSource) {
      setSelectedRecord(transactionSource.record);
      setAssessmentRecords(transactionSource.assessments || []);
    } else {
      setSelectedRecord(null);
      setAssessmentRecords([]);
    }

    setTransactionSource(null);
    localStorage.removeItem(PERSISTENCE_KEY);
    toast.info('Transaction cancelled');
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
    documentTitle: `FAAS_${selectedRecord?.tdn || 'Record'}`,
  });

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
      <div className="bg-transparent dark:border-border px-3 py-2">
        <div className="min-w-0 flex items-center gap-2 flex-nowrap overflow-x-auto pb-2 pr-2 scrollbar-thin">
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
            disabled={!selectedRecord || isFormEnabled || selectedRecord.status === 'for-review'}
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
              onClick={handleSaveDraft}
              disabled={!selectedRecord || selectedRecord.status === 'for-review' || selectedRecord.status === 'approved' || isSaving}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-primary/10 dark:hover:bg-primary/10 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-primary dark:text-primary disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              title="Save as Draft (Work in Progress)"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          )}

          {isFormEnabled && (
            <button
              onClick={handleSubmit}
              disabled={isSubComponentEditing || isSaving}
              className="px-3 py-2 text-xs bg-primary hover:bg-primary-light text-surface rounded-lg shadow-sm transition-colors flex items-center gap-1.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              data-testid="btn-submit"
              title="Submit for Review"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'Submitting...' : 'Submit'}
            </button>
          )}

          {selectedRecord && selectedRecord.id && selectedRecord.id.startsWith('TRANS') ? (
            <button
              onClick={handleCancelTransaction}
              disabled={!selectedRecord}
              className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
              title="Cancel Transaction"
            >
              <X size={14} />
              Cancel Transaction
            </button>
          ) : isFormEnabled ? (
            <button
              onClick={handleCancel}
              disabled={!isFormEnabled}
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
            className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed h-9 whitespace-nowrap"
            data-testid="btn-refresh"
          >
            <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} />
            {isValidating ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded-lg shadow-sm transition-colors flex items-center gap-1.5 h-9 whitespace-nowrap"
            data-testid="btn-print"
          >
            <Printer size={14} />
            Print
          </button>

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
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-auto p-4 space-y-4 ${activeTab === 'property-info' ? 'no-scrollbar' : ''}`}>
        {/* Records Grid - Hidden when in adding/editing mode */}
        {(!isAdding && !isEditing) && (
        <div className="bg-surface dark:bg-surface rounded-xl shadow-sm border border-border dark:border-border overflow-hidden flex flex-col">
          <div 
            className="overflow-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
            style={{ height: `${tableHeight}px`, maxHeight: '80vh' }}
          >
            <table className="w-full text-xs" data-testid="records-table">
              <thead
                className="text-surface sticky top-0 z-10"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                
                <tr className="text-surface">
                  <th className="px-3 py-2 text-center font-semibold tracking-wide whitespace-nowrap w-10 border-r border-border/30">
                    <Database size={14} className="mx-auto" />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[180px] border-r border-border/30">TDN</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[180px] border-r border-border/30">OLD TDN</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[180px] border-r border-border/30">ARP</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[200px] border-r border-border/30">PIN</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[150px] border-r border-border/30">STATUS</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide min-w-[250px] border-r border-border/30">OWNER</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[120px] border-r border-border/30">TAX BEG YR</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[100px] border-r border-border/30">CITY CODE</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide whitespace-nowrap w-[100px] border-r border-border/30">BRGY CODE</th>
                  <th className="px-3 py-2 text-left font-semibold tracking-wide min-w-[150px]">BARANGAY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={11} className="px-3 py-2">
                         <div className="h-4 bg-muted/20 dark:bg-muted/20 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  records.map((record, index) => {
                  const statusDateText = getStatusDateText(record);
                  return (
                  <tr
                    key={`${record.id}-${index}`}
                    onClick={() => handleRowSelect(record)}
                    className={`cursor-pointer transition-colors ${
                      selectedRecord?.id === record.id
                        ? 'bg-emerald-100 dark:bg-emerald-900/20 border-l-4 border-l-emerald-600 dark:border-l-emerald-400'
                        : index % 2 === 0
                        ? 'bg-background dark:bg-background/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                        : 'bg-surface dark:bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                    }`}
                    data-testid={`record-row-${record.id}-${index}`}
                  >
                    <td className="px-3 py-2 text-center border-r border-border dark:border-border" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isInCart(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            addToCart({
                              id: record.id,
                              tdn: record.TDN || record.tdn,
                              pin: record.PIN || record.pin,
                              owner: record.owner,
                              barangay: record.barangay,
                              data: record
                            });
                          } else {
                            removeFromCart(record.id);
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap border-r border-border dark:border-border">{record.TDN || record.tdn}</td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap border-r border-border dark:border-border">{record.pOldTdn || ''}</td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap border-r border-border dark:border-border">{record.TDN || record.tdn}</td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap border-r border-border dark:border-border">{cleanPin(record.PIN || record.pin)}</td>
                    <td className="px-3 py-2 whitespace-nowrap border-r border-border dark:border-border">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClassName(record.status)}`}
                      >
                        <span>{record.status || 'N/A'}</span>
                        {statusDateText ? <span className="opacity-80">• {statusDateText}</span> : null}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground dark:text-foreground whitespace-nowrap truncate max-w-xs border-r border-border dark:border-border">{record.owner}</td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap text-center border-r border-border dark:border-border">{getDisplayTaxBegYear(record) || 'N/A'}</td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap text-center border-r border-border dark:border-border">{record.cityCode}</td>
                    <td className="px-3 py-2 font-mono text-foreground dark:text-foreground tracking-wider whitespace-nowrap text-center border-r border-border dark:border-border">{record.barangayCode}</td>
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

          {/* Search and Filter Section - Hidden when in adding/editing mode */}
          {(!isAdding && !isEditing) && (
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
                      className="flex-1 px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="flex-1 px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
                    {isLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                    Apply Filter
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
                <div className="flex-1 flex gap-2">
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
          </div>
          )}

        {/* Tabs Navigation */}
        <div className="bg-surface dark:bg-surface rounded-xl shadow-sm border border-border dark:border-border overflow-hidden">
          <div className="bg-muted/10 dark:bg-background border-b border-border dark:border-border px-2 pt-2">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-surface dark:bg-surface text-primary dark:text-primary border-t-2 border-t-primary shadow-sm'
                        : 'bg-muted/20 dark:bg-muted/20 text-muted dark:text-muted hover:bg-slate-300 dark:hover:bg-muted/30'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      {tab.id === 'property-info' && (isPrefetchingData || isAssessmentLoading) ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Icon size={14} />
                      )}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 space-y-4">
            {activeTab === 'property-info' ? (
              <div>
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
              </div>
            ) : null}

            {activeTab === 'assessment' ? (
              <AssessmentSection
                dataSource={dataSource}
                isEnabled={isFormEnabled}
                assessmentRecords={assessmentRecords}
                isLoading={isAssessmentLoading}
                tdn={resolveTdn(selectedRecord)}
                onUpdate={handleAutoSave}
                onEditModeChange={setIsSubComponentEditing}
                onRefresh={handleRefresh}
                onPrint={handlePrint}
              />
            ) : null}

            {activeTab === 'reference' ? (
              <ReferenceSection
                selectedRecord={selectedRecord}
                isEnabled={isFormEnabled}
                onUpdate={handlePropertyInfoUpdate}
              />
            ) : null}

            {activeTab === 'signatories' ? (
              <SignatoriesSection
                selectedRecord={selectedRecord}
                isEnabled={isFormEnabled}
                onEditModeChange={setIsSubComponentEditing}
                onUpdate={handlePropertyInfoUpdate}
                onRefresh={handleRefresh}
              />
            ) : null}

            {activeTab === 'other-info' ? (
              <OtherPropertyTab
                isEditing={isFormEnabled}
                onEnterEdit={() => {}}
                onSave={handleSave}
                onCancel={handleCancel}
                onDataChange={() => {}}
              />
            ) : null}

            {activeTab === 'previous-tdns' ? (
              <PreviousTDNsSection />
            ) : null}

            {activeTab === 'tax-dec' ? (
              <TaxDecSheetSection onPrint={handlePrint} />
            ) : null}
          </div>
        </div>
      </div>
      {/* Transaction Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent
          className="max-w-md"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Select Transaction Type</DialogTitle>
            <DialogDescription className="sr-only">
              Choose a transaction workflow for the selected property record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <button
              type="button"
              onClick={() => handleTransactionSelect('GR')}
              className="p-4 text-left border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/10 flex items-center justify-center text-primary dark:text-primary/80 group-hover:bg-primary/20 dark:group-hover:bg-primary/20 transition-colors text-white dark:text-white">
                <FileText size={20} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">General Revision (GR)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Mass update of property assessments</div>
              </div>
            </button>

            <button
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
              type="button"
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
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Form Data (JSON)</DialogTitle>
            <DialogDescription className="sr-only">
              View the current form state as JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-lg text-xs font-mono text-green-400">
            <pre>
              {jsonPreview}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Document */}
      <div className="hidden print:block">
        <div ref={printRef}>
          {selectedRecord && (
            <PrintDocument
              propertyInfo={{
                ownerName: selectedRecord.owner || '',
                pin: selectedRecord.pin || selectedRecord.PIN || '',
                tdNo: selectedRecord.tdn || selectedRecord.TDN || '',
                arpNo: selectedRecord.arp || selectedRecord.ARP || '',
                municipality: selectedRecord.cityCode === '053' ? 'Tubay' : selectedRecord.cityCode || 'Tubay',
                barangay: selectedRecord.barangay || '',
                province: 'Agusan del Norte',
                effectivityDate: selectedRecord.pEffDate || selectedRecord.EFF_DATE || '',
                declarationDate: selectedRecord.DEC_DATE || '',
              }}
              assessmentRows={assessmentRecords.map((ass, idx) => ({
                id: ass.id || ass.uniqueId || `ass-${selectedRecord.id || selectedRecord.tdn || selectedRecord.TDN || 'rec'}-${idx}`,
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
                totalAdjustedMarketValue: assessmentRecords.reduce((acc, curr) => acc + (curr.MARKET_VAL || 0), 0),
                totalAssessedValue: assessmentRecords.reduce((acc, curr) => acc + (curr.ASS_VALUE || 0), 0),
              }}
            />
          )}
        </div>
      </div>
      <MigrationCartIndicator />
    </div>
  );
};

export default RealPropertyDataEntry;
