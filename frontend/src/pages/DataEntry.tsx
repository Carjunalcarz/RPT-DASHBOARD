import React, { useState } from 'react';
import PageHeader from '@/components/data-entry/PageHeader';
import SearchCard from '@/components/data-entry/SearchCard';
import Tabs from '@/components/data-entry/Tabs';
import PropertyInformationForm from '@/components/data-entry/PropertyInformationForm';
import { Settings, FileJson } from 'lucide-react';

const DataEntry: React.FC = () => {
  const [activeTab, setActiveTab] = useState('property-info');

  const tabs = [
    { id: 'property-info', label: 'Property Information' },
    { id: 'assessment', label: 'Assessment' },
    { id: 'reference', label: 'Reference' },
    { id: 'signatories', label: 'Signatories / Memorandum' },
    { id: 'other-property', label: 'Other Property Information' },
    { id: 'previous-tdns', label: 'Previous TDNs' },
    { id: 'tag-dec', label: 'Tag Dec. Sheet' },
  ];

  const handlePinSearch = (pin: string) => {
    console.log('Searching by PIN:', pin);
  };

  const handleLocationSearch = (municipality: string, barangay: string) => {
    console.log('Searching by location:', { municipality, barangay });
  };

  return (
    <div data-testid="data-entry-page">
      {/* Header */}
      <PageHeader
        title="REAL PROPERTY DATA ENTRY"
        subtitle="Tubay - FAAS/TDN Management"
      />

      {/* Search Card */}
      <SearchCard
        onPinSearch={handlePinSearch}
        onLocationSearch={handleLocationSearch}
      />

      {/* Tabs with View JSON Button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
        {/* View JSON Data Button */}
        <button
          data-testid="view-json-button"
          className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium shadow-sm"
        >
          <FileJson size={16} />
          View JSON Data
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'property-info' && <PropertyInformationForm />}
        {activeTab === 'assessment' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">Assessment form will be displayed here</p>
          </div>
        )}
        {activeTab === 'reference' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">Reference form will be displayed here</p>
          </div>
        )}
        {activeTab === 'signatories' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">Signatories / Memorandum form will be displayed here</p>
          </div>
        )}
        {activeTab === 'other-property' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">Other Property Information form will be displayed here</p>
          </div>
        )}
        {activeTab === 'previous-tdns' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">Previous TDNs list will be displayed here</p>
          </div>
        )}
        {activeTab === 'tag-dec' && (
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm">Tag Dec. Sheet will be displayed here</p>
          </div>
        )}
      </div>

      {/* Floating Settings Button */}
      <button
        data-testid="settings-floating-button"
        className="fixed right-6 bottom-6 w-10 h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center z-50"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
    </div>
  );
};

export default DataEntry;
