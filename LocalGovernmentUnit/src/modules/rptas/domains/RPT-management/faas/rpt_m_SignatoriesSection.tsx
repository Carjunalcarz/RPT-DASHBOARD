import React, { useMemo, useState } from 'react';
import { Save, X, RefreshCw, Users, Paperclip, Search, Eye, Mail, Download } from 'lucide-react';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import TableToolbar from '../rpt_m_TableToolbar';
import {
  addAuditEntry,
  createMemorandum,
  createSignatory,
  createSwornStatement,
  filterMemorandums,
  filterSignatories,
  filterSwornStatements,
  MemorandumRecord,
  SignatoryRecord,
  SignatoryStatus,
  SwornStatementRecord,
  softDeleteMemorandum,
  softDeleteSignatory,
  softDeleteSwornStatement,
  updateMemorandum,
  updateSignatory as updateSignatoryLocal,
  updateSwornStatement,
  validateMemorandum,
  validateSignatory,
  validateSwornStatement,
  Attachment,
  AuditEntry,
} from './rpt_m_signatoriesCrud';
import { updateSignatory } from '@/modules/rptas/shared/services/rptMastService';
import { listTemplates, SetupSignatoryTemplate } from '@/modules/rptas/shared/services/setupSignatoryTemplatesService';
import { listSetupSignatories, SetupSignatory } from '@/modules/rptas/shared/services/setupSignatoriesService';

interface DocumentationData {
  preparedBy: string;
  datePrepared: string;
}

interface RemarksData {
  remarks: string;
}


interface SignatoriesFormData {
  // Appraised By
  appraisedBy: string;
  appraisedPosition: string;
  appraisedDate: string;
  appraisedSGD: boolean;
  appraisedTPD: boolean;
  
  // Assessed By
  assessedBy: string;
  assessedPosition: string;
  assessedDate: string;
  assessedSGD: boolean;
  assessedTPD: boolean;
  
  // Checked and Reviewed
  checkedBy: string;
  checkedPosition: string;
  checkedDate: string;
  checkedSGD: boolean;
  checkedTPD: boolean;
  
  // Recommending Approval
  recommendingBy: string;
  recommendingPosition: string;
  recommendingDate: string;
  recommendingSGD: boolean;
  recommendingTPD: boolean;
  
  // Approved By
  approvedBy: string;
  approvedPosition: string;
  approvedDate: string;
  approvedSGD: boolean;
  approvedTPD: boolean;
  
  // Provincial Assessor
  provincialAssessor: string;
  provincialPosition: string;
  provincialDate: string;
  provincialSGD: boolean;
  provincialTPD: boolean;
  
  // City/Municipal Assessor
  cityAssessor: string;
  cityPosition: string;
  cityDate: string;
  citySGD: boolean;
  cityTPD: boolean;
  
  // Deputy
  deputy: string;
  deputyPosition: string;
  deputyDate: string;
  deputySGD: boolean;
  deputyTPD: boolean;
  
  // Entry Date
  entryDate: string;
  entryBy: string;
}

const defaultDocumentationData: DocumentationData = {
  preparedBy: '',
  datePrepared: '',
};

const defaultRemarksData: RemarksData = {
  remarks: '',
};


const defaultFormData: SignatoriesFormData = {
  appraisedBy: '',
  appraisedPosition: '',
  appraisedDate: '',
  appraisedSGD: false,
  appraisedTPD: false,
  
  assessedBy: '',
  assessedPosition: '',
  assessedDate: '',
  assessedSGD: false,
  assessedTPD: false,
  
  checkedBy: '',
  checkedPosition: '',
  checkedDate: '',
  checkedSGD: false,
  checkedTPD: false,
  
  recommendingBy: '',
  recommendingPosition: '',
  recommendingDate: '',
  recommendingSGD: false,
  recommendingTPD: false,
  
  approvedBy: '',
  approvedPosition: '',
  approvedDate: '',
  approvedSGD: false,
  approvedTPD: false,
  
  provincialAssessor: 'JUNIE P VINATERO - REA',
  provincialPosition: 'PROVINCIAL ASSESSOR',
  provincialDate: '',
  provincialSGD: false,
  provincialTPD: false,
  
  cityAssessor: 'NORMA C. SARIGUMBA - R.E.A',
  cityPosition: 'Municipal Assessor',
  cityDate: '',
  citySGD: false,
  cityTPD: false,
  
  deputy: '',
  deputyPosition: '',
  deputyDate: '',
  deputySGD: false,
  deputyTPD: false,
  
  entryDate: '',
  entryBy: '',
};

interface SignatoriesSectionProps {
  selectedRecord?: any;
  isEnabled?: boolean;
  onEditModeChange?: (isEditing: boolean) => void;
  onUpdate?: (updatedData: any) => void;
  onRefresh?: () => void;
}

