import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

export interface AlertOptions {
  title?: string;
  message: string;
  buttonLabel?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export interface AlertContextType {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
  closeAlert: () => void;
  isOpen: boolean;
  alertType: 'alert' | 'confirm';
  alertOptions: AlertOptions;
  confirmOptions: ConfirmOptions;
}

const defaultAlertOptions: AlertOptions = {
  title: 'Alert',
  message: '',
  buttonLabel: 'OK',
};

const defaultConfirmOptions: ConfirmOptions = {
  title: 'Confirm',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alertType, setAlertType] = useState<'alert' | 'confirm'>('alert');
  const [alertOptions, setAlertOptions] = useState<AlertOptions>(defaultAlertOptions);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>(defaultConfirmOptions);
  
  const resolveAlertRef = useRef<(() => void) | null>(null);
  const resolveConfirmRef = useRef<((value: boolean) => void) | null>(null);

  const showAlert = useCallback((opts: AlertOptions | string) => {
    return new Promise<void>((resolve) => {
      if (resolveAlertRef.current) resolveAlertRef.current();
      if (resolveConfirmRef.current) resolveConfirmRef.current(false);

      if (typeof opts === 'string') {
        setAlertOptions({ ...defaultAlertOptions, message: opts });
      } else {
        setAlertOptions({ ...defaultAlertOptions, ...opts });
      }
      
      setAlertType('alert');
      resolveAlertRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  const showConfirm = useCallback((opts: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      if (resolveAlertRef.current) resolveAlertRef.current();
      if (resolveConfirmRef.current) resolveConfirmRef.current(false);

      if (typeof opts === 'string') {
        setConfirmOptions({ ...defaultConfirmOptions, message: opts });
      } else {
        setConfirmOptions({ ...defaultConfirmOptions, ...opts });
      }

      setAlertType('confirm');
      resolveConfirmRef.current = resolve;
      setIsOpen(true);
    });
  }, []);

  const closeAlert = useCallback((result?: boolean) => {
    setIsOpen(false);
    
    if (alertType === 'alert') {
      if (resolveAlertRef.current) {
        resolveAlertRef.current();
        resolveAlertRef.current = null;
      }
    } else {
      if (resolveConfirmRef.current) {
        resolveConfirmRef.current(result || false);
        resolveConfirmRef.current = null;
      }
    }
  }, [alertType]);

  return (
    <AlertContext.Provider value={{ 
      showAlert, 
      showConfirm, 
      closeAlert, 
      isOpen, 
      alertType, 
      alertOptions, 
      confirmOptions 
    }}>
      {children}
    </AlertContext.Provider>
  );
};
