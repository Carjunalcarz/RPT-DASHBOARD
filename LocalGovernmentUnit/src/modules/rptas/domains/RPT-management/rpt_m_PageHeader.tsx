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
        <div className="w-10 h-10 bg-primary dark:bg-primary/100 rounded-lg flex items-center justify-center">
          <FileText size={20} className="text-surface" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-surface">
            {title}
          </h1>
          <p className="text-sm text-muted dark:text-muted">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
