import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { getRptMastDataDirect, updateSignatory } from '@/services/rptMastService';
import { getRptAssByTdn } from '@/services/rptAssService';
import { getFaasRecord, updateFaasStatus } from '@/services/faasService';
import PropertyDetailsView from '@/components/RPT-management/faas/rpt_m_PropertyDetailsView';
import { toast } from 'sonner';
import { CheckCircle, XCircle, MessageSquare, ArrowLeft, History, FileText, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PropertyRecord } from '@/components/RPT-management/faas/types';

const PropertyApproval: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { headerColor } = useThemeColor();
  const { user } = useAuth();
  const { showConfirm } = useAlert();

  const [record, setRecord] = useState<PropertyRecord | null>(null);
  const [assessmentRecords, setAssessmentRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [activeTab, setActiveTab] = useState('property-info');
  const [comments, setComments] = useState('');
  
  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // Fetch data
  useEffect(() => {
    if (id) {
      fetchData(id);
    }
  }, [id]);

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
                    recApproval: innerData.Rec_Approval,
                    recApprovalPos: innerData.Rec_ApprovalPos,
                    recAppDate: innerData.Rec_AppDate,
                    approved: innerData.Approved,
                    approvedPos: innerData.ApprovedPos,
                    approvedDate: innerData.ApprovedDate,
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
                    recApproval: innerData.Rec_Approval,
                    recApprovalPos: innerData.Rec_ApprovalPos,
                    recAppDate: innerData.Rec_AppDate,
                    approved: innerData.Approved,
                    approvedPos: innerData.ApprovedPos,
                    approvedDate: innerData.ApprovedDate,
                    assessments: innerData.assessments || []
                };
            }
        }
        
        if (mappedRecord) {
            setRecord(mappedRecord);
            setComments(mappedRecord.REM || ''); 

            // Fetch Assessments
            if (mappedRecord.assessments && mappedRecord.assessments.length > 0) {
                setAssessmentRecords(mappedRecord.assessments);
            } else {
                const assData = await getRptAssByTdn(mappedRecord.TDN);
                setAssessmentRecords(assData || []);
            }
        } else {
            toast.error('Record not found');
            navigate('/rpt-management');
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

    const isConfirmed = await showConfirm({
        title: `Approve Property (${nextStage})`,
        message: `Are you sure you want to approve this property assessment at the ${nextStage} level? ${nextStatus === 'approved' ? 'This will finalize the record.' : 'This will forward it to the Provincial Assessor.'}`,
        confirmLabel: `Approve (${nextStage})`,
        cancelLabel: 'Cancel'
    });

    if (isConfirmed) {
        setIsApproving(true);
        try {
            const isFaasRecord = record.id && record.id.length === 36;
            
            if (isFaasRecord) {
                // Update FAAS status
                await updateFaasStatus(record.id, nextStatus, comments);
            } else {
                // Legacy support (simulated)
                await updateSignatory(record.TDN, { 
                    status: nextStatus,
                    Approved: user?.name,
                    ApprovedDate: new Date().toISOString()
                });
            }
            
            toast.success(`Property approved (${nextStage}) successfully`);
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
             await updateFaasStatus(record.id, 'rejected', remarks);
        } else {
             await updateSignatory(record.TDN, updateData);
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
             await updateFaasStatus(record.id, 'draft', remarks);
        } else {
             await updateSignatory(record.TDN, updateData);
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
             await updateFaasStatus(record.id, 'pending-municipal');
        } else {
             await updateSignatory(record.TDN, { status: 'pending-municipal' });
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
    if (record?.status === 'pending-municipal') {
      navigate('/approvals/municipal');
      return;
    }
    if (record?.status === 'pending-provincial') {
      navigate('/approvals/provincial');
      return;
    }
    navigate('/approvals');
  };

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading property details...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div 
        className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shadow-sm z-10"
        style={{ borderTop: `4px solid ${headerColor}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-600" />
                Property Approval
              </h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    TDN: {record?.TDN}
                </span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                    record?.status === 'approved' 
                      ? 'bg-green-100 text-green-700' 
                      : record?.status === 'pending-municipal'
                      ? 'bg-blue-100 text-blue-700'
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
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium animate-pulse border border-blue-100 dark:border-blue-800">
                <RefreshCw size={16} className="animate-spin" />
                Processing...
              </div>
            )}
            {record?.status === 'draft' ? (
                <button
                    onClick={handleSubmitForReview}
                    disabled={isApproving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                    Submit for Review
                </button>
            ) : (
                <>
                    <button
                        onClick={() => setShowRequestChangesDialog(true)}
                        disabled={isApproving}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MessageSquare size={16} />
                        Request Changes
                    </button>
                    <button
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isApproving}
                        className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Approve ({record?.status === 'pending-municipal' ? 'Municipal' : 'Provincial'})
                    </button>
                </>
            )}
          </div>
        </div>
        
        {/* Top Progress Bar */}
        {isApproving && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
            <div className="h-full bg-blue-600 animate-[progress_1.5s_ease-in-out_infinite] w-full origin-left" style={{ animationName: 'indeterminate-progress' }}></div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content (Read Only) */}
        <div className="flex-1 p-4 overflow-hidden">
            <PropertyDetailsView
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isFormEnabled={false} // Read-only mode
                selectedRecord={record}
                assessmentRecords={assessmentRecords}
                isAssessmentLoading={false}
                onRecordUpdate={() => {}}
                onAssessmentUpdate={() => {}}
            />
        </div>

        {/* Sidebar (History & Comments) */}
        <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl z-10">
            {/* Approval History Section */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                    <History size={16} />
                    Approval History
                </h3>
                <div className="space-y-4">
                    <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-600 space-y-4">
                        {/* Current Status */}
                        <div className="relative">
                            <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                                record?.status === 'approved' ? 'bg-green-500' : 'bg-blue-500'
                            }`}></div>
                            <div className="text-sm font-medium text-slate-800 dark:text-white">Current Status</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{record?.status || 'Draft'}</div>
                        </div>

                        {/* Approval Log (Mocked/Derived from Signatories) */}
                        {record?.approved && (
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-800"></div>
                                <div className="text-sm font-medium text-slate-800 dark:text-white">Approved</div>
                                <div className="text-xs text-slate-600 dark:text-slate-300">{record.approved}</div>
                                <div className="text-xs text-slate-400">{record.approvedDate ? new Date(record.approvedDate).toLocaleDateString() : '-'}</div>
                            </div>
                        )}
                        {record?.recApproval && (
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800"></div>
                                <div className="text-sm font-medium text-slate-800 dark:text-white">Recommended</div>
                                <div className="text-xs text-slate-600 dark:text-slate-300">{record.recApproval}</div>
                                <div className="text-xs text-slate-400">{record.recAppDate ? new Date(record.recAppDate).toLocaleDateString() : '-'}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                    <MessageSquare size={16} />
                    Comments & Notes
                </h3>
                
                {/* Comments List (Using REM field content) */}
                <div className="flex-1 overflow-auto space-y-3 mb-4 pr-1">
                    {comments ? (
                        <div className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                            {comments}
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 text-xs py-4 italic">
                            No comments yet.
                        </div>
                    )}
                </div>

                {/* Add Comment Input (Disabled for now as we use Dialogs for actions) */}
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-2">
                        Note: Use "Request Changes" or "Reject" to add formal feedback.
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Property Assessment</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason for Rejection
                </label>
                <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-sm"
                    placeholder="Please provide a reason for rejecting this assessment..."
                />
            </div>
            <DialogFooter>
                <button
                    onClick={() => setShowRejectDialog(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Feedback / Required Changes
                </label>
                <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-sm"
                    placeholder="Describe what changes are needed..."
                />
            </div>
            <DialogFooter>
                <button
                    onClick={() => setShowRequestChangesDialog(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                    Cancel
                </button>
                <button
                    onClick={handleRequestChangesSubmit}
                    disabled={!actionReason.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
