import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeColorProvider } from '@/context/ThemeColorContext';
import { AlertProvider } from '@/context/AlertContext';
import CustomAlert from '@/components/common/CustomAlert';
import AppRouter from '@/router/AppRouter';
import { Toaster } from 'sonner';
import '@/App.css';
import '@/styles/print.css';

function App() {
  return (
    <ThemeProvider>
      <ThemeColorProvider>
        <AlertProvider>
          <CustomAlert />
          <AuthProvider>
            <SidebarProvider>
              <AppRouter />
              <Toaster position="top-right" richColors expand={true} closeButton />
            </SidebarProvider>
          </AuthProvider>
        </AlertProvider>
      </ThemeColorProvider>
    </ThemeProvider>
  );
}

export default App;
