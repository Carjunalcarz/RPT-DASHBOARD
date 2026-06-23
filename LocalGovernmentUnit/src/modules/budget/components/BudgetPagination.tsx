import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BudgetPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function BudgetPagination({ currentPage, totalPages, onPageChange }: BudgetPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="p-1.5 rounded hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {Array.from({ length: totalPages }).map((_, index) => {
        const page = index + 1

        if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'min-w-[32px] h-8 rounded text-sm font-medium transition-colors',
                page === currentPage ? 'bg-success text-white' : 'hover:bg-background'
              )}
            >
              {page}
            </button>
          )
        }

        if (page === 2 && currentPage > 3) {
          return (
            <span key="start-dots" className="px-1">
              …
            </span>
          )
        }

        if (page === totalPages - 1 && currentPage < totalPages - 2) {
          return (
            <span key="end-dots" className="px-1">
              …
            </span>
          )
        }

        return null
      })}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="p-1.5 rounded hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
