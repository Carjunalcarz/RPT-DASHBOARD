import React from 'react';
import { FileText } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary dark:bg-primary/50 rounded-lg flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
