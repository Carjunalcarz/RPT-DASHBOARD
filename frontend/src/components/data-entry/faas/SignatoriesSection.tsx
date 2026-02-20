import React, { useState } from 'react';
import { Save, X, RefreshCw, Users, Paperclip } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';

interface DocumentationData {
  preparedBy: string;
  datePrepared: string;
}

interface RemarksData {
  remarks: string;
}

interface SwornStatementData {
  landMarketValue: string;
  improvementsMarketValue: string;
  signatory: string;
  tin1: string;
  dateSubscribed: string;
  taxCertNo: string;
  taxCertDateIssued: string;
  taxCertPlaceIssued: string;
  officialAdministeringOath: string;
  officialTitle: string;
  tin2: string;
  representativeName: string;
  swornStatementNo: string;
  swornStatementDate: string;
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

const defaultSwornData: SwornStatementData = {
  landMarketValue: '0.00',
  improvementsMarketValue: '0.00',
  signatory: 'REVISED FOR THE OWNER PURSUANT TO SEC. 204 OF R.A. 7160',
  tin1: '',
  dateSubscribed: '',
  taxCertNo: '',
  taxCertDateIssued: '',
  taxCertPlaceIssued: '',
  officialAdministeringOath: '',
  officialTitle: '',
  tin2: '',
  representativeName: '',
  swornStatementNo: '',
  swornStatementDate: '',
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

const SignatoriesSection: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [activeSubTab, setActiveSubTab] = useState<'signatories' | 'memorandum' | 'sworn' | 'documentation' | 'remarks'>('signatories');
  const [formData, setFormData] = useState<SignatoriesFormData>(defaultFormData);
  const [swornData, setSwornData] = useState<SwornStatementData>(defaultSwornData);
  const [documentationData, setDocumentationData] = useState<DocumentationData>(defaultDocumentationData);
  const [remarksData, setRemarksData] = useState<RemarksData>(defaultRemarksData);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    // Save logic here
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(defaultFormData);
  };

