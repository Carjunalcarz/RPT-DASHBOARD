import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import { useSidebar } from '@/context/SidebarContext';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();
  const location = useLocation();
  
  // Hide breadcrumb on Data Entry page (it's integrated in the page header)
  const hideBreadcrumb = location.pathname.includes('/data-entry') || location.pathname.includes('/data-entry-v2');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <Header />
      <div className={`pt-16 transition-all duration-300 flex flex-col min-h-screen ${
        isCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <main
          className="flex-1 flex flex-col"
          data-testid="main-content"
        >
          <div className="flex-1 p-6 flex flex-col">
            {!hideBreadcrumb && <Breadcrumb />}
            {children}
          </div>
          
          {/* Footer */}
          <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 mt-auto">
            <div className="px-6 py-4">
              <p className="text-xs text-center text-slate-600 dark:text-slate-400">
                © {new Date().getFullYear()} Real Property Tax System. All rights reserved.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout;
