import React from 'react';
import { Link } from 'react-router';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface RptBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * RptBreadcrumb Component
 * 
 * A reusable breadcrumb component following the RPT Management design system.
 * Designed to be placed on a dark background (specifically the blue header gradient).
 */
const RptBreadcrumb: React.FC<RptBreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav 
      className={`flex items-center gap-2 text-xs text-white/80 mb-1 ${className}`} 
      aria-label="Breadcrumb"
      data-testid="rpt-breadcrumb"
    >
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-white transition-colors"
        data-testid="breadcrumb-home"
      >
        <Home size={12} />
        <span>Home</span>
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            <ChevronRight size={12} className="text-primary/60" />
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="hover:text-white transition-colors flex items-center gap-1"
                data-testid={`breadcrumb-link-${index}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span 
                className="text-white font-medium flex items-center gap-1"
                data-testid={`breadcrumb-current-${index}`}
                aria-current="page"
              >
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default RptBreadcrumb;
