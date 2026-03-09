import React, { useState, useCallback, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, RefreshCw, Printer,
  FileText, CreditCard, Search, ChevronDown, Building2,
  User, MapPin, Info, DollarSign, GripHorizontal, Sparkles, Code
} from 'lucide-react';
import { dummyPropertyRecord, dummyAssessmentRecords } from '@/components/data-entry/faas/dummyData';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAuth } from '@/context/AuthContext';
import { getRptMastDataDirect, RptMastRecord, getMastExtn } from '@/services/rptMastService';
import { getRptAssByTdn, RptAssRecord } from '@/services/rptAssService';
import PropertyInformationSection from './rpt_m_PropertyInformationSection';
import PropertyOwnerSection from './rpt_m_PropertyOwnerSection';
import PropertyBoundariesSection from './rpt_m_PropertyBoundariesSection';
import AssessmentSection from './rpt_m_AssessmentSection';
import ReferenceSection from './rpt_m_ReferenceSection';
import SignatoriesSection from './rpt_m_SignatoriesSection';
import PreviousTDNsSection from './rpt_m_PreviousTDNsSection';
import TaxDecSheetSection from './rpt_m_TaxDecSheetSection';
import OtherPropertyTab from '../rpt_m_OtherPropertyTab';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import useSWR from 'swr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { saveDraft, submitForReview, listFaasRecords, getFaasRecord, deleteFaasRecord, cancelFaasTransaction } from '@/services/faasService';

// Types
interface PropertyRecord {
  id: string;
  TDN: string;
  ARP: string;
  PIN: string;
  OWNER_NO: string;
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
  status?: string;
  assessments?: any[];
  TRANS_CD?: string; // Transaction Code
} // Add new field for display


