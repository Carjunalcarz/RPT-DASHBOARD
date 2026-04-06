import { useState, useCallback } from 'react';

type ModalType = 'class' | 'actualUse' | 'subClass' | 'kind' | null;

interface UseSelectionModalReturn {
  isModalOpen: boolean;
  modalType: ModalType;
  activeRowId: string | null;
  activeField: string | null;
  openModal: (type: ModalType, rowId: string, field: string) => void;
  closeModal: () => void;
  selectValue: (value: string, onSelect: (value: string) => void) => void;
}

export const useSelectionModal = (): UseSelectionModalReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);

  const openModal = useCallback((type: ModalType, rowId: string, field: string) => {
    setModalType(type);
    setActiveRowId(rowId);
    setActiveField(field);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalType(null);
      setActiveRowId(null);
      setActiveField(null);
    }, 200);
  }, []);

  const selectValue = useCallback(
    (value: string, onSelect: (value: string) => void) => {
      onSelect(value);
      closeModal();
    },
    [closeModal]
  );

  return {
    isModalOpen,
    modalType,
    activeRowId,
    activeField,
    openModal,
    closeModal,
    selectValue,
  };
};
