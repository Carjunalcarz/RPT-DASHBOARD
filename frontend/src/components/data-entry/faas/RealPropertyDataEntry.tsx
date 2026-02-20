import React, { useState, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, RefreshCw, Printer,
  FileText, CreditCard, Search, ChevronDown, Building2,
  User, MapPin, Info, DollarSign
} from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';
import PropertyInformationSection from './PropertyInformationSection';
import PropertyOwnerSection from './PropertyOwnerSection';
import PropertyBoundariesSection from './PropertyBoundariesSection';
import AssessmentSection from './AssessmentSection';
import ReferenceSection from './ReferenceSection';
import SignatoriesSection from './SignatoriesSection';
import PreviousTDNsSection from './PreviousTDNsSection';
import TaxDecSheetSection from './TaxDecSheetSection';
import OtherPropertyTab from '../OtherPropertyTab';

// Types
interface PropertyRecord {
  id: string;
  tdn: string;
  arp: string;
  pin: string;
  ownerNo: string;
  owner: string;
}

// Sample data
const sampleRecords: PropertyRecord[] = [
  { id: '1', tdn: '25-07-0001-00002', arp: '25-07-0001-0000', pin: '053-07-0001-002-01', ownerNo: 'MGS07-2007-07-', owner: 'RICAFORTE, FELIX' },
  { id: '2', tdn: '25-07-0001-00003', arp: '25-07-0001-0000', pin: '053-07-0001-002-01-1001', ownerNo: 'MGS07-2007-07-', owner: 'MASENDO, ZOILO' },
  { id: '3', tdn: '25-07-0001-00004', arp: '25-07-0001-0000', pin: '053-07-0001-002-02', ownerNo: 'MGS07-2007-07-', owner: 'MASINDO, ZOILO' },
  { id: '4', tdn: '25-07-0001-00005', arp: '25-07-0001-0000', pin: '053-07-0001-002-02-1001', ownerNo: 'MGS07-2007-07-', owner: 'MASENDO, ZOILO' },
  { id: '5', tdn: '25-07-0001-00006', arp: '25-07-0001-0000', pin: '053-07-0001-002-03', ownerNo: 'MGS07-2011-07-', owner: 'CABINTOY, BERNADITA B. HRS. OF' },
  { id: '6', tdn: '25-07-0001-00007', arp: '25-07-0001-0000', pin: '053-07-0001-002-04', ownerNo: 'MGS07-2011-07-', owner: 'JUSTAN, RUFINA B. HRS. OF' },
];

const RealPropertyDataEntry: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  
  // Records state
  const [records, setRecords] = useState<PropertyRecord[]>(sampleRecords);
  const [selectedRecord, setSelectedRecord] = useState<PropertyRecord | null>(sampleRecords[4]);
  const [totalRecords] = useState(6529);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Search/Filter state
  const [searchField, setSearchField] = useState('TDN');
  const [filterValue, setFilterValue] = useState('%');
  const [additionalSearch, setAdditionalSearch] = useState('All Records');
  const [searchText, setSearchText] = useState('');

  // Active tab state
  const [activeTab, setActiveTab] = useState('property-info');

  // Handlers
  const handleRowSelect = (record: PropertyRecord) => {
    if (isEditing || isAdding) return;
    setSelectedRecord(record);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setIsEditing(false);
    setSelectedRecord(null);
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleDelete = () => {
    if (!selectedRecord) return;
    if (window.confirm('Are you sure you want to delete this record?')) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
      setSelectedRecord(null);
    }
  };

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleRefresh = () => {
    console.log('Refreshing data...');
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
            disabled={!isFormEnabled}
            className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-save"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={!isFormEnabled}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="btn-cancel"
          >
            <X size={14} />
            Cancel
          </button>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* Utility Buttons */}
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
          <button className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
            <FileText size={14} />
            Transaction
          </button>
          <button className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
            <DollarSign size={14} />
            Payment Inq.
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Records Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-sm" data-testid="records-table">
              <thead
                className="text-white sticky top-0"
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
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">TDN</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">ARP</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">PIN</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">OWNER NO.</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">OWNER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((record, index) => (
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
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{record.tdn}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{record.arp}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{record.pin}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tracking-wider">{record.ownerNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{record.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Field */}
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Filter Value:
              </label>
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="filter-value"
              />
              <button className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                APPLY FILTER
              </button>
            </div>

            {/* Additional Search */}
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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
                />
                <PropertyBoundariesSection
                  isEnabled={isFormEnabled}
                />
              </>
            )}

            {activeTab === 'assessment' && (
              <AssessmentSection
                isEnabled={isFormEnabled}
              />
            )}
            
            {activeTab === 'reference' && (
              <ReferenceSection />
            )}
            
            {activeTab === 'signatories' && (
              <SignatoriesSection />
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
    </div>
  );
};

export default RealPropertyDataEntry;
