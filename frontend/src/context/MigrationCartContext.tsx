import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

export interface SelectedProperty {
  id: string;
  tdn: string;
  pin: string;
  owner: string;
  barangay: string;
  status?: string;
  data?: any; // Full property data
}

interface MigrationCartContextType {
  selectedProperties: SelectedProperty[];
  addToCart: (property: SelectedProperty) => void;
  removeFromCart: (propertyId: string) => void;
  clearCart: () => void;
  isInCart: (propertyId: string) => boolean;
  count: number;
}

const MigrationCartContext = createContext<MigrationCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'rpt_migration_cart';

export const MigrationCartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProperties, setSelectedProperties] = useState<SelectedProperty[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setSelectedProperties(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse migration cart from storage', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(selectedProperties));
  }, [selectedProperties]);

  const addToCart = (property: SelectedProperty) => {
    setSelectedProperties((prev) => {
      if (prev.some((p) => p.id === property.id)) {
        toast.info(`Property ${property.tdn} is already in the migration cart.`);
        return prev;
      }
      toast.success(`Property ${property.tdn} added to migration cart.`);
      return [...prev, property];
    });
  };

  const removeFromCart = (propertyId: string) => {
    setSelectedProperties((prev) => {
      const property = prev.find((p) => p.id === propertyId);
      if (property) {
        toast.info(`Property ${property.tdn} removed from migration cart.`);
      }
      return prev.filter((p) => p.id !== propertyId);
    });
  };

  const clearCart = () => {
    setSelectedProperties([]);
    toast.info('Migration cart cleared.');
  };

  const isInCart = (propertyId: string) => {
    return selectedProperties.some((p) => p.id === propertyId);
  };

  return (
    <MigrationCartContext.Provider
      value={{
        selectedProperties,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        count: selectedProperties.length,
      }}
    >
      {children}
    </MigrationCartContext.Provider>
  );
};

export const useMigrationCart = () => {
  const context = useContext(MigrationCartContext);
  if (context === undefined) {
    throw new Error('useMigrationCart must be used within a MigrationCartProvider');
  }
  return context;
};
