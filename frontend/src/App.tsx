import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeColorProvider } from '@/context/ThemeColorContext';
import AppRouter from '@/router/AppRouter';
import '@/App.css';
import '@/styles/print.css';

function App() {
  return (
    <ThemeProvider>
      <ThemeColorProvider>
        <AuthProvider>
          <SidebarProvider>
            <AppRouter />
          </SidebarProvider>
        </AuthProvider>
      </ThemeColorProvider>
    </ThemeProvider>
  );
}

export default App;
