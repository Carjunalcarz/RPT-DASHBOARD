import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MigrationCartPage from '@/components/migration/MigrationCartPage';
import AuditTrail from '@/pages/AuditTrail';
import Items from '@/pages/Items';
import Tasks from '@/pages/Tasks';
import UserManagement from '@/pages/admin/UserManagement';
import AddUserPage from '@/pages/admin/AddUserPage';
import SidebarManagement from '@/pages/admin/SidebarManagement';
import PropertyApproval from '@/pages/PropertyApproval';
import PendingApprovals from '@/pages/PendingApprovals';
import SignatorySetupPage from '@/pages/setup/SignatorySetupPage';
import Profile from '@/pages/Profile';
import RouteRestorer from '@/components/layout/RouteRestorer';
// Import New RPTAS Module
import { rptasRoutes } from '@/modules/rptas';
import { treasuryRoutes } from '@/modules/treasury';

// Legacy components mapping for database sidebar paths
import DataEntryPage from '@/modules/rptas/domains/faas/pages/DataEntryPage';
import DataEntryV2Page from '@/modules/rptas/domains/faas/pages/DataEntryV2Page';
import PropertiesPage from '@/modules/rptas/domains/property/pages/PropertiesPage';
import TaxAssessmentPage from '@/modules/rptas/domains/assessment/pages/TaxAssessmentPage';
import RPTASReportsPage from '@/modules/rptas/domains/reports/pages/RPTASReportsPage';
import PaymentsPage from '@/modules/treasury/domains/payments/pages/PaymentsPage';
import OrderOfPaymentPage from '@/modules/treasury/domains/oop/pages/OrderOfPaymentPage';
import TreasuryConfirmPage from '@/modules/treasury/domains/payments/pages/TreasuryConfirmPage';
import TreasuryPaymentsReportPage from '@/modules/treasury/domains/reports/pages/TreasuryPaymentsReportPage';
import PayorRegistryPage from '@/modules/treasury/domains/payors/pages/PayorRegistryPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const AuthRedirect: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { menuItems, dbMenuItems, loadingMenu } = useSidebar();
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
  const systemRoutes = ['/dashboard', '/profile', '/settings', '/migration-cart'];
  const adminRoutes = ['/admin/users', '/admin/users/add', '/admin/sidebar'];
  const currentPath = location.pathname;

  // 1. Strict Admin check for /admin/* routes
  const { user } = useAuth();
  const isAdmin = ['admin', 'administrator'].includes(String(user?.role || '').toLowerCase());
  
  // Strict admin path check - block instantly if not admin
  if (currentPath.startsWith('/admin') && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Allow system routes
  if (systemRoutes.includes(currentPath) || adminRoutes.includes(currentPath)) {
    return <>{children}</>;
  }

  // 2. Strict Sidebar Menu/Permission checks for all other paths
  const itemsForAccessCheck = dbMenuItems.length ? dbMenuItems : menuItems;
  // Flatten menu items to check children
  const getAllPaths = (items: any[]): string[] => {
    let paths: string[] = [];
    items.forEach(item => {
      if (item.path && item.path !== '#') paths.push(item.path);
      if (item.children) paths.push(...getAllPaths(item.children));
    });
    return paths;
  };

  const activePaths = getAllPaths(itemsForAccessCheck);
  const isPathActive = activePaths.some(path => {
    if (!path) return false;
    if (path.includes(':')) {
      const pathRegex = new RegExp('^' + path.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
      return pathRegex.test(currentPath);
    }
    return currentPath === path || currentPath.startsWith(`${path}/`);
  });

  // If path is NOT in the active items list and NOT a system route, redirect
  if (!isPathActive) {
    // Allow property-approval as it might not be in the sidebar but is a sub-page
    if (!currentPath.startsWith('/property-approval/')) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
};

const LoginRedirect: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
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
          path="/admin/users/add"
          element={
            <ProtectedRoute>
              <Layout>
                <AddUserPage />
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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Legacy / Direct paths for database sidebar mapping */}
        <Route
          path="/rpt-management"
          element={
            <ProtectedRoute>
              <Layout>
                <DataEntryV2Page />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-entry"
          element={
            <ProtectedRoute>
              <Layout>
                <DataEntryPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/properties"
          element={
            <ProtectedRoute>
              <Layout>
                <PropertiesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment"
          element={
            <ProtectedRoute>
              <Layout>
                <TaxAssessmentPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <RPTASReportsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Layout>
                <PaymentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/order"
          element={
            <ProtectedRoute>
              <Layout>
                <OrderOfPaymentPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/treasury"
          element={
            <ProtectedRoute>
              <Layout>
                <TreasuryConfirmPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/payors"
          element={
            <ProtectedRoute>
              <Layout>
                <PayorRegistryPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/treasury-payments"
          element={
            <ProtectedRoute>
              <Layout>
                <TreasuryPaymentsReportPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* RPTAS Module Routes */}
        {rptasRoutes.map((route, idx) => (
          <Route
            key={`rptas-${idx}`}
            path={route.path}
            element={
              <ProtectedRoute>
                <Layout>
                  <Outlet />
                </Layout>
              </ProtectedRoute>
            }
          >
            {route.children?.map((child, cIdx) => (
              <Route
                key={`rptas-child-${cIdx}`}
                index={child.index}
                path={child.path}
                element={child.element}
              />
            ))}
          </Route>
        ))}

        {/* Treasury Module Routes */}
        {treasuryRoutes.map((route, idx) => (
          <Route
            key={`treasury-${idx}`}
            path={route.path}
            element={
              <ProtectedRoute>
                <Layout>
                  <Outlet />
                </Layout>
              </ProtectedRoute>
            }
          >
            {route.children?.map((child, cIdx) => (
              <Route
                key={`treasury-child-${cIdx}`}
                index={child.index}
                path={child.path}
                element={child.element}
              />
            ))}
          </Route>
        ))}

        {/* Default Route */}
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
