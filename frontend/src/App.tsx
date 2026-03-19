import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeColorProvider } from '@/context/ThemeColorContext';
import { AlertProvider } from '@/context/AlertContext';
import { MigrationCartProvider } from '@/context/MigrationCartContext';
import CustomAlert from '@/components/common/CustomAlert';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppRouter from '@/router/AppRouter';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import '@/styles/print.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemeColorProvider>
          <AlertProvider>
            <MigrationCartProvider>
              <CustomAlert />
              <AuthProvider>
                <SidebarProvider>
                  <AppRouter />
                  <Toaster position="top-right" richColors expand={true} closeButton offset={90} />
                </SidebarProvider>
              </AuthProvider>
            </MigrationCartProvider>
          </AlertProvider>
        </ThemeColorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
