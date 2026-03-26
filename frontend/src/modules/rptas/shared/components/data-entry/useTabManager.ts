import { useState, useCallback, useEffect } from 'react';

interface UseTabManagerReturn {
  activeTab: string;
  isEditing: boolean;
  editingTab: string | null;
  hasUnsavedChanges: boolean;
  pendingTab: string | null;
  switchTab: (tabId: string) => void;
  enterEditMode: (tabId: string) => void;
  exitEditMode: () => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
  confirmSwitch: () => void;
  cancelSwitch: () => void;
  saveChanges: () => void;
  cancelChanges: () => void;
}

export const useTabManager = (initialTab: string = 'property-info'): UseTabManagerReturn => {
  const [activeTab, setActiveTab] = useState(() => {
    // Persist last opened tab
    return localStorage.getItem('lastActiveTab') || initialTab;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('lastActiveTab', activeTab);
  }, [activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing) {
          saveChanges();
        }
      }
      // ESC to cancel
      if (e.key === 'Escape' && isEditing) {
        cancelChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  // Warn before page unload if editing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing && hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing, hasUnsavedChanges]);

  const switchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTab) return;

      // If editing, show confirmation
      if (isEditing && hasUnsavedChanges) {
        setPendingTab(tabId);
        return;
      }

      // Switch tab
      setActiveTab(tabId);
    },
    [activeTab, isEditing, hasUnsavedChanges]
  );

  const enterEditMode = useCallback((tabId: string) => {
    setIsEditing(true);
    setEditingTab(tabId);
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
    setEditingTab(null);
    setHasUnsavedChanges(false);
  }, []);

  const setUnsavedChanges = useCallback((hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  }, []);

  const confirmSwitch = useCallback(() => {
    if (pendingTab) {
      exitEditMode();
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  }, [pendingTab, exitEditMode]);

  const cancelSwitch = useCallback(() => {
    setPendingTab(null);
  }, []);

  const saveChanges = useCallback(() => {
    // This will be overridden by individual tabs
    exitEditMode();
  }, [exitEditMode]);

  const cancelChanges = useCallback(() => {
    // This will be overridden by individual tabs
    exitEditMode();
  }, [exitEditMode]);

  return {
    activeTab,
    isEditing,
    editingTab,
    hasUnsavedChanges,
    pendingTab,
    switchTab,
    enterEditMode,
    exitEditMode,
    setUnsavedChanges,
    confirmSwitch,
    cancelSwitch,
    saveChanges,
    cancelChanges,
  };
};
