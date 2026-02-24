import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import AuditTrail from '@/pages/AuditTrail';
import Items from '@/pages/Items';
import Tasks from '@/pages/Tasks';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Wrapper to capture current location before redirecting to login
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Save the attempted URL to redirect back after login
    // We use state to pass it to the login page without cluttering the URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

// Component to handle restoration of the last visited page on initial load
const RouteRestorer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Save current path to localStorage whenever it changes, if authenticated
  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login') {
      localStorage.setItem('last_visited_path', location.pathname + location.search);
    }
  }, [location, isAuthenticated]);

  return <>{children}</>;
};

// Component to handle redirect after login or initial load
const AuthRedirect: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    // Check if there is a saved path to restore
    const lastPath = localStorage.getItem('last_visited_path');
    
    // Validate the path to avoid redirecting to 404s or loops
    // Also ensuring we don't redirect to login page
    if (lastPath && lastPath !== '/login' && lastPath !== '/') {
        return <Navigate to={lastPath} replace />;
    }
    
    // Default fallback
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Login />;
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <RouteRestorer>
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={<AuthRedirect />}
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
          {/* ... other routes remain the same, just showing structure ... */}
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

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </RouteRestorer>
    </BrowserRouter>
  );
};

export default AppRouter;
