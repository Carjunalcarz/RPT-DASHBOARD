import React from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/modules/rptas/ui/dropdown-menu';

interface PrintEmptyFormsDropdownProps {
  onPrintBuilding: () => void;
  onPrintLand: () => void;
  onPrintMachinery: () => void;
}

const DropdownMenuContentAny = DropdownMenuContent as unknown as React.ComponentType<any>;
const DropdownMenuItemAny = DropdownMenuItem as unknown as React.ComponentType<any>;

const PrintEmptyFormsDropdown: React.FC<PrintEmptyFormsDropdownProps> = ({
  onPrintBuilding,
  onPrintLand,
  onPrintMachinery,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-primary/50 h-9 whitespace-nowrap"
          title="Print Empty Assessment Forms"
        >
          <Printer size={14} />
          Empty Form
          <ChevronDown size={12} className="opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContentAny align="end" className="w-48">
        <DropdownMenuItemAny onClick={onPrintBuilding} className="cursor-pointer text-xs">
          Building Assessment
        </DropdownMenuItemAny>
        <DropdownMenuItemAny onClick={onPrintLand} className="cursor-pointer text-xs">
          Land Assessment
        </DropdownMenuItemAny>
        <DropdownMenuItemAny onClick={onPrintMachinery} className="cursor-pointer text-xs">
          Machinery Assessment
        </DropdownMenuItemAny>
      </DropdownMenuContentAny>
    </DropdownMenu>
  );
};

export default PrintEmptyFormsDropdown;