const RealPropertyDataEntry: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { user } = useAuth();
  
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

  // Active tab state
  const [activeTab, setActiveTab] = useState('property-info');
  const [showJson, setShowJson] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const handleTransactionClick = () => {
    setShowTransactionModal(true);
  };

  const handleTransactionSelect = (type: string) => {
    if (!selectedRecord) {
      toast.error('Please select a property first.');
      return;
    }

    const newRecord: PropertyRecord = {
      ...selectedRecord,
      id: `TRANS-${type}-${Date.now()}`,
      TDN: '', 
      ARP: '',
      pOldTdn: selectedRecord.TDN,
      pPin: selectedRecord.PIN,
      pOwner: selectedRecord.owner,
      pOwnerNo: selectedRecord.OWNER_NO,
      pEffDate: selectedRecord.pEffDate,
      pAssessedValue: selectedRecord.pAssessedValue,
      TRANS_CD: type,
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
        // Numeric check (or alphanumeric if TDNs can have letters, but usually numeric/dashes)
        // Let's allow dashes too just in case
        if (!/^[0-9-%]+$/.test(value)) return 'TDN must be numeric (hyphens allowed)';
        break;
      case 'ARP':
        // Similar to TDN
        if (!/^[0-9-%]+$/.test(value)) return 'ARP must be numeric (hyphens allowed)';
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
        return {
          ...innerData,
          id: item.id,
          TDN: item.tdn || innerData.tdn || innerData.TDN || '',
          status: item.status,
          // Ensure essential fields have defaults if missing in JSON
          owner: innerData.owner || innerData.owner_name || 'N/A',
          barangay: innerData.barangay || 'N/A',
          ARP: innerData.ARP || '',
          PIN: innerData.PIN || '',
          OWNER_NO: innerData.OWNER_NO || '',
        };
      });

      setRecords(mappedRecords);
      setTotalRecords(apiData.pagination.total);
      
      setPagination(prev => ({
        ...prev,
        totalPages: apiData.pagination.totalPages
      }));
    }
  }, [apiData, isAdding]);

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

  // Restore draft on mount
  useEffect(() => {
    const savedDraftId = localStorage.getItem('currentDraftId');
    if (savedDraftId) {
      // Don't set global loading here to avoid flashing if SWR is also loading list
      // But maybe good to indicate restoration
      const restore = async () => {
          try {
              const record = await getFaasRecord(savedDraftId);
              if (record) {
                  const innerData = record.data || {};
                  const mappedRecord: PropertyRecord = {
                      ...innerData,
                      id: record.id,
                      TDN: record.tdn || innerData.tdn || innerData.TDN || '',
                      status: record.status,
                      owner: innerData.owner || innerData.owner_name || 'N/A',
                      barangay: innerData.barangay || 'N/A',
                      ARP: innerData.ARP || '',
                      PIN: innerData.PIN || '',
                      OWNER_NO: innerData.OWNER_NO || '',
                  };
                  
                  setSelectedRecord(mappedRecord);
                  if (mappedRecord.assessments) {
                      setAssessmentRecords(mappedRecord.assessments);
                  }
                  setIsEditing(true);
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
    
    if (window.confirm('Are you sure you want to cancel this transaction? This action cannot be undone.')) {
        try {
            // Check if it's actually a transaction
            const isTransaction = selectedRecord.id && selectedRecord.id.startsWith('TRANS');
            
            if (isTransaction) {
                // If it's a drafted transaction that hasn't been submitted/approved, we can just delete it
                // But if we want to log it as "Cancelled", we might want a specific endpoint
                await cancelFaasTransaction(selectedRecord.id);
                toast.success('Transaction cancelled successfully');
            } else {
                toast.error('This is not an active transaction.');
                return;
            }

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
            toast.error('Failed to cancel transaction');
        }
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    if (user?.role !== 'admin' && user?.role !== 'Administrator') {
      toast.error('Only administrators can delete records.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this record?')) {
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
    
    // Construct the full record payload
    const dataToSave = {
      ...selectedRecord,
      assessments: updatedAssessmentRecords,
      status: 'draft'
    };

    try {
      // Sync to Supabase
      // Pass ID if it's an update to existing record (not a new temp one)
      const isUpdate = selectedRecord.id && 
                       !selectedRecord.id.includes('DUMMY') && 
                       !selectedRecord.id.startsWith('TRANS');
                       
      const savedRecord = await saveDraft(dataToSave, isUpdate ? selectedRecord.id : undefined);
      toast.success('Changes synced to server');
      
      const savedId = savedRecord.id || selectedRecord?.id;
      if (savedId) {
          localStorage.setItem('currentDraftId', savedId);
      }
      
      // Update local ID if it was a new record
      if (selectedRecord && (!selectedRecord.id || selectedRecord.id.includes('DUMMY'))) {
          setSelectedRecord({
              ...selectedRecord,
              id: savedId || '', // Fallback to empty string if undefined, though it should exist
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
      // Check PIN uniqueness
      if (pin) {
        const pinResult = await getRptMastDataDirect({
          page: 1,
          limit: 5,
          searchField: 'PIN',
          filterValue: pin
        });
        
        const duplicatePin = pinResult.data.find(r => r.PIN === pin);
        
        if (duplicatePin) {
            // Allow if the found record is the predecessor (parent)
            if (duplicatePin.TDN !== selectedRecord?.TDN && duplicatePin.TDN !== selectedRecord?.pOldTdn) {
              return `PIN ${pin} already exists (Used by TDN: ${duplicatePin.TDN})`;
            }
         }
      }

      // Check TDN uniqueness
      if (tdn) {
        const tdnResult = await getRptMastDataDirect({
          page: 1,
          limit: 5,
          searchField: 'TDN',
          filterValue: tdn
        });

        const duplicateTdn = tdnResult.data.find(r => r.TDN === tdn);
        if (duplicateTdn) {
           const isNewRecord = isAdding || (selectedRecord?.id && selectedRecord.id.startsWith('TRANS'));
           
           if (isNewRecord) {
               return `TDN ${tdn} already exists.`;
           } else {
               const originalTdn = selectedRecord?.id?.split('-')[0];
               if (duplicateTdn.TDN !== originalTdn) {
                   return `TDN ${tdn} already exists.`;
               }
           }
        }
      }

    } catch (error: any) {
      console.error('Validation check failed:', error);
      return `Validation check failed: ${error.message || 'Network Error'}`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    // Check duplicates
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
      // Prepare data for saving
      const isTempId = selectedRecord.id && (selectedRecord.id.startsWith('TRANS') || selectedRecord.id.startsWith('DUMMY') || selectedRecord.id.includes('DUMMY'));
      
      const { id, ...recordData } = selectedRecord;
      const dataToSave = {
        ...recordData,
        ...(isTempId ? {} : { id: selectedRecord.id }),
        assessments: assessmentRecords,
        status: 'draft'
      };

      // Pass ID if it's an update to existing record (not a new temp one)
      const savedRecord = await saveDraft(dataToSave, isTempId ? undefined : selectedRecord.id);
      
      toast.dismiss(toastId);
      toast.success('Draft saved successfully');
      
      const savedId = savedRecord.id || selectedRecord.id;
      localStorage.setItem('currentDraftId', savedId);

      setSelectedRecord({
        ...selectedRecord,
        id: savedId,
        status: 'draft'
      });
    } catch (error: any) {
      toast.dismiss(toastId);
      // Prioritize the error message from the backend response (AppError)
      const backendMessage = error.response?.data?.message;
      const errorMessage = backendMessage || error.message || 'Failed to save draft';
      
      toast.error(errorMessage, {
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

    // Check duplicates
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
      
      const { id, ...recordData } = selectedRecord;
      const dataToSave = {
        ...recordData,
        ...(isTempId ? {} : { id: selectedRecord.id }),
        assessments: assessmentRecords,
        status: 'for-review'
      };
      
      let recordId = selectedRecord.id;
      
      if (isTempId) {
         const saved = await saveDraft(dataToSave);
         recordId = saved.id || ''; 
      } else {
         const saved = await saveDraft(dataToSave, recordId);
         recordId = saved.id || recordId;
      }
      
      if (!recordId) throw new Error("Failed to obtain Record ID");
      
      await submitForReview(recordId);
      
      toast.dismiss(toastId);
      toast.success('Record submitted for review');
      setSelectedRecord({
        ...selectedRecord,
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
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
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
            onClick={handleEdit}
            disabled={!selectedRecord || isFormEnabled}
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
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* Save/Cancel */}
          <button
            onClick={handleSave}
            disabled={!isFormEnabled || isSubComponentEditing || isSaving}
            className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-save"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          {selectedRecord && selectedRecord.id && selectedRecord.id.startsWith('TRANS') ? (
            <button
                onClick={handleTransactionCancel}
                disabled={!selectedRecord || isSaving}
                className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-cancel-transaction"
            >
                <X size={14} />
                Cancel Transaction
            </button>
          ) : (
            <button
                onClick={handleCancel}
                disabled={!isFormEnabled || isSubComponentEditing || isSaving}
                className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="btn-cancel"
            >
                <X size={14} />
                Cancel
            </button>
          )}
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* Utility Buttons */}
          <button
            onClick={handleRefresh}
            disabled={isValidating}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-70"
            data-testid="btn-refresh"
          >
            <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} />
            {isValidating ? 'Refreshing...' : 'Refresh'}
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
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ring-2 ring-blue-500/20"
          >
            <FileText size={16} strokeWidth={2.5} />
            TRANSACTION
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
        {/* Records Grid */}
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
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">ARP</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[200px]">PIN</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide whitespace-nowrap w-[180px]">OWNER NO.</th>
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
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.TDN}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.ARP}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.PIN}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap">{record.OWNER_NO}</td>
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

          {/* Search and Filter Section */}
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
                    placeholder={searchField === 'TDN' ? 'Enter TDN...' : `Enter ${searchField}...`}
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
                  selectedRecord={selectedRecord}
                />
                <PropertyOwnerSection
                  isEnabled={isFormEnabled}
                  selectedRecord={selectedRecord}
                />
                <PropertyBoundariesSection
                  isEnabled={isFormEnabled}
                  selectedRecord={selectedRecord}
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
              />
            )}
            
            {activeTab === 'signatories' && (
              <SignatoriesSection 
                selectedRecord={selectedRecord} 
                isEnabled={isFormEnabled} 
                onEditModeChange={setIsSubComponentEditing}
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
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" aria-describedby={ undefined }>
          <DialogHeader>
            <DialogTitle>Form Data (JSON)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-lg text-xs font-mono text-green-400">
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
        </DialogContent></Dialog>
    </div>
  );
};

export default RealPropertyDataEntry;
