import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';

type ModalType = 'class' | 'actualUse' | 'subClass' | 'kind';

interface SelectionModalProps {
  isOpen: boolean;
  type: ModalType | null;
  onClose: () => void;
  onSelect: (value: string) => void;
  currentValue?: string;
}

const modalData: Record<ModalType, { title: string; options: string[] }> = {
  kind: {
    title: 'Select Kind',
    options: ['Land', 'Building', 'Machinery', 'Others'],
  },
  class: {
    title: 'Select Class',
    options: [
      'Residential',
      'Commercial',
      'Agricultural',
      'Industrial',
      'Special',
      'Timberland',
      'Mineral',
    ],
  },
  actualUse: {
    title: 'Select Actual Use',
    options: ['Owner Occupied', 'Rental', 'Idle', 'Government', 'Institutional'],
  },
  subClass: {
    title: 'Select Sub Class',
    options: ['A', 'B', 'C', 'D', 'E'],
  },
};

const SelectionModal: React.FC<SelectionModalProps> = ({
  isOpen,
  type,
  onClose,
  onSelect,
  currentValue = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const data = type ? modalData[type] : null;
  const options = data?.options || [];

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[selectedIndex]) {
            onSelect(filteredOptions[selectedIndex]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredOptions, onSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity"></div>

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {data?.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            data-testid="modal-close-button"
          >
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
              data-testid="modal-search-input"
            />
          </div>
        </div>

        {/* Options List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto"
          data-testid="modal-options-list"
        >
          {filteredOptions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No options found
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option}
                onClick={() => onSelect(option)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary/5 dark:bg-primary/5 text-primary dark:text-primary/80 font-medium'
                    : option === currentValue
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                data-testid={`modal-option-${option.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {option}
                {option === currentValue && (
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                    (current)
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Use ↑↓ arrow keys to navigate • Enter to select • ESC to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;
