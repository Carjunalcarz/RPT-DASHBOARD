import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from '@/modules/rptas/ui/button';

interface DataTablePaginationProps {
  pageIndex: number
  pageSize: number
  totalCount: number
  totalPages: number
  setPageIndex: (page: number) => void
  setPageSize: (size: number) => void
  isLoading?: boolean
}

export function DataTablePagination({
  pageIndex,
  pageSize,
  totalCount,
  totalPages,
  setPageIndex,
  setPageSize,
  isLoading = false,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-slate-500 dark:text-slate-400">
        {totalCount > 0 ? (
          <span>
            Showing {Math.min((pageIndex - 1) * pageSize + 1, totalCount)} to{" "}
            {Math.min(pageIndex * pageSize, totalCount)} of {totalCount} entries
          </span>
        ) : (
          <span>No entries found</span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            value={`${pageSize}`}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(1);
            }}
            disabled={isLoading}
            className="h-8 w-[70px] rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={`${size}`}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setPageIndex(1)}
            disabled={pageIndex === 1 || isLoading}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => setPageIndex(pageIndex - 1)}
            disabled={pageIndex === 1 || isLoading}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => setPageIndex(pageIndex + 1)}
            disabled={pageIndex === totalPages || isLoading}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => setPageIndex(totalPages)}
            disabled={pageIndex === totalPages || isLoading}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
