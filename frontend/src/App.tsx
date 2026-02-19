import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AppRouter from '@/router/AppRouter';
import '@/App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <AppRouter />
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
