import { BudgetPagination } from '@/modules/budget/components/BudgetPagination'

interface BudgetTableFooterProps {
  totalCount: number
  currentPage: number
  totalPages: number
  rowsPerPage: number
  startIndex: number
  onPageChange: (page: number) => void
}

export function BudgetTableFooter({
  totalCount,
  currentPage,
  totalPages,
  rowsPerPage,
  startIndex,
  onPageChange,
}: BudgetTableFooterProps) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-muted">
      <span>
        {totalCount > 0
          ? `Showing ${startIndex + 1}–${Math.min(startIndex + rowsPerPage, totalCount)} of ${totalCount}`
          : '0 results'}
      </span>
      <BudgetPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
