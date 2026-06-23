import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/modules/rptas/context/AuthContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';

// Define the interface for the RPTAS Context
interface RPTASContextProps {
  user: any; // Ideally mapped to a specific user type
  showAlert: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  // Add other shared dependencies here (e.g., config, specific module permissions)
}

const RPTASContext = createContext<RPTASContextProps | undefined>(undefined);

interface RPTASProviderProps {
  children: ReactNode;
}

export const RPTASProvider: React.FC<RPTASProviderProps> = ({ children }) => {
  // We wrap global contexts here so that if the module is deployed standalone,
  // we only need to change this provider implementation, not every component.
  const { user } = useAuth();
  const { showAlert } = useAlert();

  return (
    <RPTASContext.Provider value={{ user, showAlert }}>
      {children}
    </RPTASContext.Provider>
  );
};

export const useRPTASContext = () => {
  const context = useContext(RPTASContext);
  if (!context) {
    throw new Error('useRPTASContext must be used within an RPTASProvider');
  }
  return context;
};
