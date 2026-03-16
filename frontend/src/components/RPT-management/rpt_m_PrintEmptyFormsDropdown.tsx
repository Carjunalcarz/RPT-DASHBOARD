import React from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PrintEmptyFormsDropdownProps {
  onPrintBuilding: () => void;
  onPrintLand: () => void;
  onPrintMachinery: () => void;
}

const PrintEmptyFormsDropdown: React.FC<PrintEmptyFormsDropdownProps> = ({
  onPrintBuilding,
  onPrintLand,
  onPrintMachinery,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="px-3 py-2 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          title="Print Empty Assessment Forms"
        >
          <Printer size={14} />
          Empty Form
          <ChevronDown size={12} className="opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onPrintBuilding} className="cursor-pointer text-xs">
          Building Assessment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrintLand} className="cursor-pointer text-xs">
          Land Assessment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPrintMachinery} className="cursor-pointer text-xs">
          Machinery Assessment
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PrintEmptyFormsDropdown;
