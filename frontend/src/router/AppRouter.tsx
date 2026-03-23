import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Properties from '@/pages/Properties';
import TaxAssessment from '@/pages/TaxAssessment';
import Payments from '@/pages/Payments';
import OrderOfPayment from '@/pages/OrderOfPayment';
import TreasuryConfirm from '@/pages/TreasuryConfirm';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import DataEntry from '@/pages/DataEntry';
import DataEntryV2 from '@/pages/DataEntryV2';
import MigrationCartPage from '@/components/migration/MigrationCartPage';
import AuditTrail from '@/pages/AuditTrail';
import Items from '@/pages/Items';
import Tasks from '@/pages/Tasks';
import UserManagement from '@/pages/admin/UserManagement';
import SidebarManagement from '@/pages/admin/SidebarManagement';
import PropertyApproval from '@/pages/PropertyApproval';
import PendingApprovals from '@/pages/PendingApprovals';
import SignatorySetupPage from '@/pages/setup/SignatorySetupPage';
import RouteRestorer from '@/components/layout/RouteRestorer';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const AuthRedirect: React.FC = () => {
  const lastPath = localStorage.getItem('last_visited_path');
  // Validate path to prevent loops or invalid redirects
  const isValidPath = lastPath && lastPath.startsWith('/') && lastPath !== '/login' && lastPath !== '/';
  return <Navigate to={isValidPath ? lastPath : '/dashboard'} replace />;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { menuItems, loadingMenu } = useSidebar();
  const location = useLocation();
  
  if (isAuthLoading || loadingMenu) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading application...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if current route is active in dynamic sidebar (if it exists in the list)
  // We exclude certain system routes from this check
  const systemRoutes = ['/dashboard', '/admin/users', '/admin/sidebar', '/settings', '/migration-cart', '/payments/treasury'];
  const currentPath = location.pathname;

  if (!systemRoutes.includes(currentPath)) {
    // Flatten menu items to check children
    const getAllPaths = (items: any[]): string[] => {
      let paths: string[] = [];
      items.forEach(item => {
        if (item.path && item.path !== '#') paths.push(item.path);
        if (item.children) paths.push(...getAllPaths(item.children));
      });
      return paths;
    };

    const activePaths = getAllPaths(menuItems);
    const isPathActive = activePaths.some(path => {
      if (!path) return false;
      if (path.includes(':')) {
        const pathRegex = new RegExp('^' + path.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
        return pathRegex.test(currentPath);
      }
      return currentPath === path || currentPath.startsWith(`${path}/`);
    });

    // If path is NOT in the active items list and NOT a system route, redirect
    // We only perform this check for paths that ARE in our database (meaning they CAN be deactivated)
    // To keep it simple: if the path is supposed to be in the sidebar but isn't returned (inactive), block it.
    // Note: This logic assumes that any path not in the systemRoutes or menuItems is "unauthorized" or "inactive".
    if (!isPathActive) {
      // Allow property-approval as it might not be in the sidebar but is a sub-page
      if (!currentPath.startsWith('/property-approval/')) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }
  
  return <>{children}</>;
};

const LoginRedirect: React.FC = () => {
  const lastPath = localStorage.getItem('last_visited_path');
  const isValidPath = lastPath && lastPath.startsWith('/') && lastPath !== '/login' && lastPath !== '/';
  return <Navigate to={isValidPath ? lastPath : '/dashboard'} replace />;
};

const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <RouteRestorer />
      <Routes>
        {/* Login Route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <LoginRedirect /> : <Login />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties"
          element={
            <ProtectedRoute>
              <Layout>
                <Properties />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment"
          element={
            <ProtectedRoute>
              <Layout>
                <TaxAssessment />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Layout>
                <Payments />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/order"
          element={
            <ProtectedRoute>
              <Layout>
                <OrderOfPayment />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/treasury"
          element={
            <ProtectedRoute>
              <Layout>
                <TreasuryConfirm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-entry"
          element={
            <ProtectedRoute>
              <Layout>
                <DataEntry />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rpt-management"
          element={
            <ProtectedRoute>
              <Layout>
                <DataEntryV2 />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/migration-cart"
          element={
            <ProtectedRoute>
              <Layout>
                <MigrationCartPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-trail"
          element={
            <ProtectedRoute>
              <Layout>
                <AuditTrail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <Layout>
                <Items />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Layout>
                <PendingApprovals />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals/municipal"
          element={
            <ProtectedRoute>
              <Layout>
                <PendingApprovals fixedStatus="pending-municipal" />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals/provincial"
          element={
            <ProtectedRoute>
              <Layout>
                <PendingApprovals fixedStatus="pending-provincial" />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/property-approval/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <PropertyApproval />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sidebar"
          element={
            <ProtectedRoute>
              <Layout>
                <SidebarManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup/signatory"
          element={
            <ProtectedRoute>
              <Layout>
                <SignatorySetupPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
