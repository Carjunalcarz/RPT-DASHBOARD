import React from 'react';
import { FileText } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
          <FileText size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
