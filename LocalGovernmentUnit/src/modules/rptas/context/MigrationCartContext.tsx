import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  const selectedPropertiesRef = useRef<SelectedProperty[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart) as SelectedProperty[];
        setSelectedProperties(parsed);
        selectedPropertiesRef.current = parsed;
      } catch (e) {
        console.error('Failed to parse migration cart from storage', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(selectedProperties));
    selectedPropertiesRef.current = selectedProperties;
  }, [selectedProperties]);

  const addToCart = (property: SelectedProperty) => {
    const prev = selectedPropertiesRef.current;
    if (prev.some((p) => p.id === property.id)) {
      toast.info(`Property ${property.tdn} is already in the migration cart.`, { id: `migration-cart-${property.id}` });
      return;
    }
    const next = [...prev, property];
    selectedPropertiesRef.current = next;
    setSelectedProperties(next);
    toast.success(`Property ${property.tdn} added to migration cart.`, { id: `migration-cart-${property.id}` });
  };

  const removeFromCart = (propertyId: string) => {
    const prev = selectedPropertiesRef.current;
    const property = prev.find((p) => p.id === propertyId);
    const next = prev.filter((p) => p.id !== propertyId);
    selectedPropertiesRef.current = next;
    setSelectedProperties(next);
    if (property) {
      toast.info(`Property ${property.tdn} removed from migration cart.`, { id: `migration-cart-${property.id}` });
    }
  };

  const clearCart = () => {
    selectedPropertiesRef.current = [];
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
