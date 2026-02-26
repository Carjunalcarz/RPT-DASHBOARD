import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer, FileText } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';

interface ReferenceRecord {
  id: string;
  tdn: string;
  extn1: string;
  arp: string;
  extn2: string;
  pin: string;
  extn3: string;
  marketValue: string;
  assessedValue: string;
}

interface ReferenceFormData {
  tdn: string;
  extn1: string;
  arp: string;
  extn2: string;
  pin: string;
  extn3: string;
  effDate: string;
  ownerCode: string;
  ownerNo: string;
  ownerName: string;
  marketValue: string;
  assessedValue: string;
  improvement: string;
  area: string;
  areaUnit: string;
}

const defaultFormData: ReferenceFormData = {
  tdn: '',
  extn1: '',
  arp: '',
  extn2: '',
  pin: '',
  extn3: '',
  effDate: '',
  ownerCode: '',
  ownerNo: '',
  ownerName: '',
  marketValue: '0.00',
  assessedValue: '0.00',
  improvement: '0.00',
  area: '0.00',
  areaUnit: 'sq. m',
};

interface ReferenceSectionProps {
  selectedRecord?: any;
  isEnabled?: boolean;
}

const ReferenceSection: React.FC<ReferenceSectionProps> = ({ selectedRecord: initialRecord, isEnabled = true }) => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [records, setRecords] = useState<ReferenceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ReferenceRecord | null>(null);
  const [formData, setFormData] = useState<ReferenceFormData>(defaultFormData);
  const [isEditing, setIsEditing] = useState(false);

  // Populate form when selectedRecord prop changes
  useEffect(() => {
    if (initialRecord) {
      // Map API fields to form data
      setFormData({
        tdn: initialRecord.pOldTdn || '',
        extn1: '', // Not in API response example
        arp: initialRecord.canArp || '',
        extn2: '', // Not in API response example
        pin: initialRecord.pPin || '',
        extn3: '', // Not in API response example
        effDate: initialRecord.pEffDate ? initialRecord.pEffDate.split('T')[0] : '',
        ownerCode: initialRecord.pOwnerCode || '',
        ownerNo: initialRecord.pOwnerNo || '',
        ownerName: initialRecord.pOwner || '',
        marketValue: initialRecord.pMarketValue?.toString() || '0.00',
        assessedValue: initialRecord.pAssessedValue?.toString() || '0.00',
        improvement: '0.00', // Not explicitly in API response example
        area: initialRecord.pArea?.toString() || '0.00',
        areaUnit: initialRecord.pAreaM === true ? 'ha' : 'sq. m',
      });

      // Populate table with this single reference record
      const newRecord: ReferenceRecord = {
        id: initialRecord.id || 'initial-ref',
        tdn: initialRecord.pOldTdn || '',
        extn1: '',
        arp: initialRecord.canArp || '',
        extn2: '',
        pin: initialRecord.pPin || '',
        extn3: '',
        marketValue: initialRecord.pMarketValue?.toString() || '0.00',
        assessedValue: initialRecord.pAssessedValue?.toString() || '0.00',
      };
      setRecords([newRecord]);
      setSelectedRecord(newRecord);
    } else {
      setRecords([]);
      setSelectedRecord(null);
      setFormData(defaultFormData);
    }
  }, [initialRecord]);

  const handleRowSelect = (record: ReferenceRecord) => {
    if (isEditing) return;
    setSelectedRecord(record);
    // In a real scenario, we might need to fetch full details if the table record is partial.
    // For now, since we only have one record populated from the same source, the form data is already set or persisted.
    // If we support multiple records, we need to find the full data corresponding to this ID.
    
    // If we have multiple records, we should update formData here based on the selected record.
    // However, ReferenceRecord interface is a subset. 
    // Ideally, `records` should store the full `ReferenceFormData` or `initialRecord` structure.
    // For this specific task (showing the single P_* record), we assume form matches current view.
  };

  const handleAdd = () => {
    setIsEditing(true);
    setFormData(defaultFormData);
    setSelectedRecord(null);
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
  };

  const handleDelete = () => {
    if (!selectedRecord) return;
    if (window.confirm('Are you sure you want to delete this reference?')) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
      setFormData(defaultFormData);
    }
  };

  const handleSave = () => {
    // Construct new record from form data
    const newRecord: ReferenceRecord = {
      id: selectedRecord?.id || `new-ref-${Date.now()}`,
      tdn: formData.tdn,
      extn1: formData.extn1,
      arp: formData.arp,
      extn2: formData.extn2,
      pin: formData.pin,
      extn3: formData.extn3,
      marketValue: formData.marketValue,
      assessedValue: formData.assessedValue,
    };

    if (selectedRecord) {
      // Update existing
      setRecords(prev => prev.map(r => r.id === selectedRecord.id ? newRecord : r));
    } else {
      // Add new
      setRecords(prev => [...prev, newRecord]);
    }
    
    setSelectedRecord(newRecord);
    setIsEditing(false);
    // Save logic here (e.g. API call if needed)
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(defaultFormData);
  };

  const handleRefresh = () => {
    // Refresh logic here
  };

  const isLocalFormEnabled = isEditing;
  const canModify = isEnabled && !isLocalFormEnabled;

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
          <FileText size={20} className="text-white" />
          <h2 className="text-base font-semibold text-white">
            Reference Information of TDN {initialRecord ? initialRecord.tdn : ''}
          </h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={handleAdd}
            disabled={!canModify}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedRecord || !canModify}
            className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
          <button
            onClick={handleSave}
            disabled={!isLocalFormEnabled}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isLocalFormEnabled}
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
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Reference Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead
            className="text-white"
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
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">TDN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Extn.</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">ARP</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Extn.</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">PIN</th>
              <th className="px-2 py-2 text-left font-medium border-r border-white/30">Extn.</th>
              <th className="px-2 py-2 text-right font-medium border-r border-white/30">Market Value</th>
              <th className="px-2 py-2 text-right font-medium">Assessed Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No reference records found. Click "Add" to create a new reference.
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={record.id}
                  onClick={() => handleRowSelect(record)}
                  className={`cursor-pointer transition-colors ${
                    selectedRecord?.id === record.id
                      ? 'bg-blue-100 dark:bg-blue-900/40'
                      : index % 2 === 0
                      ? 'bg-slate-50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      : 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.tdn}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.extn1}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.arp}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.extn2}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.pin}</td>
                  <td className="px-2 py-2 font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.extn3}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{record.marketValue}</td>
                  <td className="px-2 py-2 text-right font-mono text-slate-700 dark:text-slate-300">{record.assessedValue}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reference Form */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        <div className="grid grid-cols-12 gap-2">
          {/* Row 1: TDN, ARP, PIN */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">TDN:</label>
            <input
              type="text"
              value={formData.tdn}
              onChange={(e) => setFormData({ ...formData, tdn: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Extn.:</label>
            <input
              type="text"
              value={formData.extn1}
              onChange={(e) => setFormData({ ...formData, extn1: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ARP:</label>
            <input
              type="text"
              value={formData.arp}
              onChange={(e) => setFormData({ ...formData, arp: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Extn.:</label>
            <input
              type="text"
              value={formData.extn2}
              onChange={(e) => setFormData({ ...formData, extn2: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">PIN:</label>
            <input
              type="text"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Extn.:</label>
            <input
              type="text"
              value={formData.extn3}
              onChange={(e) => setFormData({ ...formData, extn3: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Row 2: Eff. Date, Owner Info */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Eff. Date:</label>
            <input
              type="date"
              value={formData.effDate}
              onChange={(e) => setFormData({ ...formData, effDate: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner Code:</label>
            <input
              type="text"
              value={formData.ownerCode}
              onChange={(e) => setFormData({ ...formData, ownerCode: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner No.:</label>
            <input
              type="text"
              value={formData.ownerNo}
              onChange={(e) => setFormData({ ...formData, ownerNo: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-6">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Owner Name:</label>
            <input
              type="text"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Row 3: Values */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Market Value:</label>
            <input
              type="text"
              value={formData.marketValue}
              onChange={(e) => setFormData({ ...formData, marketValue: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assessed Value:</label>
            <input
              type="text"
              value={formData.assessedValue}
              onChange={(e) => setFormData({ ...formData, assessedValue: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Improvement:</label>
            <input
              type="text"
              value={formData.improvement}
              onChange={(e) => setFormData({ ...formData, improvement: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Area:</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">&nbsp;</label>
            <select
              value={formData.areaUnit}
              onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value })}
              disabled={!isEditing}
              className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="sq. m">sq. m</option>
              <option value="sq. ft">sq. ft</option>
              <option value="ha">ha</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferenceSection;