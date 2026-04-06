import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import DynamicLayout from '@/components/layout/DynamicLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MigrationCartPage from '@/components/migration/MigrationCartPage';
import AuditTrail from '@/pages/AuditTrail';
import Items from '@/pages/Items';
import Tasks from '@/pages/Tasks';
import UserManagement from '@/pages/admin/UserManagement';
import AddUserPage from '@/pages/admin/AddUserPage';
import SidebarManagement from '@/pages/admin/SidebarManagement';
import SignatorySetupPage from '@/pages/setup/SignatorySetupPage';
import Profile from '@/pages/Profile';
import RouteRestorer from '@/components/layout/RouteRestorer';
// Import New RPTAS Module
import { rptasRoutes } from '@/modules/rptas-standalone';

// Legacy components mapping for database sidebar paths
import DataEntryPage from '@/modules/rptas-standalone/domains/faas/pages/DataEntryPage';
import DataEntryV2Page from '@/modules/rptas-standalone/domains/faas/pages/DataEntryV2Page';

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

  // Allow system routes and rptas-standalone module
  if (systemRoutes.includes(currentPath) || adminRoutes.includes(currentPath) || currentPath.startsWith('/rptas')) {
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
              <DynamicLayout>
                <Dashboard />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/migration-cart"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <MigrationCartPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-trail"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <AuditTrail />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/items"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <Items />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <Tasks />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={<Navigate to="/rptas/pending-approvals" replace />}
        />
        <Route
          path="/approvals/municipal"
          element={<Navigate to="/rptas/approvals/municipal" replace />}
        />
        <Route
          path="/approvals/provincial"
          element={<Navigate to="/rptas/approvals/provincial" replace />}
        />
        <Route
          path="/property-approval/:id"
          element={<Navigate to="/rptas/property-approval/:id" replace />}
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <UserManagement />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/add"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <AddUserPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sidebar"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <SidebarManagement />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup/signatory"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <SignatorySetupPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <Profile />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />

        {/* Legacy / Direct paths for database sidebar mapping */}
        <Route
          path="/rpt-management"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <DataEntryV2Page />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-entry"
          element={
            <ProtectedRoute>
              <DynamicLayout>
                <DataEntryPage />
              </DynamicLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={<Navigate to="/rptas/treasury" replace />}
        />
        <Route
          path="/payments/order"
          element={<Navigate to="/rptas/treasury/order" replace />}
        />
        <Route
          path="/payments/treasury"
          element={<Navigate to="/rptas/treasury/confirm" replace />}
        />
        <Route
          path="/payments/payors"
          element={<Navigate to="/rptas/treasury/payors" replace />}
        />
        <Route
          path="/reports/treasury-payments"
          element={<Navigate to="/rptas/treasury/reports" replace />}
        />

        {/* RPTAS Module Routes */}
        {rptasRoutes.map((route, idx) => (
          <Route
            key={`rptas-${idx}`}
            path={route.path}
            element={
              <ProtectedRoute>
                <DynamicLayout>
                  <React.Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-slate-500">Loading module...</div>}>
                    <Outlet />
                  </React.Suspense>
                </DynamicLayout>
              </ProtectedRoute>
            }
          >
            {route.children?.map((child: any, cIdx: number) => (
              <Route
                key={`rptas-child-${cIdx}`}
                index={child.index}
                path={child.path}
                element={child.element}
              />
            ))}
          </Route>
        ))}

        {/* Legacy / Direct paths for database sidebar mapping */}
        <Route path="/" element={<AuthRedirect />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
