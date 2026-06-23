import { create } from 'zustand';

interface AccountingHierarchyState {
  hierarchyVersion: number;
  bumpHierarchyVersion: () => void;
}

export const useAccountingHierarchyStore = create<AccountingHierarchyState>((set) => ({
  hierarchyVersion: 0,
  bumpHierarchyVersion: () => set((state) => ({ hierarchyVersion: state.hierarchyVersion + 1 })),
}));
