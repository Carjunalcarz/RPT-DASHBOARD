import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useParams, useNavigate, useLocation } from 'react-router';
import useSWR from 'swr';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { getRptMastDataDirect, updateSignatory } from '@/modules/rptas/shared/services/rptMastService';
import { getRptAssByTdn } from '@/modules/rptas/shared/services/rptAssService';
import { getFaasRecord, updateFaasStatus } from '@/modules/rptas/shared/services/faasService';   
import PropertyDetailsView from '@/modules/rptas/shared/components/data-entry/faas/PropertyDetailsView';
import { listSetupSignatories, type SetupSignatory } from '@/modules/rptas/shared/services/setupSignatoriesService';
import { getMunicipalities } from '@/services/landTaxService';
import { toast } from 'sonner';
import { CheckCircle, Circle, XCircle, MessageSquare, ArrowLeft, History, FileText, Send, RefreshCw, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/modules/rptas/ui/dialog';
import { PropertyRecord } from '@/modules/rptas/shared/components/data-entry/faas/RealPropertyDataEntry';
import PrintLandDocument from '@/modules/rptas/shared/components/RPT-management/rpt_m_PrintDocument';
import PrintBuildingDocument from '@/modules/rptas/shared/components/data-entry/PrintBuildingDocument';
import { getBldgStrucByTdn, type BldgStrucRecord } from '@/modules/rptas/shared/services/bldgStrucService';
import { getBldgAdjByTdn, type BldgAdjRecord } from '@/modules/rptas/shared/services/bldgAdjService';

const PropertyApproval: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { headerColor } = useThemeColor();
  const { user } = useAuth();
  const { showConfirm } = useAlert();

  const searchParams = new URLSearchParams(location.search);
  const recordId = id || searchParams.get('id') || ((location.state as any)?.id as string | undefined);

  const [record, setRecord] = useState<PropertyRecord | null>(null);
  const [assessmentRecords, setAssessmentRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [activeTab, setActiveTab] = useState('property-info');
  const [comments, setComments] = useState('');
  const [printOpen, setPrintOpen] = useState(false);
  const [bldgStruc, setBldgStruc] = useState<BldgStrucRecord[]>([]);
  const [bldgAdj, setBldgAdj] = useState<BldgAdjRecord[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `FAAS-${(record as any)?.TDN || (record as any)?.tdn || 'property'}`,
    // Keep the printed output identical to the on-screen preview:
    //  - print-color-adjust: exact  -> keep the blue header band / shaded cells
    //  - faas-page overrides        -> don't clip content to a fixed page height
    pageStyle: `
      @page { size: A4 portrait; margin: 0.5in; }
      @media print {
        html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .faas-page { height: auto !important; max-height: none !important; overflow: visible !important; page-break-after: auto !important; }
        #print-document { position: static !important; left: 0 !important; width: 100% !important; }
      }
    `,
  });

  // A record is a Building FAAS when any assessment line is of kind Building.
  const isBuilding = useMemo(
    () => (assessmentRecords || []).some((ass: any) => ass.KIND === 'B' || ass.KIND === 'Building'),
    [assessmentRecords]
  );

  // Building structures/additional-items are stored separately and fetched by TDN.
  useEffect(() => {
    const tdn = (record as any)?.TDN || (record as any)?.tdn;
    let active = true;
    if (isBuilding && tdn) {
      getBldgStrucByTdn(tdn).then((r) => active && setBldgStruc(r || [])).catch(() => active && setBldgStruc([]));
      getBldgAdjByTdn(tdn).then((r) => active && setBldgAdj(r || [])).catch(() => active && setBldgAdj([]));
    } else {
      setBldgStruc([]);
      setBldgAdj([]);
    }
    return () => { active = false; };
  }, [record, isBuilding]);

  const { data: municipalitiesList } = useSWR('municipalities-all', getMunicipalities, { revalidateOnFocus: false });

  // Build the printable Tax Declaration document data (municipal + provincial
  // signatory blocks, names pulled from the record's approval fields).
  const printData = useMemo(() => {
    const r: any = record || {};
    const cityCode = String(r.CITY || r.cityCode || r.city || '').trim();
    const municipalityName =
      (municipalitiesList || []).find((m: any) => String(m.code).trim() === cityCode)?.name ||
      r.cityName || cityCode || '';
    const municipalApproved = r.status === 'pending-provincial' || r.status === 'approved';
    const provincialApproved = r.status === 'approved';
    const sumBy = (key: string) => (assessmentRecords || []).reduce((acc: number, c: any) => acc + (Number(c[key]) || 0), 0);
    return {
      propertyInfo: {
        ownerName: r.owner || r.owner_name || '',
        pin: r.PIN || r.pin || '',
        tdNo: r.TDN || r.tdn || '',
        arpNo: r.ARP || r.arp || '',
        municipality: municipalityName,
        barangay: r.barangayName || r.barangay || '',
        province: 'Agusan del Norte',
        effectivityDate: r.pEffDate || r.EFF_DATE || r.effectivityDate || '',
        declarationDate: r.DEC_DATE || r.declarationDate || '',
      },
      assessmentRows: (assessmentRecords || []).map((ass: any, idx: number) => ({
        id: ass.id || ass.uniqueId || `ass-${r.id || r.TDN || 'rec'}-${idx}`,
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
      })),
      summary: {
        totalArea: sumBy('AREA'),
        totalAdjustedMarketValue: sumBy('MARKET_VAL'),
        totalAssessedValue: sumBy('ASS_VALUE'),
      },
      signatures: [
        { label: 'Prepared by', name: r.preparedBy || r.createdBy || null, sub: 'Assessment Clerk' },
        { label: 'Recommending Approval', name: municipalApproved ? (r.recApproval || null) : null, sub: r.recApprovalPos || 'Municipal Assessor', date: municipalApproved ? (r.recAppDate || null) : null },
        { label: 'Approved by', name: provincialApproved ? (r.approved || null) : null, sub: r.approvedPos || 'Provincial Assessor', date: provincialApproved ? (r.approvedDate || null) : null },
      ],
    };
  }, [record, assessmentRecords, municipalitiesList]);

  // Full propertyInfo for the official Building & Other Structures FAAS form.
  const buildingPropertyInfo = useMemo(() => {
    const r: any = record || {};
    const cityCode = String(r.CITY || r.cityCode || r.city || '').trim();
    const municipalityName =
      (municipalitiesList || []).find((m: any) => String(m.code).trim() === cityCode)?.name ||
      r.CITY || r.cityName || cityCode || '';
    const municipalApproved = r.status === 'pending-provincial' || r.status === 'approved';
    const provincialApproved = r.status === 'approved';
    return {
      ownerName: r.owner || '',
      ownerAddress: r.Owner_Address || '',
      ownerTin: r.Owner_TIN || '',
      ownerTel: r.Owner_Tel_no || '',
      adminName: r.ADMIN_NAME || r.ADMIN_NO || '',
      adminAddress: r.ADMIN_ADDRESS || '',
      adminTin: r.ADMIN_TIN || '',
      adminTel: r.ADMIN_TEL || '',
      pin: r.PIN || r.pPin || '',
      tdNo: r.TDN || r.pNewTdn || '',
      arpNo: r.ARP || '',
      transactionCode: r.TRANS_CD || 'GR',
      octTctNo: r.CER_TIT_NO || '',
      octTctDate: r.TCT_DATE || '',
      cadLotNo: r.CAD_LOT_NO || '',
      lotNo: r.LOTE_NO || '',
      cloaCscNo: r.CLOA_NO || '',
      cloaDate: r.CLOA_DATE || '',
      surveyNo: r.ASS_LOT_NO || '',
      blockNo: r.BLOCK_NO || '',
      location: {
        street: r.STREET || '',
        barangay: r.barangayName || r.barangay || '',
        municipality: municipalityName,
        province: r.PROV || 'Agusan del Norte',
      },
      backPart: {
        taxable: r.taxable || false,
        exempt: r.exempt || false,
        effQtr: r.effQtr || '',
        effYear: r.effYear || '',
        memoranda: r.memoranda || r.REM || '',
        superseded: {
          pin: r.pPin || '',
          tdNo: r.pOldTdn || '',
          landValue: r.pAssValueLand || 0,
          impvtValue: r.pAssValueImpvt || 0,
          totalValue: r.pAssValueTotal || 0,
          previousOwner: r.pOwner || '',
          effectivity: r.pEffDate || '',
          arPageNo: r.pArPageNo || '',
          recordingPersonnel: r.pRecordingPersonnel || '',
        },
        signatories: {
          appraiser: r.appraisedBy || '',
          appraiserDate: r.appraisedDate || '',
          recommending: municipalApproved ? (r.recApproval || '') : '',
          recommendingDate: municipalApproved ? (r.recAppDate || '') : '',
          approver: provincialApproved ? (r.approved || '') : '',
          approverDate: provincialApproved ? (r.approvedDate || '') : '',
        },
      },
      effectivityDate: r.pEffDate || '',
      declarationDate: r.approvedDate || '',
    };
  }, [record, municipalitiesList]);

  // Land form needs the same propertyInfo plus the cardinal boundaries.
  const landPropertyInfo = useMemo(() => {
    const r: any = record || {};
    return {
      ...buildingPropertyInfo,
      boundaries: {
        north: r.NORTH || '',
        east: r.EAST || '',
        south: r.SOUTH || '',
        west: r.WEST || '',
      },
    };
  }, [buildingPropertyInfo, record]);

  const MUNICIPAL_ASSESSOR_DEPARTMENT = 'Municipal Assessor Office';
  const MUNICIPAL_SIGNATORY_STORAGE_KEY = 'rptas.municipalApproval.signatoryId';
  const PROVINCIAL_ASSESSOR_DEPARTMENT = 'Provincial Assessor Office';
  const PROVINCIAL_SIGNATORY_STORAGE_KEY = 'rptas.provincialApproval.signatoryId';

  const { data: municipalSignatoriesResponse } = useSWR(
    ['setup-signatories', 'municipal-assessor'],
    () => listSetupSignatories({ department: MUNICIPAL_ASSESSOR_DEPARTMENT, isActive: 'true', page: 1, limit: 200 }),
    { revalidateOnFocus: false }
  );

  const { data: provincialSignatoriesResponse } = useSWR(
    ['setup-signatories', 'provincial-assessor'],
    () => listSetupSignatories({ department: PROVINCIAL_ASSESSOR_DEPARTMENT, isActive: 'true', page: 1, limit: 200 }),
    { revalidateOnFocus: false }
  );

  const municipalSignatories = municipalSignatoriesResponse?.data || [];
  const storedMunicipalSignatoryId = (() => {
    try {
      return localStorage.getItem(MUNICIPAL_SIGNATORY_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  })();

  const selectedMunicipalSignatory: SetupSignatory | null =
    (storedMunicipalSignatoryId && municipalSignatories.find(s => s.id === storedMunicipalSignatoryId)) || municipalSignatories[0] || null;

  const provincialSignatories = provincialSignatoriesResponse?.data || [];
  const storedProvincialSignatoryId = (() => {
    try {
      return localStorage.getItem(PROVINCIAL_SIGNATORY_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  })();

  const selectedProvincialSignatory: SetupSignatory | null =
    (storedProvincialSignatoryId && provincialSignatories.find(s => s.id === storedProvincialSignatoryId)) || provincialSignatories[0] || null;
  
  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // Fetch data
  useEffect(() => {
    if (!recordId) {
      setRecord(null);
      setAssessmentRecords([]);
      setIsLoading(false);
      return;
    }
    fetchData(recordId);
  }, [recordId]);

  // Auto-refresh when the page regains focus / becomes visible again, so an
  // approval made elsewhere (e.g. the Approvals list) is reflected here without
  // a manual Refresh. Skipped while an approval is in flight on this page.
  useEffect(() => {
    if (!recordId) return;
    const refresh = () => {
      if (document.visibilityState === 'visible' && !isApproving) {
        fetchData(recordId);
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [recordId, isApproving]);

  // NOTE: The signatory fields (Recommending Approval / Approved By / City &
  // Provincial Assessor) are NOT pre-filled here. They reflect the actual saved
  // approval data — the backend writes them only when an approval really happens
  // — so a pending record never looks already-approved.

  const fetchData = async (recordId: string) => {
    setIsLoading(true);
    let mappedRecord: PropertyRecord | null = null;
    
    try {
        // 1. Try fetching from FAAS (Supabase) by ID (UUID)
        try {
            const faasRecord = await getFaasRecord(recordId);
            if (faasRecord) {
                const innerData = faasRecord.data || {};
                const currentTdn = faasRecord.tdn || innerData.tdn || innerData.TDN || '';
                const currentPin = innerData.pin || innerData.PIN || '';
                const { tdn: _t, pin: _p, arp: _a, ...cleanInnerData } = innerData;

                mappedRecord = {
                    ...cleanInnerData,
                    id: faasRecord.id || recordId,
                    TDN: currentTdn,
                    ARP: currentTdn,
                    PIN: currentPin,
                    status: faasRecord.status,
                    owner: innerData.owner || innerData.owner_name || 'N/A',
                    barangay: innerData.barangay || 'N/A',
                    OWNER_NO: innerData.OWNER_NO || '',
                    // Signatory Fields
                    recApproval: innerData.Rec_Approval || innerData.recApproval,
                    recApprovalPos: innerData.Rec_ApprovalPos || innerData.recApprovalPos,
                    recAppDate: innerData.Rec_AppDate || innerData.recAppDate,
                    approved: innerData.Approved || innerData.approved,
                    approvedPos: innerData.ApprovedPos || innerData.approvedPos,
                    approvedDate: innerData.ApprovedDate || innerData.approvedDate,
                    provAssessor: innerData.provAssessor,
                    provAssessorPos: innerData.provAssessorPos,
                    provAssessorDate: innerData.provAssessorDate,
                    cityAssessor: innerData.cityAssessor,
                    cityAssessorPos: innerData.cityAssessorPos,
                    cityAssessorDate: innerData.cityAssessorDate,
                    municipalApprover: innerData.municipal_approver,
                    municipalApprovalDate: innerData.municipal_approval_date,
                    provincialApprover: innerData.provincial_approver,
                    provincialApprovalDate: innerData.provincial_approval_date,
                    assessments: innerData.assessments || []
                };
            }
        } catch (e) {
            // Not a FAAS record ID or not found
            console.log('Not a FAAS record ID, trying RPT Mast TDN...');
        }

        // 2. If not found in FAAS, try RPT Mast (Legacy) by TDN
        if (!mappedRecord) {
            const mastResponse = await getRptMastDataDirect({ searchField: 'TDN', filterValue: recordId });
            
            if (mastResponse.data && mastResponse.data.length > 0) {
                const item = mastResponse.data[0];
                const innerData = (item as any).data || {};
                
                const currentTdn = (item as any).tdn || innerData.tdn || innerData.TDN || '';
                const currentPin = innerData.pin || innerData.PIN || '';
                const { tdn: _t, pin: _p, arp: _a, ...cleanInnerData } = innerData;

                mappedRecord = {
                    ...cleanInnerData,
                    id: (item as any).id,
                    TDN: currentTdn,
                    ARP: currentTdn,
                    PIN: currentPin,
                    status: (item as any).status,
                    owner: innerData.owner || innerData.owner_name || 'N/A',
                    barangay: innerData.barangay || 'N/A',
                    OWNER_NO: innerData.OWNER_NO || '',
                    recApproval: innerData.Rec_Approval || innerData.recApproval,
                    recApprovalPos: innerData.Rec_ApprovalPos || innerData.recApprovalPos,
                    recAppDate: innerData.Rec_AppDate || innerData.recAppDate,
                    approved: innerData.Approved || innerData.approved,
                    approvedPos: innerData.ApprovedPos || innerData.approvedPos,
                    approvedDate: innerData.ApprovedDate || innerData.approvedDate,
                    cityAssessor: innerData.cityAssessor,
                    cityAssessorPos: innerData.cityAssessorPos,
                    cityAssessorDate: innerData.cityAssessorDate,
                    municipalApprover: innerData.municipal_approver,
                    municipalApprovalDate: innerData.municipal_approval_date,
                    provincialApprover: innerData.provincial_approver,
                    provincialApprovalDate: innerData.provincial_approval_date,
                    assessments: innerData.assessments || []
                };
            }
        }
        
        if (mappedRecord) {
            setRecord(mappedRecord);
            setComments((mappedRecord as any).REM || ''); 

            // Fetch Assessments
            if ((mappedRecord as any).assessments && (mappedRecord as any).assessments.length > 0) {
                setAssessmentRecords((mappedRecord as any).assessments);
            } else {
                const assData = await getRptAssByTdn(mappedRecord.TDN || (mappedRecord as any).tdn || '');
                setAssessmentRecords(assData || []);
            }
        } else {
            toast.error('Record not found');
            navigate('/dashboard/rptas/approvals/municipal');
        }
    } catch (error) {
      console.error('Error fetching record:', error);
      toast.error('Failed to load property details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!record) return;
    
    // Check permissions
    // Allow admin/Administrator always
    // If pending-municipal, allow 'approver' or 'municipal_assessor'
    // If pending-provincial, allow 'approver' or 'provincial_assessor'
    const userRole = user?.role?.toLowerCase() || '';
    const isAdmin = userRole === 'admin' || userRole === 'administrator';
    
    if (!isAdmin && userRole !== 'approver') {
         // Add specific checks if roles are defined
         if (record.status === 'pending-municipal' && !userRole.includes('municipal')) {
             toast.error('Only Municipal Assessors can perform this approval.');
             return;
         }
         if (record.status === 'pending-provincial' && !userRole.includes('provincial')) {
             toast.error('Only Provincial Assessors can perform this approval.');
             return;
         }
    }

    const nextStage = record.status === 'pending-municipal' ? 'Municipal' : 'Provincial';
    const nextStatus = record.status === 'pending-municipal' ? 'pending-provincial' : 'approved';
    const actionLabel = nextStatus === 'pending-provincial' ? 'Forward to Provincial' : 'Approve';

    const isConfirmed = await showConfirm({
        title: `${actionLabel} Property (${nextStage})`,
        message:
          nextStatus === 'approved'
            ? `Are you sure you want to approve this property assessment at the Provincial level? This will finalize the record.`
            : `Are you sure you want to forward this property assessment to the Provincial Assessor?`,
        confirmLabel: nextStatus === 'approved' ? `Approve (${nextStage})` : 'Forward to Provincial',
        cancelLabel: 'Cancel'
    });

    if (isConfirmed) {
        setIsApproving(true);
        try {
            const isFaasRecord = record.id && record.id.length === 36;
            
            if (isFaasRecord) {
                // Update FAAS status
             if (nextStatus === 'pending-provincial' && !selectedMunicipalSignatory?.name) {
               toast.error('Please set/select the Municipal Assessor signatory first.');
               return;
             }
             if (nextStatus === 'approved' && !selectedProvincialSignatory?.name) {
               toast.error('Please set/select the Provincial Assessor signatory first.');
               return;
             }
             await updateFaasStatus(
               record.id,
               nextStatus,
               comments,
               nextStatus === 'pending-provincial'
                 ? { approverName: selectedMunicipalSignatory?.name, approverPosition: selectedMunicipalSignatory?.title }
                 : nextStatus === 'approved'
                   ? { approverName: selectedProvincialSignatory?.name, approverPosition: selectedProvincialSignatory?.title }
                   : { approverName: user?.fullName || user?.name, approverPosition: user?.position }
             );
            } else {
                // Legacy support (simulated)
                await updateSignatory(record.TDN || (record as any).tdn || '', { 
                    status: nextStatus,
                    Approved: user?.name,
                    ApprovedDate: new Date().toISOString()
                });
            }
            
            toast.success(nextStatus === 'approved' ? 'Property approved successfully' : 'Property forwarded to Provincial successfully');
            fetchData(record.id); // Refresh
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(error.response?.data?.message || 'Failed to approve property');
        } finally {
            setIsApproving(false);
        }
    }
  };

  const handleRejectSubmit = async () => {
    if (!record || !actionReason) return;
    
    setIsApproving(true);
    try {
        const remarks = `[REJECTED by ${user?.name}: ${actionReason}] ${record.status === 'draft' ? '' : (comments || '')}`;
        const updateData = {
            status: 'rejected',
            REM: remarks
        };
        
        const isFaasRecord = record.id && record.id.length === 36;

        if (isFaasRecord) {
             await updateFaasStatus(
               record.id,
               'rejected',
               remarks,
               { approverName: user?.fullName || user?.name, approverPosition: user?.position }
             );
        } else {
             await updateSignatory(record.TDN || (record as any).tdn || '', updateData);
        }
        
        toast.success('Property rejected');
        setShowRejectDialog(false);
        setActionReason('');
        fetchData(record.id);
    } catch (error) {
        console.error('Rejection failed:', error);
        toast.error('Failed to reject property');
    } finally {
        setIsApproving(false);
    }
  };

  const handleRequestChangesSubmit = async () => {
    if (!record || !actionReason) return;

    setIsApproving(true);
    try {
        const remarks = `[CHANGES REQUESTED by ${user?.name}: ${actionReason}] ${comments || ''}`;
        const updateData = {
            status: 'draft', // Send back to draft
            REM: remarks
        };
        
        const isFaasRecord = record.id && record.id.length === 36;

        if (isFaasRecord) {
             await updateFaasStatus(
               record.id,
               'draft',
               remarks,
               { approverName: user?.fullName || user?.name, approverPosition: user?.position }
             );
        } else {
             await updateSignatory(record.TDN || (record as any).tdn || '', updateData);
        }
        
        toast.success('Changes requested');
        setShowRequestChangesDialog(false);
        setActionReason('');
        fetchData(record.id);
    } catch (error) {
        console.error('Request changes failed:', error);
        toast.error('Failed to request changes');
    } finally {
        setIsApproving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!record) return;

    const isConfirmed = await showConfirm({
      title: 'Submit for Review',
      message: 'Are you sure you want to submit this draft for Municipal Review?',
      confirmLabel: 'Submit',
      cancelLabel: 'Cancel'
    });

    if (isConfirmed) {
      setIsApproving(true);
      try {
        const isFaasRecord = record.id && record.id.length === 36;
        if (isFaasRecord) {
             // submitForReview now sets status to 'pending-municipal' in backend
             await updateFaasStatus(
               record.id,
               'pending-municipal',
               undefined,
               { approverName: user?.fullName || user?.name, approverPosition: user?.position }
             );
        } else {
             await updateSignatory(record.TDN || (record as any).tdn || '', { status: 'pending-municipal' });
        }
        toast.success('Submitted for Municipal Review successfully');
        fetchData(record.id);
      } catch (error) {
        console.error('Submission failed:', error);
        toast.error('Failed to submit for review');
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    if (record?.status === 'pending-municipal') {
      navigate('/dashboard/rptas/approvals/municipal');
      return;
    }
    if (record?.status === 'pending-provincial') {
      navigate('/dashboard/rptas/approvals/provincial');
      return;
    }
    navigate('/dashboard/rptas/approvals/municipal');
  };

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-surface">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted dark:text-muted font-medium">Loading property details...</p>
            </div>
        </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background dark:bg-surface">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted dark:text-muted font-medium">No property selected.</p>
          <button
            onClick={() => navigate('/dashboard/rptas/approvals/municipal')}
            className="px-4 py-2 bg-primary hover:bg-primary-light text-white dark:text-white rounded-lg transition-colors shadow-md font-medium text-sm"
          >
            Back to Approvals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background dark:bg-surface">
      {/* Header */}
      <div 
        className="bg-surface dark:bg-background border-b border-border dark:border-border px-6 py-4 shadow-sm z-10 border-t-4 border-t-primary"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
                onClick={handleBack}
                className="p-2 hover:bg-muted/10 dark:hover:bg-muted/20 rounded-full transition-colors"
            >
                <ArrowLeft size={20} className="text-muted dark:text-muted" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
                <FileText className="text-primary" />
                Property Approval
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted dark:text-muted mt-1">
                <span className="font-mono bg-muted/10 dark:bg-muted/20 px-2 py-0.5 rounded text-foreground dark:text-foreground">
                    TDN: {record?.TDN || (record as any)?.tdn}
                </span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                    record?.status === 'approved' 
                      ? 'bg-green-100 text-green-700' 
                      : record?.status === 'pending-municipal'
                      ? 'bg-primary/10 text-primary-light'
                      : record?.status === 'pending-provincial'
                      ? 'bg-purple-100 text-purple-700'
                      : record?.status?.includes('rejected')
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                }`}>
                    {record?.status === 'pending-municipal' ? 'Pending Municipal' : 
                     record?.status === 'pending-provincial' ? 'Pending Provincial' :
                     record?.status || 'Pending'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isApproving && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary/80 rounded-lg text-sm font-medium animate-pulse border border-primary/10 dark:border-primary/20 text-white dark:text-white">
                <RefreshCw size={16} className="animate-spin" />
                Processing...
              </div>
            )}
            <button
              onClick={() => navigate(`/dashboard/rptas/property-tracking?id=${record?.id || ''}`)}
              disabled={!record?.id}
              className="px-4 py-2 bg-surface dark:bg-muted/20 border border-border dark:border-border text-foreground dark:text-foreground rounded-lg hover:bg-muted/5 dark:hover:bg-muted/30 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <History size={16} />
              Track
            </button>
            <button
              onClick={() => setPrintOpen(true)}
              disabled={!record}
              className="px-4 py-2 bg-surface dark:bg-muted/20 border border-border dark:border-border text-foreground dark:text-foreground rounded-lg hover:bg-muted/5 dark:hover:bg-muted/30 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              Print Preview
            </button>
            {record?.status === 'draft' ? (
                <button
                    onClick={handleSubmitForReview}
                    disabled={isApproving}
                    className="px-4 py-2 bg-primary hover:bg-primary-light text-white dark:text-white rounded-lg transition-colors flex items-center gap-2 shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                    Submit for Review
                </button>
            ) : (
                <>
                    <button
                        onClick={() => setShowRequestChangesDialog(true)}
                        disabled={isApproving}
                        className="px-4 py-2 bg-surface dark:bg-muted/20 border border-border dark:border-border text-foreground dark:text-foreground rounded-lg hover:bg-muted/5 dark:hover:bg-muted/30 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MessageSquare size={16} />
                        Request Changes
                    </button>
                    <button
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isApproving}
                        className="px-4 py-2 bg-danger/10 dark:bg-red-900/20 border border-danger/30 dark:border-danger/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <XCircle size={16} />
                        Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle size={16} />
                        {record?.status === 'pending-municipal' ? 'Forward to Provincial' : 'Approve (Provincial)'}
                    </button>
                </>
            )}
          </div>
        </div>
        
        {/* Top Progress Bar */}
        {isApproving && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/10 dark:bg-primary/20 overflow-hidden">
            <div className="h-full bg-primary animate-[progress_1.5s_ease-in-out_infinite] w-full origin-left" style={{ animationName: 'indeterminate-progress' }}></div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content (Read Only) */}
        <div className="flex-1 overflow-auto bg-background dark:bg-surface relative">
            <PropertyDetailsView 
                selectedRecord={record} 
                assessmentRecords={assessmentRecords}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isFormEnabled={false}
                isAssessmentLoading={isLoading}
                onRecordUpdate={() => {}}
                onAssessmentUpdate={() => {}}
            />
        </div>

        {/* Sidebar (History & Comments) */}
        <div className="w-80 bg-surface dark:bg-background border-l border-border dark:border-border flex flex-col shadow-xl z-10">
            {/* Approval History Section */}
            <div className="p-4 border-b border-border dark:border-border bg-background dark:bg-background/50">
                <h3 className="font-semibold text-foreground dark:text-white flex items-center gap-2 mb-3">
                    <History size={16} />
                    Approval History
                </h3>
                <div className="space-y-4">
                    <div className="relative pl-4 border-l-2 border-border dark:border-border space-y-4">
                        {/* Current Status */}
                        <div className="relative">
                            {record?.status === 'approved' ? (
                                <CheckCircle size={16} className="absolute -left-[23px] top-0.5 text-white fill-green-500 rounded-full" />
                            ) : (
                                <Circle size={16} className="absolute -left-[23px] top-0.5 text-muted fill-white dark:fill-background rounded-full" />
                            )}
                            <div className="text-sm font-medium text-foreground dark:text-white">Current Status</div>
                            <div className="text-xs text-muted dark:text-muted capitalize">{record?.status || 'Draft'}</div>
                            {(record?.status === 'pending-provincial' || record?.status === 'pending-municipal') && (
                                <button
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle size={14} />
                                    {record?.status === 'pending-municipal' ? 'Forward to Provincial' : 'Approve'}
                                </button>
                            )}
                        </div>

                        {/* Provincial Approval — only after the record is actually approved
                            in-system. (record.approved can carry the legacy MSSQL "approved by"
                            value even on un-approved migrated records, so gate on status.) */}
                        {record?.status === 'approved' && (record as any)?.approved && (
                            <div className="relative">
                                <CheckCircle size={16} className="absolute -left-[23px] top-0.5 text-white fill-green-500 rounded-full" />
                                <div className="text-sm font-medium text-foreground dark:text-white">Approved</div>
                                <div className="text-xs text-muted dark:text-foreground">{(record as any).approved}</div>
                                <div className="text-xs text-muted">{(record as any).approvedDate ? new Date((record as any).approvedDate).toLocaleDateString() : '-'}</div>
                            </div>
                        )}
                        {/* Municipal Approval ("Recommended") — only once the municipal stage
                            has passed (forwarded to provincial, or fully approved). */}
                        {(record as any)?.recApproval && (record?.status === 'pending-provincial' || record?.status === 'approved') && (
                            <div className="relative">
                                <CheckCircle size={16} className="absolute -left-[23px] top-0.5 text-white fill-green-500 rounded-full" />
                                <div className="text-sm font-medium text-foreground dark:text-white">Recommended</div>
                                <div className="text-xs text-muted dark:text-foreground">{(record as any).recApproval}</div>
                                <div className="text-xs text-muted">{(record as any).recAppDate ? new Date((record as any).recAppDate).toLocaleDateString() : '-'}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <h3 className="font-semibold text-foreground dark:text-white flex items-center gap-2 mb-3">
                    <MessageSquare size={16} />
                    Comments & Notes
                </h3>
                
                {/* Comments List (Using REM field content) */}
                <div className="flex-1 overflow-auto space-y-3 mb-4 pr-1">
                    {comments ? (
                        <div className="bg-muted/10 dark:bg-muted/20/50 p-3 rounded-lg text-sm text-foreground dark:text-foreground">
                            {comments}
                        </div>
                    ) : (
                        <div className="text-center text-muted text-xs py-4 italic">
                            No comments yet.
                        </div>
                    )}
                </div>

                {/* Add Comment Input (Disabled for now as we use Dialogs for actions) */}
                <div className="mt-auto pt-4 border-t border-border dark:border-border">
                    <div className="text-xs text-muted mb-2">
                        Note: Use "Request Changes" or "Reject" to add formal feedback.
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Print Preview Dialog — paper Tax Declaration with Municipal + Provincial signatories */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-[920px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer size={18} /> Tax Declaration — Print Preview
            </DialogTitle>
          </DialogHeader>
          {/* p-8 = on-screen preview margin (mirrors the printed @page margin;
              padding sits outside printRef so it is not added on top in print) */}
          <div className="bg-white rounded-md border border-border overflow-auto p-8">
            <div ref={printRef}>
              {isBuilding ? (
                <PrintBuildingDocument
                  propertyInfo={buildingPropertyInfo as any}
                  bldgStruc={bldgStruc}
                  bldgAdj={bldgAdj}
                  assessmentRows={printData.assessmentRows as any}
                  summary={printData.summary}
                />
              ) : (
                <PrintLandDocument
                  propertyInfo={landPropertyInfo as any}
                  assessmentRows={printData.assessmentRows as any}
                  summary={printData.summary}
                />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setPrintOpen(false)}
              className="px-4 py-2 bg-surface dark:bg-muted/20 border border-border text-foreground rounded-lg hover:bg-muted/5 transition-colors text-sm font-medium"
            >
              Close
            </button>
            <button
              onClick={() => handlePrint()}
              className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg transition-colors flex items-center gap-2 shadow-md text-sm font-medium"
            >
              <Printer size={16} />
              Print
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Property Assessment</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <label className="block text-sm font-medium text-foreground dark:text-foreground mb-2">
                    Reason for Rejection
                </label>
                <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-border dark:border-border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-surface dark:bg-background text-sm"
                    placeholder="Please provide a reason for rejecting this assessment..."
                />
            </div>
            <DialogFooter>
                <button
                    onClick={() => setShowRejectDialog(false)}
                    className="px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                    Cancel
                </button>
                <button
                    onClick={handleRejectSubmit}
                    disabled={!actionReason.trim()}
                    className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Confirm Rejection
                </button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={showRequestChangesDialog} onOpenChange={setShowRequestChangesDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Request Changes</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <label className="block text-sm font-medium text-foreground dark:text-foreground mb-2">
                    Feedback / Required Changes
                </label>
                <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-border dark:border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-surface dark:bg-background text-sm"
                    placeholder="Describe what changes are needed..."
                />
            </div>
            <DialogFooter>
                <button
                    onClick={() => setShowRequestChangesDialog(false)}
                    className="px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                    Cancel
                </button>
                <button
                    onClick={handleRequestChangesSubmit}
                    disabled={!actionReason.trim()}
                    className="px-4 py-2 text-sm bg-primary hover:bg-primary-light text-white dark:text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Submit Request
                </button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyApproval;
