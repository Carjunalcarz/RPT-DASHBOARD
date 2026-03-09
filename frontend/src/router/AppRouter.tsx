import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Properties from '@/pages/Properties';
import TaxAssessment from '@/pages/TaxAssessment';
import Payments from '@/pages/Payments';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import DataEntry from '@/pages/DataEntry';
import DataEntryV2 from '@/pages/DataEntryV2';
import AuditTrail from '@/pages/AuditTrail';
import Items from '@/pages/Items';
import Tasks from '@/pages/Tasks';
import UserManagement from '@/pages/admin/UserManagement';
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
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
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
