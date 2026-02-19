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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <PageHeader
        title="REAL PROPERTY DATA ENTRY"
        subtitle="Tubay - FAAS/TDN Management"
      />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Search Card */}
        <SearchCard
          onPinSearch={handlePinSearch}
          onLocationSearch={handleLocationSearch}
        />

        {/* Tabs */}
        <div className="flex items-center justify-between mb-0">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* View JSON Data Button */}
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium text-sm mb-6"
          >
            <FileJson size={18} />
            View JSON Data
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-0">
          {activeTab === 'property-info' && <PropertyInformationForm />}
          {activeTab === 'assessment' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-slate-500">
              <p>Assessment form will be displayed here</p>
            </div>
          )}
          {activeTab === 'reference' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-slate-500">
              <p>Reference form will be displayed here</p>
            </div>
          )}
          {activeTab === 'signatories' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-slate-500">
              <p>Signatories / Memorandum form will be displayed here</p>
            </div>
          )}
          {activeTab === 'other-property' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-slate-500">
              <p>Other Property Information form will be displayed here</p>
            </div>
          )}
          {activeTab === 'previous-tdns' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-slate-500">
              <p>Previous TDNs list will be displayed here</p>
            </div>
          )}
          {activeTab === 'tag-dec' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-slate-500">
              <p>Tag Dec. Sheet will be displayed here</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Settings Button */}
      <button
        className="fixed right-6 bottom-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};

export default DataEntry;
