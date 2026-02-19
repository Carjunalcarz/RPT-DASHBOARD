import React from 'react';
import { FileText } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="bg-white border-b border-gray-200 py-6 px-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
          <FileText size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 uppercase tracking-wide">
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
