import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="flex flex-wrap gap-1 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
