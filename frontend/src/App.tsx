import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeColorProvider } from './context/ThemeColorContext';
import { AlertProvider } from './context/AlertContext';
import { MigrationCartProvider } from './context/MigrationCartContext';
import CustomAlert from './modules/rptas/shared/components/common/CustomAlert';
import ErrorBoundary from './modules/rptas/shared/components/common/ErrorBoundary';
import AppRouter from './router/AppRouter';
import { Toaster } from './components/ui/sonner';
import '@/App.css';
import '@/styles/print.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