const SignatoriesSection: React.FC<SignatoriesSectionProps> = ({ 
  selectedRecord: initialRecord, 
  isEnabled = true, 
  onEditModeChange,
  onUpdate,
  onRefresh
}) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'signatories' | 'memorandum' | 'sworn' | 'documentation' | 'remarks'>('signatories');
  const [formData, setFormData] = useState<SignatoriesFormData>(defaultFormData);
  
  const [isEditing, setIsEditing] = useState(false);

  // Notify parent when edit mode changes
  React.useEffect(() => {
    onEditModeChange?.(isEditing);
  }, [isEditing, onEditModeChange]);
  
  // Populate form when initialRecord changes
  React.useEffect(() => {
    if (initialRecord) {
      setFormData({
        appraisedBy: initialRecord.appraisedBy || initialRecord.Appraiser || '',
        appraisedPosition: initialRecord.appraisedPos || initialRecord.AppraiserPos || '',
        appraisedDate: (initialRecord.appraisedDate || initialRecord.AppraisedDate) ? (initialRecord.appraisedDate || initialRecord.AppraisedDate).split('T')[0] : '',
        appraisedSGD: initialRecord.sgdAppraised || initialRecord.SGD_APPRAISED || false,
        appraisedTPD: initialRecord.tpdAppraised || initialRecord.TPD_APPRAISED || false,
        
        assessedBy: initialRecord.assessedBy || initialRecord.Assessor || initialRecord.assessor || '',
        assessedPosition: initialRecord.assessedPos || initialRecord.AssessorPos || initialRecord.assessorPos || '',
        assessedDate: (initialRecord.assessedDate || initialRecord.AssessorDate || initialRecord.assessorDate) ? (initialRecord.assessedDate || initialRecord.AssessorDate || initialRecord.assessorDate).split('T')[0] : '',
        assessedSGD: initialRecord.sgdAssessed || initialRecord.SGD_ASSESSED || false,
        assessedTPD: initialRecord.tpdAssessed || initialRecord.TPD_ASSESSED || false,
        
        checkedBy: '', // Not in API response
        checkedPosition: '', // Not in API response
        checkedDate: '', // Not in API response
        checkedSGD: false,
        checkedTPD: false,
        
        recommendingBy: initialRecord.Rec_Approval || initialRecord.recApproval || '',
        recommendingPosition: initialRecord.Rec_ApprovalPos || initialRecord.recApprovalPos || '',
        recommendingDate: (initialRecord.Rec_AppDate || initialRecord.recAppDate) ? (initialRecord.Rec_AppDate || initialRecord.recAppDate).split('T')[0] : '',
        recommendingSGD: initialRecord.sgdRecommend || initialRecord.SGD_RECOMMEND || false,
        recommendingTPD: initialRecord.tpdRecommend || initialRecord.TPD_RECOMMEND || false,
        
        approvedBy: initialRecord.Approved || initialRecord.approved || '',
        approvedPosition: initialRecord.ApprovedPos || initialRecord.approvedPos || '',
        approvedDate: (initialRecord.ApprovedDate || initialRecord.approvedDate) ? (initialRecord.ApprovedDate || initialRecord.approvedDate).split('T')[0] : '',
        approvedSGD: initialRecord.sgdApproved || initialRecord.SGD_APPROVED || false,
        approvedTPD: initialRecord.tpdApproved || initialRecord.TPD_APPROVED || false,
        
        provincialAssessor: initialRecord.provAssessor || initialRecord.ProvAssessor || '',
        provincialPosition: initialRecord.provAssessorPos || initialRecord.ProvAssessorPos || '',
        provincialDate: (initialRecord.provAssessorDate || initialRecord.ProvAssessorDate) ? (initialRecord.provAssessorDate || initialRecord.ProvAssessorDate).split('T')[0] : '',
        provincialSGD: initialRecord.sgdProv || initialRecord.SGD_PROV || false,
        provincialTPD: initialRecord.tpdProv || initialRecord.TPD_PROV || false,
        
        cityAssessor: initialRecord.cityAssessor || initialRecord.CityAssessor || '',
        cityPosition: initialRecord.cityAssessorPos || initialRecord.CityAssessorPos || '',
        cityDate: (initialRecord.cityAssessorDate || initialRecord.CityAssessorDate) ? (initialRecord.cityAssessorDate || initialRecord.CityAssessorDate).split('T')[0] : '',
        citySGD: initialRecord.sgdCity || initialRecord.SGD_CITY || false,
        cityTPD: initialRecord.tpdCity || initialRecord.TPD_CITY || false,
        
        deputy: initialRecord.deputy || initialRecord.Deputy || '',
        deputyPosition: initialRecord.deputyPos || initialRecord.DeputyPos || '',
        deputyDate: (initialRecord.deputyDate || initialRecord.DeputyDate) ? (initialRecord.deputyDate || initialRecord.DeputyDate).split('T')[0] : '',
        deputySGD: initialRecord.sgdDeputy || initialRecord.SGD_DEPUTY || false,
        deputyTPD: initialRecord.tpdDeputy || initialRecord.TPD_DEPUTY || false,
        
        entryDate: '', // Not explicitly in API for this section
        entryBy: '', // Not explicitly in API for this section
      });
    }
  }, [initialRecord]);

  const [documentationData, setDocumentationData] = useState<DocumentationData>(defaultDocumentationData);
  const [remarksData, setRemarksData] = useState<RemarksData>(defaultRemarksData);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isSavingSignatory, setIsSavingSignatory] = useState(false);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isSavingSworn, setIsSavingSworn] = useState(false);
  
  React.useEffect(() => {
    const name = user?.fullName || user?.name;
    if (!name) return;
    setDocumentationData(prev => (prev.preparedBy ? prev : { ...prev, preparedBy: name }));
  }, [user?.fullName, user?.name]);

  const [templates, setTemplates] = useState<SetupSignatoryTemplate[]>([]);
  const [selectedTemplateYear, setSelectedTemplateYear] = useState<string>('');
  const [setupSignatories, setSetupSignatories] = useState<SetupSignatory[]>([]);

  React.useEffect(() => {
    listTemplates().then(res => setTemplates(res.data)).catch(console.error);
  }, []);

  React.useEffect(() => {
    const run = async () => {
      try {
        const all: SetupSignatory[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await listSetupSignatories({ page, limit: 100, isActive: 'true' });
          all.push(...res.data);
          totalPages = res.meta.totalPages;
          page += 1;
        } while (page <= totalPages);
        setSetupSignatories(all);
      } catch (e: any) {
        console.error(e);
        pushNotice('error', e?.response?.data?.message || 'Failed to load setup signatories.');
      }
    };
    run();
  }, []);

  const handleApplyTemplate = (yearStr: string) => {
    const year = parseInt(yearStr);
    const template = templates.find(t => t.year === year);
    if (!template) return;
    
    setFormData(prev => ({
      ...prev,
      appraisedBy: template.appraisedBy?.name || '',
      appraisedPosition: template.appraisedBy?.title || '',
      appraisedSGD: template.appraisedSgd || false,
      appraisedTPD: template.appraisedTpd || false,
      appraisedDate: template.appraisedDate ? template.appraisedDate.split('T')[0] : '',
      
      assessedBy: template.assessedBy?.name || '',
      assessedPosition: template.assessedBy?.title || '',
      assessedSGD: template.assessedSgd || false,
      assessedTPD: template.assessedTpd || false,
      assessedDate: template.assessedDate ? template.assessedDate.split('T')[0] : '',
      
      recommendingBy: template.recommendingBy?.name || '',
      recommendingPosition: template.recommendingBy?.title || '',
      recommendingSGD: template.recommendingSgd || false,
      recommendingTPD: template.recommendingTpd || false,
      recommendingDate: template.recommendingDate ? template.recommendingDate.split('T')[0] : '',
      
      approvedBy: template.approvedBy?.name || '',
      approvedPosition: template.approvedBy?.title || '',
      approvedSGD: template.approvedSgd || false,
      approvedTPD: template.approvedTpd || false,
      approvedDate: template.approvedDate ? template.approvedDate.split('T')[0] : '',
      
      provincialAssessor: template.provincialAssessor?.name || '',
      provincialPosition: template.provincialAssessor?.title || '',
      provincialSGD: template.provincialAssessorSgd || false,
      provincialTPD: template.provincialAssessorTpd || false,
      provincialDate: template.provincialAssessorDate ? template.provincialAssessorDate.split('T')[0] : '',
      
      cityAssessor: template.cityAssessor?.name || '',
      cityPosition: template.cityAssessor?.title || '',
      citySGD: template.cityAssessorSgd || false,
      cityTPD: template.cityAssessorTpd || false,
      cityDate: template.cityAssessorDate ? template.cityAssessorDate.split('T')[0] : '',
      
      deputy: template.deputy?.name || '',
      deputyPosition: template.deputy?.title || '',
      deputySGD: template.deputySgd || false,
      deputyTPD: template.deputyTpd || false,
      deputyDate: template.deputyDate ? template.deputyDate.split('T')[0] : '',
    }));
    
    pushNotice('success', `Applied signatories from ${year} template.`);
    setSelectedTemplateYear('');
  };

  const handleAutoApplyTemplate = () => {
    // Find the most recent active template
    const activeTemplates = templates.filter(t => t.isActive);
    if (activeTemplates.length === 0) {
      pushNotice('error', 'No active templates found.');
      return;
    }
    
    // Sort descending by year
    const latestTemplate = activeTemplates.sort((a, b) => b.year - a.year)[0];
    handleApplyTemplate(latestTemplate.year.toString());
  };

  const currentUser = user?.name || 'System';
  const role = (user?.role || '').toLowerCase();
  const isTransactionActive = !!initialRecord?.id?.startsWith('TRANS-');
  const canEdit = isEnabled && ['administrator', 'admin', 'dataentry', 'assessor'].includes(role);
  const controlsEnabled = isEditing;

  const [signatories, setSignatories] = useState<SignatoryRecord[]>([
    {
      id: 'sig-1',
      name: 'Junie P. Vinatero',
      title: 'Provincial Assessor',
      status: 'Approved',
      dateSigned: '2024-01-15',
      sgd: true,
      tpd: false,
      notes: 'Approved after review',
      createdAt: '2024-01-10T09:00:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z',
      deletedAt: null,
      createdBy: 'Admin User',
      updatedBy: 'Admin User',
    },
    {
      id: 'sig-2',
      name: 'Norma C. Sarigumba',
      title: 'Municipal Assessor',
      status: 'Pending',
      dateSigned: '',
      sgd: false,
      tpd: true,
      notes: 'Pending final approval',
      createdAt: '2024-01-12T09:00:00.000Z',
      updatedAt: '2024-01-12T09:00:00.000Z',
      deletedAt: null,
      createdBy: 'Admin User',
      updatedBy: 'Admin User',
    },
  ]);
  const [memorandums, setMemorandums] = useState<MemorandumRecord[]>([
    {
      id: 'mem-1',
      subject: 'General Revision Note',
      body: 'Revised pursuant to Sec. 219 of R.A. 7160 and implemented by S.P. Ordinance No. 737-2025.',
      status: 'Approved',
      effectiveDate: '2025-01-01',
      attachments: [],
      createdAt: '2024-12-20T08:00:00.000Z',
      updatedAt: '2024-12-20T08:00:00.000Z',
      deletedAt: null,
      createdBy: 'Admin User',
      updatedBy: 'Admin User',
    },
  ]);

  const [selectedSignatoryId, setSelectedSignatoryId] = useState<string | null>(null);
  const [editingSignatoryId, setEditingSignatoryId] = useState<string | null>(null);
  const [signatoryDraft, setSignatoryDraft] = useState<SignatoryRecord>({
    id: '',
    name: '',
    title: '',
    status: 'Draft',
    dateSigned: '',
    sgd: false,
    tpd: false,
    notes: '',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    createdBy: '',
    updatedBy: '',
  });
  const [signatoryErrors, setSignatoryErrors] = useState<Record<string, string>>({});
  const [signatoryQuery, setSignatoryQuery] = useState('');
  const [signatoryStatusFilter, setSignatoryStatusFilter] = useState<SignatoryStatus | 'All'>('All');
  const [signatoryShowDeleted, setSignatoryShowDeleted] = useState(false);
  const [viewSignatoryId, setViewSignatoryId] = useState<string | null>(null);

  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState<MemorandumRecord>({
    id: '',
    subject: '',
    body: '',
    status: 'Draft',
    effectiveDate: '',
    attachments: [],
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    createdBy: '',
    updatedBy: '',
  });
  const [memoErrors, setMemoErrors] = useState<Record<string, string>>({});
  const [memoQuery, setMemoQuery] = useState('');
  const [memoStatusFilter, setMemoStatusFilter] = useState<SignatoryStatus | 'All'>('All');
  const [memoShowDeleted, setMemoShowDeleted] = useState(false);
  const [viewMemoId, setViewMemoId] = useState<string | null>(null);
  const [swornStatements, setSwornStatements] = useState<SwornStatementRecord[]>([
    {
      id: 'sworn-1',
      signatory: 'Revised for the owner pursuant to Sec. 204 of R.A. 7160',
      status: 'Pending',
      dateSubscribed: '',
      tin1: '',
      tin2: '',
      officialAdministeringOath: '',
      officialTitle: '',
      representativeName: '',
      swornStatementNo: 'SSA-2025-001',
      swornStatementDate: '',
      landMarketValue: '0.00',
      improvementsMarketValue: '0.00',
      taxCertNo: '',
      taxCertDateIssued: '',
      taxCertPlaceIssued: '',
      notes: '',
      createdAt: '2025-01-10T08:30:00.000Z',
      updatedAt: '2025-01-10T08:30:00.000Z',
      deletedAt: null,
      createdBy: 'Admin User',
      updatedBy: 'Admin User',
    },
  ]);
  const [selectedSwornId, setSelectedSwornId] = useState<string | null>(null);
  const [editingSwornId, setEditingSwornId] = useState<string | null>(null);
  const [swornDraft, setSwornDraft] = useState<SwornStatementRecord>({
    id: '',
    signatory: '',
    status: 'Draft',
    dateSubscribed: '',
    tin1: '',
    tin2: '',
    officialAdministeringOath: '',
    officialTitle: '',
    representativeName: '',
    swornStatementNo: '',
    swornStatementDate: '',
    landMarketValue: '',
    improvementsMarketValue: '',
    taxCertNo: '',
    taxCertDateIssued: '',
    taxCertPlaceIssued: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    createdBy: '',
    updatedBy: '',
  });
  const [swornErrors, setSwornErrors] = useState<Record<string, string>>({});
  const [swornQuery, setSwornQuery] = useState('');
  const [swornStatusFilter, setSwornStatusFilter] = useState<SignatoryStatus | 'All'>('All');
  const [swornShowDeleted, setSwornShowDeleted] = useState(false);
  const [viewSwornId, setViewSwornId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'signatory' | 'memorandum' | 'sworn'; id: string } | null>(null);

  const handleSave = async () => {
    const tdn = initialRecord?.TDN || initialRecord?.tdn;
    if (!tdn) {
      pushNotice('error', 'No TDN found for this record.');
      return;
    }
    try {
      pushNotice('success', 'Saving changes...');
      await updateSignatory(tdn, formData);
      
      // Propagate changes to parent (faas_records system)
      if (onUpdate) {
        onUpdate({
          appraisedBy: formData.appraisedBy,
          appraisedPos: formData.appraisedPosition,
          appraisedDate: formData.appraisedDate,
          sgdAppraised: formData.appraisedSGD,
          tpdAppraised: formData.appraisedTPD,
          
          assessedBy: formData.assessedBy,
          assessedPos: formData.assessedPosition,
          assessedDate: formData.assessedDate,
          sgdAssessed: formData.assessedSGD,
          tpdAssessed: formData.assessedTPD,
          
          recApproval: formData.recommendingBy,
          recApprovalPos: formData.recommendingPosition,
          recAppDate: formData.recommendingDate,
          sgdRecommend: formData.recommendingSGD,
          tpdRecommend: formData.recommendingTPD,
          
          approved: formData.approvedBy,
          approvedPos: formData.approvedPosition,
          approvedDate: formData.approvedDate,
          sgdApproved: formData.approvedSGD,
          tpdApproved: formData.approvedTPD,
          
          provAssessor: formData.provincialAssessor,
          provAssessorPos: formData.provincialPosition,
          provAssessorDate: formData.provincialDate,
          sgdProv: formData.provincialSGD,
          tpdProv: formData.provincialTPD,
          
          cityAssessor: formData.cityAssessor,
          cityPos: formData.cityPosition,
          cityDate: formData.cityDate,
          sgdCity: formData.citySGD,
          tpdCity: formData.cityTPD,
          
          deputy: formData.deputy,
          deputyPos: formData.deputyPosition,
          deputyDate: formData.deputyDate,
          sgdDeputy: formData.deputySGD,
          tpdDeputy: formData.deputyTPD,
        });
      }
      
      pushNotice('success', 'Changes saved successfully.');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save signatories:', error);
      pushNotice('error', 'Failed to save changes.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(defaultFormData);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    
    if (initialRecord) {
      setFormData({
        appraisedBy: initialRecord.appraisedBy || initialRecord.Appraiser || '',
        appraisedPosition: initialRecord.appraisedPos || initialRecord.AppraiserPos || '',
        appraisedDate: (initialRecord.appraisedDate || initialRecord.AppraisedDate) ? (initialRecord.appraisedDate || initialRecord.AppraisedDate).split('T')[0] : '',
        appraisedSGD: initialRecord.sgdAppraised || initialRecord.SGD_APPRAISED || false,
        appraisedTPD: initialRecord.tpdAppraised || initialRecord.TPD_APPRAISED || false,
        
        assessedBy: initialRecord.assessedBy || initialRecord.Assessor || initialRecord.assessor || '',
        assessedPosition: initialRecord.assessedPos || initialRecord.AssessorPos || initialRecord.assessorPos || '',
        assessedDate: (initialRecord.assessedDate || initialRecord.AssessorDate || initialRecord.assessorDate) ? (initialRecord.assessedDate || initialRecord.AssessorDate || initialRecord.assessorDate).split('T')[0] : '',
        assessedSGD: initialRecord.sgdAssessed || initialRecord.SGD_ASSESSED || false,
        assessedTPD: initialRecord.tpdAssessed || initialRecord.TPD_ASSESSED || false,
        
        checkedBy: '',
        checkedPosition: '',
        checkedDate: '',
        checkedSGD: false,
        checkedTPD: false,
        
        recommendingBy: initialRecord.recApproval || initialRecord.Rec_Approval || '',
        recommendingPosition: initialRecord.recApprovalPos || initialRecord.Rec_ApprovalPos || '',
        recommendingDate: (initialRecord.recAppDate || initialRecord.Rec_AppDate) ? (initialRecord.recAppDate || initialRecord.Rec_AppDate).split('T')[0] : '',
        recommendingSGD: initialRecord.sgdRecommend || initialRecord.SGD_RECOMMEND || false,
        recommendingTPD: initialRecord.tpdRecommend || initialRecord.TPD_RECOMMEND || false,
        
        approvedBy: initialRecord.approved || initialRecord.Approved || '',
        approvedPosition: initialRecord.approvedPos || initialRecord.ApprovedPos || '',
        approvedDate: (initialRecord.approvedDate || initialRecord.ApprovedDate) ? (initialRecord.approvedDate || initialRecord.ApprovedDate).split('T')[0] : '',
        approvedSGD: initialRecord.sgdApproved || initialRecord.SGD_APPROVED || false,
        approvedTPD: initialRecord.tpdApproved || initialRecord.TPD_APPROVED || false,
        
        provincialAssessor: initialRecord.provAssessor || initialRecord.ProvAssessor || '',
        provincialPosition: initialRecord.provAssessorPos || initialRecord.ProvAssessorPos || '',
        provincialDate: (initialRecord.provAssessorDate || initialRecord.ProvAssessorDate) ? (initialRecord.provAssessorDate || initialRecord.ProvAssessorDate).split('T')[0] : '',
        provincialSGD: initialRecord.sgdProv || initialRecord.SGD_PROV || false,
        provincialTPD: initialRecord.tpdProv || initialRecord.TPD_PROV || false,
        
        cityAssessor: initialRecord.cityAssessor || initialRecord.CityAssessor || '',
        cityPosition: initialRecord.cityAssessorPos || initialRecord.CityAssessorPos || '',
        cityDate: (initialRecord.cityAssessorDate || initialRecord.CityAssessorDate) ? (initialRecord.cityAssessorDate || initialRecord.CityAssessorDate).split('T')[0] : '',
        citySGD: initialRecord.sgdCity || initialRecord.SGD_CITY || false,
        cityTPD: initialRecord.tpdCity || initialRecord.TPD_CITY || false,
        
        deputy: initialRecord.deputy || initialRecord.Deputy || '',
        deputyPosition: initialRecord.deputyPos || initialRecord.DeputyPos || '',
        deputyDate: (initialRecord.deputyDate || initialRecord.DeputyDate) ? (initialRecord.deputyDate || initialRecord.DeputyDate).split('T')[0] : '',
        deputySGD: initialRecord.sgdDeputy || initialRecord.SGD_DEPUTY || false,
        deputyTPD: initialRecord.tpdDeputy || initialRecord.TPD_DEPUTY || false,
        
        entryDate: '',
        entryBy: '',
      });
      pushNotice('success', 'Data refreshed from server.');
    } else {
      setFormData(defaultFormData);
    }
    setDocumentationData(defaultDocumentationData);
    setRemarksData(defaultRemarksData);
    setIsEditing(false);
  };

  const pushNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 2500);
  };

  const handleSignatoryAdd = () => {
    if (!canEdit || editingSignatoryId) return;
    setEditingSignatoryId('new');
    setSelectedSignatoryId(null);
    setSignatoryDraft({
      id: '',
      name: '',
      title: '',
      status: 'Draft',
      dateSigned: '',
      sgd: false,
      tpd: false,
      notes: '',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      createdBy: '',
      updatedBy: '',
    });
    setSignatoryErrors({});
  };

  const handleSignatoryEdit = () => {
    if (!canEdit || !selectedSignatoryId || editingSignatoryId) return;
    const record = signatories.find((item) => item.id === selectedSignatoryId);
    if (!record) return;
    setEditingSignatoryId(record.id);
    setSignatoryDraft({ ...record });
    setSignatoryErrors({});
  };

  const handleSignatorySave = () => {
    if (!canEdit || !editingSignatoryId) return;
    const errors = validateSignatory(signatoryDraft);
    if (Object.keys(errors).length > 0) {
      setSignatoryErrors(errors);
      pushNotice('error', 'Please complete required fields.');
      return;
    }
    setIsSavingSignatory(true);
    if (editingSignatoryId === 'new') {
      const result = createSignatory(signatories, signatoryDraft, currentUser);
      setSignatories(result.list);
      setAuditLog((prev) => addAuditEntry(prev, result.audit));
      setSelectedSignatoryId(result.record.id);
    } else {
      const result = updateSignatoryLocal(signatories, editingSignatoryId, signatoryDraft, currentUser);
      if (result.record && result.audit) {
        const audit = result.audit;
        setSignatories(result.list);
        setAuditLog((prev) => addAuditEntry(prev, audit));
      }
    }
    setTimeout(() => {
      setIsSavingSignatory(false);
      setEditingSignatoryId(null);
      pushNotice('success', 'Signatory saved.');
    }, 600);
  };

  const handleSignatoryCancel = () => {
    setEditingSignatoryId(null);
    setSignatoryErrors({});
    if (selectedSignatoryId) {
      const record = signatories.find((item) => item.id === selectedSignatoryId);
      if (record) setSignatoryDraft({ ...record });
    }
  };

  const handleSignatoryDelete = () => {
    if (!canEdit || !selectedSignatoryId || editingSignatoryId) return;
    setPendingDelete({ type: 'signatory', id: selectedSignatoryId });
  };

  const handleSignatoryRefresh = () => {
    setSignatoryQuery('');
    setSignatoryStatusFilter('All');
    setSignatoryShowDeleted(false);
  };

  const handleMemoAdd = () => {
    if (!canEdit || editingMemoId) return;
    setEditingMemoId('new');
    setSelectedMemoId(null);
    setMemoDraft({
      id: '',
      subject: '',
      body: '',
      status: 'Draft',
      effectiveDate: '',
      attachments: [],
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      createdBy: '',
      updatedBy: '',
    });
    setMemoErrors({});
  };

  const handleMemoEdit = () => {
    if (!canEdit || !selectedMemoId || editingMemoId) return;
    const record = memorandums.find((item) => item.id === selectedMemoId);
    if (!record) return;
    setEditingMemoId(record.id);
    setMemoDraft({ ...record, attachments: [...record.attachments] });
    setMemoErrors({});
  };

  const handleMemoSave = () => {
    if (!canEdit || !editingMemoId) return;
    const errors = validateMemorandum(memoDraft);
    if (Object.keys(errors).length > 0) {
      setMemoErrors(errors);
      pushNotice('error', 'Please complete required fields.');
      return;
    }
    setIsSavingMemo(true);
    if (editingMemoId === 'new') {
      const result = createMemorandum(memorandums, memoDraft, currentUser);
      setMemorandums(result.list);
      setAuditLog((prev) => addAuditEntry(prev, result.audit));
      setSelectedMemoId(result.record.id);
    } else {
      const result = updateMemorandum(memorandums, editingMemoId, memoDraft, currentUser);
      if (result.record && result.audit) {
        const audit = result.audit;
        setMemorandums(result.list);
        setAuditLog((prev) => addAuditEntry(prev, audit));
      }
    }
    setTimeout(() => {
      setIsSavingMemo(false);
      setEditingMemoId(null);
      pushNotice('success', 'Memorandum saved.');
    }, 600);
  };

  const handleMemoCancel = () => {
    setEditingMemoId(null);
    setMemoErrors({});
    if (selectedMemoId) {
      const record = memorandums.find((item) => item.id === selectedMemoId);
      if (record) setMemoDraft({ ...record, attachments: [...record.attachments] });
    }
  };

  const handleMemoDelete = () => {
    if (!canEdit || !selectedMemoId || editingMemoId) return;
    setPendingDelete({ type: 'memorandum', id: selectedMemoId });
  };

  const handleMemoRefresh = () => {
    setMemoQuery('');
    setMemoStatusFilter('All');
    setMemoShowDeleted(false);
  };

  const handleSwornAdd = () => {
    if (!canEdit || editingSwornId) return;
    setEditingSwornId('new');
    setSelectedSwornId(null);
    setSwornDraft({
      id: '',
      signatory: '',
      status: 'Draft',
      dateSubscribed: '',
      tin1: '',
      tin2: '',
      officialAdministeringOath: '',
      officialTitle: '',
      representativeName: '',
      swornStatementNo: '',
      swornStatementDate: '',
      landMarketValue: '',
      improvementsMarketValue: '',
      taxCertNo: '',
      taxCertDateIssued: '',
      taxCertPlaceIssued: '',
      notes: '',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      createdBy: '',
      updatedBy: '',
    });
    setSwornErrors({});
  };

  const handleSwornEdit = () => {
    if (!canEdit || !selectedSwornId || editingSwornId) return;
    const record = swornStatements.find((item) => item.id === selectedSwornId);
    if (!record) return;
    setEditingSwornId(record.id);
    setSwornDraft({ ...record });
    setSwornErrors({});
  };

  const handleSwornSave = () => {
    if (!canEdit || !editingSwornId) return;
    const errors = validateSwornStatement(swornDraft);
    if (Object.keys(errors).length > 0) {
      setSwornErrors(errors);
      pushNotice('error', 'Please complete required fields.');
      return;
    }
    setIsSavingSworn(true);
    if (editingSwornId === 'new') {
      const result = createSwornStatement(swornStatements, swornDraft, currentUser);
      setSwornStatements(result.list);
      setAuditLog((prev) => addAuditEntry(prev, result.audit));
      setSelectedSwornId(result.record.id);
    } else {
      const result = updateSwornStatement(swornStatements, editingSwornId, swornDraft, currentUser);
      if (result.record && result.audit) {
        const audit = result.audit;
        setSwornStatements(result.list);
        setAuditLog((prev) => addAuditEntry(prev, audit));
      }
    }
    setTimeout(() => {
      setIsSavingSworn(false);
      setEditingSwornId(null);
      pushNotice('success', 'Sworn statement saved.');
    }, 600);
  };

  const handleSwornCancel = () => {
    setEditingSwornId(null);
    setSwornErrors({});
    if (selectedSwornId) {
      const record = swornStatements.find((item) => item.id === selectedSwornId);
      if (record) setSwornDraft({ ...record });
    }
  };

  const handleSwornDelete = () => {
    if (!canEdit || !selectedSwornId || editingSwornId) return;
    setPendingDelete({ type: 'sworn', id: selectedSwornId });
  };

  const handleSwornRefresh = () => {
    setSwornQuery('');
    setSwornStatusFilter('All');
    setSwornShowDeleted(false);
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'signatory') {
      const result = softDeleteSignatory(signatories, pendingDelete.id, currentUser);
      if (result.record && result.audit) {
        const audit = result.audit;
        setSignatories(result.list);
        setAuditLog((prev) => addAuditEntry(prev, audit));
        setSelectedSignatoryId(null);
      }
    } else if (pendingDelete.type === 'memorandum') {
      const result = softDeleteMemorandum(memorandums, pendingDelete.id, currentUser);
      if (result.record && result.audit) {
        const audit = result.audit;
        setMemorandums(result.list);
        setAuditLog((prev) => addAuditEntry(prev, audit));
        setSelectedMemoId(null);
      }
    } else {
      const result = softDeleteSwornStatement(swornStatements, pendingDelete.id, currentUser);
      if (result.record && result.audit) {
        const audit = result.audit;
        setSwornStatements(result.list);
        setAuditLog((prev) => addAuditEntry(prev, audit));
        setSelectedSwornId(null);
      }
    }
    setPendingDelete(null);
    pushNotice('success', 'Record deleted.');
  };

  const handleAttachmentAdd = (file: File) => {
    const attachment: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
    };
    setMemoDraft((prev) => ({ ...prev, attachments: [...prev.attachments, attachment] }));
  };

  const handleAttachmentRemove = (id: string) => {
    setMemoDraft((prev) => ({ ...prev, attachments: prev.attachments.filter((item) => item.id !== id) }));
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportSignatories = () => {
    downloadFile('signatories.json', JSON.stringify(signatories, null, 2));
  };

  const handleExportMemorandums = () => {
    downloadFile('memorandums.json', JSON.stringify(memorandums, null, 2));
  };

  const handleExportSwornStatements = () => {
    downloadFile('sworn-statements.json', JSON.stringify(swornStatements, null, 2));
  };

  const handleNotify = (type: 'signatory' | 'memorandum' | 'sworn', id: string, label: string) => {
    setAuditLog((prev) =>
      addAuditEntry(
        prev,
        {
          id: `${type}-${id}-notify-${Date.now()}`,
          entity: type,
          entityId: id,
          action: 'notify',
          user: currentUser,
          timestamp: new Date().toISOString(),
          details: `Notification sent for ${label}`,
        }
      )
    );
    pushNotice('success', 'Notification queued.');
  };

  const handleViewRecord = (type: 'signatory' | 'memorandum' | 'sworn', id: string) => {
    if (type === 'signatory') {
      setViewSignatoryId(id);
    } else if (type === 'memorandum') {
      setViewMemoId(id);
    } else {
      setViewSwornId(id);
    }
    setAuditLog((prev) =>
      addAuditEntry(
        prev,
        {
          id: `${type}-${id}-view-${Date.now()}`,
          entity: type,
          entityId: id,
          action: 'view',
          user: currentUser,
          timestamp: new Date().toISOString(),
          details: `Viewed ${type} record`,
        }
      )
    );
  };

  const filteredSignatories = useMemo(
    () => filterSignatories(signatories, signatoryQuery, signatoryStatusFilter, signatoryShowDeleted),
    [signatories, signatoryQuery, signatoryStatusFilter, signatoryShowDeleted]
  );

  const filteredMemorandums = useMemo(
    () => filterMemorandums(memorandums, memoQuery, memoStatusFilter, memoShowDeleted),
    [memorandums, memoQuery, memoStatusFilter, memoShowDeleted]
  );

  const filteredSwornStatements = useMemo(
    () => filterSwornStatements(swornStatements, swornQuery, swornStatusFilter, swornShowDeleted),
    [swornStatements, swornQuery, swornStatusFilter, swornShowDeleted]
  );

  const signatorySummary = useMemo(
    () =>
      signatories.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === 'Approved') acc.approved += 1;
          if (item.status === 'Pending') acc.pending += 1;
          if (item.status === 'Rejected') acc.rejected += 1;
          return acc;
        },
        { total: 0, approved: 0, pending: 0, rejected: 0 }
      ),
    [signatories]
  );

  const memoSummary = useMemo(
    () =>
      memorandums.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === 'Approved') acc.approved += 1;
          if (item.status === 'Pending') acc.pending += 1;
          if (item.status === 'Rejected') acc.rejected += 1;
          return acc;
        },
        { total: 0, approved: 0, pending: 0, rejected: 0 }
      ),
    [memorandums]
  );

  const swornSummary = useMemo(
    () =>
      swornStatements.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === 'Approved') acc.approved += 1;
          if (item.status === 'Pending') acc.pending += 1;
          if (item.status === 'Rejected') acc.rejected += 1;
          return acc;
        },
        { total: 0, approved: 0, pending: 0, rejected: 0 }
      ),
    [swornStatements]
  );

  const statusBadgeClass = (status: SignatoryStatus) => {
    if (status === 'Approved') return 'bg-success/20 text-success dark:bg-green-900/30 dark:text-green-200';
    if (status === 'Pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
    if (status === 'Rejected') return 'bg-danger/20 text-red-700 dark:bg-red-900/30 dark:text-red-200';
    return 'bg-muted/10 text-foreground dark:bg-background dark:text-foreground';
  };

  const subTabs = [
    { id: 'signatories' as const, label: 'Signatories' },
    { id: 'memorandum' as const, label: 'Memorandum' },
    { id: 'sworn' as const, label: 'Sworn Statement of Owner' },
    { id: 'documentation' as const, label: 'Documentation Preparation' },
    { id: 'remarks' as const, label: 'Remarks' },
  ];

  const renderSignatoryRow = (
    label: string,
    nameField: keyof SignatoriesFormData,
    positionField: keyof SignatoriesFormData,
    dateField: keyof SignatoriesFormData,
    sgdField: keyof SignatoriesFormData,
    tpdField: keyof SignatoriesFormData
  ) => (
    <div className="grid grid-cols-12 gap-2 items-center py-1">
      <div className="col-span-2 flex items-center gap-2">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={formData[sgdField] as boolean}
            onChange={(e) => setFormData({ ...formData, [sgdField]: e.target.checked })}
            disabled={!controlsEnabled}
            className="w-3 h-3 rounded border-border dark:border-border"
          />
          <span className="text-xs font-medium text-foreground dark:text-foreground">SGD</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={formData[tpdField] as boolean}
            onChange={(e) => setFormData({ ...formData, [tpdField]: e.target.checked })}
            disabled={!controlsEnabled}
            className="w-3 h-3 rounded border-border dark:border-border"
          />
          <span className="text-xs font-medium text-foreground dark:text-foreground">TPD</span>
        </label>
      </div>
      <div className="col-span-3">
        <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">{label}:</label>
        <select
          value={formData[nameField] as string}
          onChange={(e) => {
            const name = e.target.value;
            const selected = setupSignatories.find((s) => s.name === name);
            setFormData((prev) => ({
              ...prev,
              [nameField]: name,
              [positionField]: selected?.title ?? (prev[positionField] as string),
            } as SignatoriesFormData));
          }}
          disabled={!controlsEnabled}
          className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          <option value="">{`Select ${label}`}</option>
          {formData[nameField] && !setupSignatories.some((s) => s.name === (formData[nameField] as string)) && (
            <option value={formData[nameField] as string}>{formData[nameField] as string}</option>
          )}
          {setupSignatories
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
        </select>
      </div>
      <div className="col-span-4">
        <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">Position:</label>
        <input
          type="text"
          value={formData[positionField] as string}
          onChange={(e) => setFormData({ ...formData, [positionField]: e.target.value })}
          disabled={!controlsEnabled}
          className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
      </div>
      <div className="col-span-3">
        <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">Date:</label>
        <input
          type="date"
          value={formData[dateField] as string}
          onChange={(e) => setFormData({ ...formData, [dateField]: e.target.value })}
          disabled={!controlsEnabled}
          className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg bg-primary"
      >
        <div className="flex items-center gap-2">
          <Users size={20} className="text-surface" />
          <h2 className="text-base font-semibold text-surface">
            Signatories / Memorandum of TDN {initialRecord ? (initialRecord.TDN || initialRecord.tdn) : ''}
          </h2>
        </div>
      </div>

      {/* Toolbar */}
      {/* Global Toolbar removed to be specific per tab */}

      {/* Sub Tabs */}
      <div className="bg-background dark:bg-background/50 border-b border-border dark:border-border px-2 pt-2">
        <div className="flex gap-1">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-surface dark:bg-surface text-primary dark:text-primary border-t-2 border-t-primary'
                  : 'bg-muted/20 dark:bg-muted/20 text-muted dark:text-muted hover:bg-muted/30 dark:hover:bg-muted/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {notice && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium ${notice.type === 'success' ? 'bg-success/20 text-success dark:bg-green-900/30 dark:text-green-200' : 'bg-danger/20 text-red-700 dark:bg-red-900/30 dark:text-red-200'}`}>
            {notice.message}
          </div>
        )}
        {activeSubTab === 'signatories' && (
          <div className="space-y-3">
            {/* Signatories Toolbar */}
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                onClick={() => setIsEditing(true)}
                disabled={!canEdit || isEditing}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={14} />
                Edit
              </button>
              <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
              <button
                onClick={handleSave}
                disabled={!isEditing}
                className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={!isEditing}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
                Cancel
              </button>
              <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              
              {(isEditing || isTransactionActive) && (
                <>
                  <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoApplyTemplate}
                      disabled={!isEditing}
                      data-testid="btn-auto-prefill"
                      title="Automatically prefill signatories from latest active template"
                      className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} />
                      Auto-Prefill
                    </button>
                    <select
                      value={selectedTemplateYear}
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      disabled={!isEditing}
                      className="px-2 py-1.5 text-xs bg-surface dark:bg-muted/20 border border-border dark:border-border rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">Load Template...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.year}>{t.year} {t.description ? `- ${t.description}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {renderSignatoryRow('Appraised By', 'appraisedBy', 'appraisedPosition', 'appraisedDate', 'appraisedSGD', 'appraisedTPD')}
            {renderSignatoryRow('Assessed By', 'assessedBy', 'assessedPosition', 'assessedDate', 'assessedSGD', 'assessedTPD')}
            {renderSignatoryRow('Checked and Reviewed', 'checkedBy', 'checkedPosition', 'checkedDate', 'checkedSGD', 'checkedTPD')}
            {renderSignatoryRow('Recommending Approval', 'recommendingBy', 'recommendingPosition', 'recommendingDate', 'recommendingSGD', 'recommendingTPD')}
            {renderSignatoryRow('Approved By', 'approvedBy', 'approvedPosition', 'approvedDate', 'approvedSGD', 'approvedTPD')}
            {renderSignatoryRow('Provincial Assessor', 'provincialAssessor', 'provincialPosition', 'provincialDate', 'provincialSGD', 'provincialTPD')}
            {renderSignatoryRow('City/Municipal Assessor', 'cityAssessor', 'cityPosition', 'cityDate', 'citySGD', 'cityTPD')}
            {renderSignatoryRow('Deputy', 'deputy', 'deputyPosition', 'deputyDate', 'deputySGD', 'deputyTPD')}
            
            {/* Entry Date */}
            <div className="grid grid-cols-12 gap-2 items-center py-1">
              <div className="col-span-2"></div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">Entry Date:</label>
                <input
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  disabled={!controlsEnabled}
                  className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>
              <div className="col-span-4">
                <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1">By:</label>
                <input
                  type="text"
                  value={formData.entryBy}
                  onChange={(e) => setFormData({ ...formData, entryBy: e.target.value })}
                  disabled={!controlsEnabled}
                  className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'memorandum' && (
          <div className="space-y-3">
            {/* Memorandum Toolbar */}
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                onClick={handleMemoAdd}
                disabled={!canEdit || !!editingMemoId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={14} />
                Add
              </button>
              <button
                onClick={handleMemoEdit}
                disabled={!canEdit || !selectedMemoId || !!editingMemoId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={14} />
                Edit
              </button>
              <button
                onClick={handleMemoDelete}
                disabled={!canEdit || !selectedMemoId || !!editingMemoId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-danger/10 dark:hover:bg-danger/10 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-danger dark:text-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
                Delete
              </button>
              <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
              <button
                onClick={handleMemoSave}
                disabled={!editingMemoId}
                className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleMemoCancel}
                disabled={!editingMemoId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
                Cancel
              </button>
              <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
              <button
                onClick={handleMemoRefresh}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={handleExportMemorandums}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Download size={14} />
                Print
              </button>
            </div>
            
            {!canEdit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
                You have view-only access to memorandums.
              </div>
            )}
            {isSavingMemo && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary">
                Saving memorandum changes...
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-background dark:bg-background/50 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={14} className="absolute left-2 top-2.5 text-muted" />
                      <input
                        value={memoQuery}
                        onChange={(e) => setMemoQuery(e.target.value)}
                        placeholder="Search memorandums..."
                        className="w-full pl-7 pr-3 py-2 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={memoStatusFilter}
                      onChange={(e) => setMemoStatusFilter(e.target.value as SignatoryStatus | 'All')}
                      className="px-3 py-2 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded-lg"
                    >
                      <option value="All">All Status</option>
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-muted dark:text-foreground">
                      <input
                        type="checkbox"
                        checked={memoShowDeleted}
                        onChange={(e) => setMemoShowDeleted(e.target.checked)}
                        className="h-3 w-3 rounded border-border dark:border-border"
                      />
                      Show deleted
                    </label>
                    <button
                      type="button"
                      onClick={handleExportMemorandums}
                      className="px-3 py-2 text-xs bg-muted hover:bg-muted text-surface rounded-lg flex items-center gap-2"
                    >
                      <Download size={14} />
                      Export
                    </button>
                    {selectedMemoId && (
                      <button
                        type="button"
                        onClick={() => handleNotify('memorandum', selectedMemoId, 'memorandum')}
                        className="px-3 py-2 text-xs bg-primary hover:bg-primary-light text-surface rounded-lg flex items-center gap-2"
                      >
                        <Mail size={14} />
                        Notify
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-surface dark:bg-surface rounded-lg border border-border dark:border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-background dark:bg-background border-b border-border dark:border-border">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Subject</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Status</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Effective Date</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMemorandums.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted dark:text-muted">
                              No memorandums found.
                            </td>
                          </tr>
                        ) : (
                          filteredMemorandums.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedMemoId(item.id)}
                              className={`border-b border-border dark:border-border cursor-pointer ${
                                selectedMemoId === item.id ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-muted/5 dark:hover:bg-muted/10/60'
                              }`}
                            >
                              <td className="px-3 py-2 text-foreground dark:text-foreground">
                                {item.subject}
                                {item.deletedAt && <span className="ml-2 text-[10px] text-red-500">Deleted</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${statusBadgeClass(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted dark:text-foreground">{item.effectiveDate || '--'}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewRecord('memorandum', item.id);
                                  }}
                                  className="px-2 py-1 text-[11px] bg-muted/20 dark:bg-muted/20 rounded-lg flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-surface dark:bg-surface rounded-lg border border-border dark:border-border p-3">
                  <h4 className="text-xs font-semibold text-foreground dark:text-foreground mb-2">
                    {editingMemoId ? 'Edit Memorandum' : 'Memorandum Details'}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Subject</label>
                      <input
                        value={memoDraft.subject}
                        onChange={(e) => setMemoDraft({ ...memoDraft, subject: e.target.value })}
                        disabled={!editingMemoId}
                        className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                      {memoErrors.subject && (
                        <p className="text-[11px] text-danger mt-1">{memoErrors.subject}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Effective Date</label>
                      <input
                        type="date"
                        value={memoDraft.effectiveDate}
                        onChange={(e) => setMemoDraft({ ...memoDraft, effectiveDate: e.target.value })}
                        disabled={!editingMemoId}
                        className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Status</label>
                      <select
                        value={memoDraft.status}
                        onChange={(e) => setMemoDraft({ ...memoDraft, status: e.target.value as SignatoryStatus })}
                        disabled={!editingMemoId}
                        className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Body</label>
                      <textarea
                        value={memoDraft.body}
                        onChange={(e) => setMemoDraft({ ...memoDraft, body: e.target.value })}
                        disabled={!editingMemoId}
                        rows={4}
                        className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                      {memoErrors.body && (
                        <p className="text-[11px] text-danger mt-1">{memoErrors.body}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-muted dark:text-foreground">
                        <label className="flex items-center gap-2">
                          <Paperclip size={12} />
                          Attachments
                        </label>
                        <input
                          type="file"
                          disabled={!editingMemoId}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAttachmentAdd(file);
                          }}
                          className="text-[11px]"
                        />
                      </div>
                      {memoDraft.attachments.length === 0 ? (
                        <p className="text-[11px] text-muted dark:text-muted">No attachments.</p>
                      ) : (
                        <div className="space-y-1">
                          {memoDraft.attachments.map((att) => (
                            <div key={att.id} className="flex items-center justify-between text-[11px] text-muted dark:text-foreground">
                              <span>{att.name}</span>
                              {editingMemoId && (
                                <button
                                  type="button"
                                  onClick={() => handleAttachmentRemove(att.id)}
                                  className="text-red-500"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-muted dark:text-muted">
                      Updated by {memoDraft.updatedBy || '--'} at {memoDraft.updatedAt || '--'}
                    </div>
                  </div>
                </div>
                <div className="bg-background dark:bg-background/50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs text-muted dark:text-foreground">
                    <span>Total: {memoSummary.total}</span>
                    <span>Approved: {memoSummary.approved}</span>
                    <span>Pending: {memoSummary.pending}</span>
                    <span>Rejected: {memoSummary.rejected}</span>
                  </div>
                </div>
                <div className="bg-surface dark:bg-surface rounded-lg border border-border dark:border-border p-3">
                  <h4 className="text-xs font-semibold text-foreground dark:text-foreground mb-2">Audit Trail</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {auditLog.length === 0 ? (
                      <p className="text-[11px] text-muted dark:text-muted">No audit entries yet.</p>
                    ) : (
                      auditLog.map((entry) => (
                        <div key={entry.id} className="text-[11px] text-muted dark:text-foreground">
                          <div className="font-medium">{entry.details}</div>
                          <div>{entry.user} • {new Date(entry.timestamp).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'sworn' && (
          <div className="space-y-3">
            {/* Sworn Statement Toolbar */}
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                onClick={handleSwornAdd}
                disabled={!canEdit || !!editingSwornId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={14} />
                Add
              </button>
              <button
                onClick={handleSwornEdit}
                disabled={!canEdit || !selectedSwornId || !!editingSwornId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users size={14} />
                Edit
              </button>
              <button
                onClick={handleSwornDelete}
                disabled={!canEdit || !selectedSwornId || !!editingSwornId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-danger/10 dark:hover:bg-danger/10 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 text-danger dark:text-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
                Delete
              </button>
              <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
              <button
                onClick={handleSwornSave}
                disabled={!editingSwornId}
                className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-surface rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={handleSwornCancel}
                disabled={!editingSwornId}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={14} />
                Cancel
              </button>
              <div className="w-px h-6 bg-border dark:bg-border mx-1 self-center" />
              <button
                onClick={handleSwornRefresh}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={handleExportSwornStatements}
                className="px-3 py-1.5 text-xs bg-surface dark:bg-muted/20 hover:bg-muted/5 dark:hover:bg-muted/30 border border-border dark:border-border rounded shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Download size={14} />
                Print
              </button>
            </div>

            {!canEdit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
                You have view-only access to sworn statements.
              </div>
            )}
            {isSavingSworn && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary">
                Saving sworn statement changes...
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 space-y-3">
                <div className="bg-background dark:bg-background/50 rounded-lg p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={14} className="absolute left-2 top-2.5 text-muted" />
                      <input
                        value={swornQuery}
                        onChange={(e) => setSwornQuery(e.target.value)}
                        placeholder="Search sworn statements..."
                        className="w-full pl-7 pr-3 py-2 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={swornStatusFilter}
                      onChange={(e) => setSwornStatusFilter(e.target.value as SignatoryStatus | 'All')}
                      className="px-3 py-2 text-xs bg-surface dark:bg-surface border border-border dark:border-border rounded-lg"
                    >
                      <option value="All">All Status</option>
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs text-muted dark:text-foreground">
                      <input
                        type="checkbox"
                        checked={swornShowDeleted}
                        onChange={(e) => setSwornShowDeleted(e.target.checked)}
                        className="h-3 w-3 rounded border-border dark:border-border"
                      />
                      Show deleted
                    </label>
                    <button
                      type="button"
                      onClick={handleExportSwornStatements}
                      className="px-3 py-2 text-xs bg-muted hover:bg-muted text-surface rounded-lg flex items-center gap-2"
                    >
                      <Download size={14} />
                      Export
                    </button>
                    {selectedSwornId && (
                      <button
                        type="button"
                        onClick={() => handleNotify('sworn', selectedSwornId, 'sworn statement')}
                        className="px-3 py-2 text-xs bg-primary hover:bg-primary-light text-surface rounded-lg flex items-center gap-2"
                      >
                        <Mail size={14} />
                        Notify
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-surface dark:bg-surface rounded-lg border border-border dark:border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-background dark:bg-background border-b border-border dark:border-border">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Signatory</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Status</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Statement No.</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Date Subscribed</th>
                          <th className="px-3 py-2 text-left font-medium text-muted dark:text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSwornStatements.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-xs text-muted dark:text-muted">
                              No sworn statements found.
                            </td>
                          </tr>
                        ) : (
                          filteredSwornStatements.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedSwornId(item.id)}
                              className={`border-b border-border dark:border-border cursor-pointer ${
                                selectedSwornId === item.id ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-muted/5 dark:hover:bg-muted/10/60'
                              }`}
                            >
                              <td className="px-3 py-2 text-foreground dark:text-foreground">
                                {item.signatory}
                                {item.deletedAt && <span className="ml-2 text-[10px] text-red-500">Deleted</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${statusBadgeClass(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted dark:text-foreground">{item.swornStatementNo || '--'}</td>
                              <td className="px-3 py-2 text-muted dark:text-foreground">{item.dateSubscribed || '--'}</td>
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewRecord('sworn', item.id);
                                  }}
                                  className="px-2 py-1 text-[11px] bg-muted/20 dark:bg-muted/20 rounded-lg flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-surface dark:bg-surface rounded-lg border border-border dark:border-border p-3">
                  <h4 className="text-xs font-semibold text-foreground dark:text-foreground mb-2">
                    {editingSwornId ? 'Edit Sworn Statement' : 'Sworn Statement Details'}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Signatory</label>
                      <input
                        value={swornDraft.signatory}
                        onChange={(e) => setSwornDraft({ ...swornDraft, signatory: e.target.value })}
                        disabled={!editingSwornId}
                        className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                      {swornErrors.signatory && (
                        <p className="text-[11px] text-danger mt-1">{swornErrors.signatory}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Status</label>
                        <select
                          value={swornDraft.status}
                          onChange={(e) => setSwornDraft({ ...swornDraft, status: e.target.value as SignatoryStatus })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Date Subscribed</label>
                        <input
                          type="date"
                          value={swornDraft.dateSubscribed}
                          onChange={(e) => setSwornDraft({ ...swornDraft, dateSubscribed: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                        {swornErrors.dateSubscribed && (
                          <p className="text-[11px] text-danger mt-1">{swornErrors.dateSubscribed}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Statement No.</label>
                        <input
                          value={swornDraft.swornStatementNo}
                          onChange={(e) => setSwornDraft({ ...swornDraft, swornStatementNo: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Statement Date</label>
                        <input
                          type="date"
                          value={swornDraft.swornStatementDate}
                          onChange={(e) => setSwornDraft({ ...swornDraft, swornStatementDate: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Land Market Value</label>
                        <input
                          value={swornDraft.landMarketValue}
                          onChange={(e) => setSwornDraft({ ...swornDraft, landMarketValue: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Improvements Market Value</label>
                        <input
                          value={swornDraft.improvementsMarketValue}
                          onChange={(e) => setSwornDraft({ ...swornDraft, improvementsMarketValue: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg text-right"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">TIN</label>
                        <input
                          value={swornDraft.tin1}
                          onChange={(e) => setSwornDraft({ ...swornDraft, tin1: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">TIN (Secondary)</label>
                        <input
                          value={swornDraft.tin2}
                          onChange={(e) => setSwornDraft({ ...swornDraft, tin2: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Tax Cert. No.</label>
                        <input
                          value={swornDraft.taxCertNo}
                          onChange={(e) => setSwornDraft({ ...swornDraft, taxCertNo: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Tax Cert. Date Issued</label>
                        <input
                          type="date"
                          value={swornDraft.taxCertDateIssued}
                          onChange={(e) => setSwornDraft({ ...swornDraft, taxCertDateIssued: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Tax Cert. Place Issued</label>
                      <input
                        value={swornDraft.taxCertPlaceIssued}
                        onChange={(e) => setSwornDraft({ ...swornDraft, taxCertPlaceIssued: e.target.value })}
                        disabled={!editingSwornId}
                        className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Official Administering Oath</label>
                      <input
                        value={swornDraft.officialAdministeringOath}
                        onChange={(e) => setSwornDraft({ ...swornDraft, officialAdministeringOath: e.target.value })}
                        disabled={!editingSwornId}
                        className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Official Title</label>
                        <input
                          value={swornDraft.officialTitle}
                          onChange={(e) => setSwornDraft({ ...swornDraft, officialTitle: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Representative Name</label>
                        <input
                          value={swornDraft.representativeName}
                          onChange={(e) => setSwornDraft({ ...swornDraft, representativeName: e.target.value })}
                          disabled={!editingSwornId}
                          className="w-full px-2 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted dark:text-foreground mb-1">Notes</label>
                      <textarea
                        value={swornDraft.notes}
                        onChange={(e) => setSwornDraft({ ...swornDraft, notes: e.target.value })}
                        disabled={!editingSwornId}
                        rows={3}
                        className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded-lg"
                      />
                    </div>
                    <div className="text-[11px] text-muted dark:text-muted">
                      Updated by {swornDraft.updatedBy || '--'} at {swornDraft.updatedAt || '--'}
                    </div>
                  </div>
                </div>
                <div className="bg-background dark:bg-background/50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs text-muted dark:text-foreground">
                    <span>Total: {swornSummary.total}</span>
                    <span>Approved: {swornSummary.approved}</span>
                    <span>Pending: {swornSummary.pending}</span>
                    <span>Rejected: {swornSummary.rejected}</span>
                  </div>
                </div>
                <div className="bg-surface dark:bg-surface rounded-lg border border-border dark:border-border p-3">
                  <h4 className="text-xs font-semibold text-foreground dark:text-foreground mb-2">Audit Trail</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {auditLog.length === 0 ? (
                      <p className="text-[11px] text-muted dark:text-muted">No audit entries yet.</p>
                    ) : (
                      auditLog.map((entry) => (
                        <div key={entry.id} className="text-[11px] text-muted dark:text-foreground">
                          <div className="font-medium">{entry.details}</div>
                          <div>{entry.user} • {new Date(entry.timestamp).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'documentation' && (
          <div className="space-y-3">
            {/* Prepared By */}
            <div className="grid grid-cols-4 gap-3 items-center">
              <label className="text-xs font-medium text-foreground dark:text-foreground text-right">
                Prepared By:
              </label>
              <div className="col-span-3">
                <select
                  value={documentationData.preparedBy}
                  onChange={(e) => setDocumentationData({ ...documentationData, preparedBy: e.target.value })}
                  disabled={!controlsEnabled}
                  className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                >
                  <option value=""></option>
                </select>
              </div>
            </div>

            {/* Date Prepared */}
            <div className="grid grid-cols-4 gap-3 items-center">
              <label className="text-xs font-medium text-foreground dark:text-foreground text-right">
                Date Prepared:
              </label>
              <div className="col-span-3">
                <input
                  type="date"
                  value={documentationData.datePrepared}
                  onChange={(e) => setDocumentationData({ ...documentationData, datePrepared: e.target.value })}
                  disabled={!controlsEnabled}
                  className="w-full px-2 py-1 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>
            </div>

            {/* Attachment Document Button */}
            <div className="mt-6">
              <button
                disabled={!controlsEnabled}
                className="px-4 py-2 text-xs bg-muted hover:bg-muted text-surface rounded shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip size={14} />
                Attachment Document
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'remarks' && (
          <div className="space-y-3">
            <div>
              <textarea
                value={remarksData.remarks}
                onChange={(e) => setRemarksData({ ...remarksData, remarks: e.target.value })}
                disabled={!controlsEnabled}
                rows={15}
                placeholder="Enter remarks here..."
                className="w-full px-3 py-2 text-xs bg-background dark:bg-background border border-border dark:border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </div>
          </div>
        )}
      </div>
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPendingDelete(null)}></div>
          <div className="relative bg-surface dark:bg-surface rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-sm font-semibold text-foreground dark:text-surface mb-2">Confirm delete</h3>
            <p className="text-xs text-muted dark:text-foreground mb-4">
              This will soft delete the selected record. You can still view deleted entries if enabled.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-3 py-2 text-xs bg-muted/20 dark:bg-muted/20 text-foreground dark:text-foreground rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-2 text-xs bg-danger hover:bg-danger/90 text-surface rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {viewSignatoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewSignatoryId(null)}></div>
          <div className="relative bg-surface dark:bg-surface rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            {(() => {
              const record = signatories.find((item) => item.id === viewSignatoryId);
              if (!record) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground dark:text-surface">Signatory Details</h3>
                    <button className="text-muted" onClick={() => setViewSignatoryId(null)}>Close</button>
                  </div>
                  <div className="text-xs text-muted dark:text-foreground">Name: {record.name}</div>
                  <div className="text-xs text-muted dark:text-foreground">Title: {record.title}</div>
                  <div className="text-xs text-muted dark:text-foreground">Status: {record.status}</div>
                  <div className="text-xs text-muted dark:text-foreground">Date Signed: {record.dateSigned || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">SGD: {record.sgd ? 'Yes' : 'No'} | TPD: {record.tpd ? 'Yes' : 'No'}</div>
                  <div className="text-xs text-muted dark:text-foreground">Notes: {record.notes || '--'}</div>
                  <div className="text-xs text-muted dark:text-muted">Updated by {record.updatedBy} • {new Date(record.updatedAt).toLocaleString()}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {viewMemoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewMemoId(null)}></div>
          <div className="relative bg-surface dark:bg-surface rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            {(() => {
              const record = memorandums.find((item) => item.id === viewMemoId);
              if (!record) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground dark:text-surface">Memorandum Details</h3>
                    <button className="text-muted" onClick={() => setViewMemoId(null)}>Close</button>
                  </div>
                  <div className="text-xs text-muted dark:text-foreground">Subject: {record.subject}</div>
                  <div className="text-xs text-muted dark:text-foreground">Status: {record.status}</div>
                  <div className="text-xs text-muted dark:text-foreground">Effective Date: {record.effectiveDate || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">Body: {record.body}</div>
                  <div className="text-xs text-muted dark:text-foreground">
                    Attachments: {record.attachments.length ? record.attachments.map((att) => att.name).join(', ') : '--'}
                  </div>
                  <div className="text-xs text-muted dark:text-muted">Updated by {record.updatedBy} • {new Date(record.updatedAt).toLocaleString()}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {viewSwornId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewSwornId(null)}></div>
          <div className="relative bg-surface dark:bg-surface rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            {(() => {
              const record = swornStatements.find((item) => item.id === viewSwornId);
              if (!record) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground dark:text-surface">Sworn Statement Details</h3>
                    <button className="text-muted" onClick={() => setViewSwornId(null)}>Close</button>
                  </div>
                  <div className="text-xs text-muted dark:text-foreground">Signatory: {record.signatory}</div>
                  <div className="text-xs text-muted dark:text-foreground">Status: {record.status}</div>
                  <div className="text-xs text-muted dark:text-foreground">Date Subscribed: {record.dateSubscribed || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">Statement No.: {record.swornStatementNo || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">Land Market Value: {record.landMarketValue || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">Improvements Market Value: {record.improvementsMarketValue || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">TIN: {record.tin1 || '--'}</div>
                  <div className="text-xs text-muted dark:text-foreground">Representative: {record.representativeName || '--'}</div>
                  <div className="text-xs text-muted dark:text-muted">Updated by {record.updatedBy} • {new Date(record.updatedAt).toLocaleString()}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatoriesSection;
