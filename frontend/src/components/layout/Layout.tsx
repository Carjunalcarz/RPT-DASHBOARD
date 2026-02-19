import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import { useSidebar } from '@/context/SidebarContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <Header />
      <main
        data-testid="main-content"
        className={`pt-16 transition-all duration-300 ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="p-6">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