  const handleRefresh = () => {
    // Refresh logic here
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
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-200 dark:border-slate-700">
      <div className="col-span-2 flex items-center gap-2">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={formData[sgdField] as boolean}
            onChange={(e) => setFormData({ ...formData, [sgdField]: e.target.checked })}
            disabled={!isEditing}
            className="w-3 h-3 rounded border-slate-300 dark:border-slate-600"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">SGD</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={formData[tpdField] as boolean}
            onChange={(e) => setFormData({ ...formData, [tpdField]: e.target.checked })}
            disabled={!isEditing}
            className="w-3 h-3 rounded border-slate-300 dark:border-slate-600"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">TPD</span>
        </label>
      </div>
      <div className="col-span-3">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{label}:</label>
        <select
          value={formData[nameField] as string}
          onChange={(e) => setFormData({ ...formData, [nameField]: e.target.value })}
          disabled={!isEditing}
          className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        >
          <option value="">{formData[nameField] || ''}</option>
        </select>
      </div>
      <div className="col-span-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Position:</label>
        <input
          type="text"
          value={formData[positionField] as string}
          onChange={(e) => setFormData({ ...formData, [positionField]: e.target.value })}
          disabled={!isEditing}
          className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        />
      </div>
      <div className="col-span-3">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date:</label>
        <input
          type="date"
          value={formData[dateField] as string}
          onChange={(e) => setFormData({ ...formData, [dateField]: e.target.value })}
          disabled={!isEditing}
          className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-lg"
        style={{
          background: 'var(--header-gradient)',
          ['--header-gradient' as any]: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)`,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            .dark div[style*="--header-gradient"] {
              --header-gradient: linear-gradient(to right, ${headerColorDark}, ${headerColorDark}dd) !important;
            }
          }
        `}</style>
        <div className="flex items-center gap-2">
          <Users size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">Signatories / Memorandum of TDN 25-07-0001-00005</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleSave}
            disabled={!isEditing}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isEditing}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={14} />
            Cancel
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5">
            Close
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-2 pt-2">
        <div className="flex gap-1">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {activeSubTab === 'signatories' && (
          <div className="space-y-0">
            {renderSignatoryRow('Appraised By', 'appraisedBy', 'appraisedPosition', 'appraisedDate', 'appraisedSGD', 'appraisedTPD')}
            {renderSignatoryRow('Assessed By', 'assessedBy', 'assessedPosition', 'assessedDate', 'assessedSGD', 'assessedTPD')}
            {renderSignatoryRow('Checked and Reviewed', 'checkedBy', 'checkedPosition', 'checkedDate', 'checkedSGD', 'checkedTPD')}
            {renderSignatoryRow('Recommending Approval', 'recommendingBy', 'recommendingPosition', 'recommendingDate', 'recommendingSGD', 'recommendingTPD')}
            {renderSignatoryRow('Approved By', 'approvedBy', 'approvedPosition', 'approvedDate', 'approvedSGD', 'approvedTPD')}
            {renderSignatoryRow('Provincial Assessor', 'provincialAssessor', 'provincialPosition', 'provincialDate', 'provincialSGD', 'provincialTPD')}
            {renderSignatoryRow('City/Municipal Assessor', 'cityAssessor', 'cityPosition', 'cityDate', 'citySGD', 'cityTPD')}
            {renderSignatoryRow('Deputy', 'deputy', 'deputyPosition', 'deputyDate', 'deputySGD', 'deputyTPD')}
            
            {/* Entry Date Row */}
            <div className="grid grid-cols-12 gap-2 items-center py-2 mt-4 border-t-2 border-slate-300 dark:border-slate-600">
              <div className="col-span-2"></div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Entry Date:</label>
                <input
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
              <div className="col-span-7">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">By:</label>
                <select
                  value={formData.entryBy}
                  onChange={(e) => setFormData({ ...formData, entryBy: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value=""></option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'memorandum' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Other Memorandum
              </label>
              <textarea
                value="Revised pursuant to Sec. 219 of R.A. 7160 and as implemented by S.P. Ordinance No. 737-2025- 6th General Revision. NOTE: THIS BLDG. IS CONSTRUCTED ON THE LOT OF THE SAME OWNER UNDER T.D. NO. 25-07-0001-00004."
                onChange={(e) => {}}
                disabled={!isEditing}
                rows={15}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 font-mono"
              />
            </div>
          </div>
        )}

        {activeSubTab === 'sworn' && (
          <div className="space-y-2">
            {/* Land and Improvements Market Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Land Market Value:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.landMarketValue}
                  onChange={(e) => setSwornData({ ...swornData, landMarketValue: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Improvements Market Value:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.improvementsMarketValue}
                  onChange={(e) => setSwornData({ ...swornData, improvementsMarketValue: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Signatory */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Signatory:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.signatory}
                  onChange={(e) => setSwornData({ ...swornData, signatory: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* TIN */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  TIN:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.tin1}
                  onChange={(e) => setSwornData({ ...swornData, tin1: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Date Subscribed */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Date Subscribed:
                </label>
              </div>
              <div>
                <input
                  type="date"
                  value={swornData.dateSubscribed}
                  onChange={(e) => setSwornData({ ...swornData, dateSubscribed: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Tax Cert. No. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Tax Cert. No.:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.taxCertNo}
                  onChange={(e) => setSwornData({ ...swornData, taxCertNo: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Tax Cert. Date Issued */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Tax Cert. Date Issued:
                </label>
              </div>
              <div>
                <input
                  type="date"
                  value={swornData.taxCertDateIssued}
                  onChange={(e) => setSwornData({ ...swornData, taxCertDateIssued: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Tax Cert. Place Issued */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Tax Cert. Place Issued:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.taxCertPlaceIssued}
                  onChange={(e) => setSwornData({ ...swornData, taxCertPlaceIssued: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Official Administering Oath */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Official Administering Oath:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.officialAdministeringOath}
                  onChange={(e) => setSwornData({ ...swornData, officialAdministeringOath: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Official Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Official Title:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.officialTitle}
                  onChange={(e) => setSwornData({ ...swornData, officialTitle: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* TIN (second) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  TIN:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.tin2}
                  onChange={(e) => setSwornData({ ...swornData, tin2: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Representative Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Representative Name:
                </label>
              </div>
              <div>
                <input
                  type="text"
                  value={swornData.representativeName}
                  onChange={(e) => setSwornData({ ...swornData, representativeName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Sworn Statement No and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 text-right pr-2">
                  Sworn Statement No:
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={swornData.swornStatementNo}
                  onChange={(e) => setSwornData({ ...swornData, swornStatementNo: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sworn Statement Date:
                  </label>
                  <input
                    type="date"
                    value={swornData.swornStatementDate}
                    onChange={(e) => setSwornData({ ...swornData, swornStatementDate: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'documentation' && (
          <div className="space-y-3">
            {/* Prepared By */}
            <div className="grid grid-cols-4 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Prepared By:
              </label>
              <div className="col-span-3">
                <select
                  value={documentationData.preparedBy}
                  onChange={(e) => setDocumentationData({ ...documentationData, preparedBy: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value=""></option>
                </select>
              </div>
            </div>

            {/* Date Prepared */}
            <div className="grid grid-cols-4 gap-3 items-center">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                Date Prepared:
              </label>
              <div className="col-span-3">
                <input
                  type="date"
                  value={documentationData.datePrepared}
                  onChange={(e) => setDocumentationData({ ...documentationData, datePrepared: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Attachment Document Button */}
            <div className="mt-6">
              <button
                disabled={!isEditing}
                className="px-4 py-2 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={!isEditing}
                rows={15}
                placeholder="Enter remarks here..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignatoriesSection;