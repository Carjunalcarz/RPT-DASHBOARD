import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface BudgetLoadingRowProps {
  colSpan: number
  message: string
}

export function BudgetLoadingRow({ colSpan, message }: BudgetLoadingRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="inline-flex items-center gap-2 text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          {message}
        </div>
      </td>
    </tr>
  )
}

interface BudgetEmptyRowProps {
  colSpan: number
  content: ReactNode
}

export function BudgetEmptyRow({ colSpan, content }: BudgetEmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        {content}
      </td>
    </tr>
  )
}

interface BudgetPadRowsProps {
  rowCount: number
  rowsPerPage: number
  colSpan: number
}

export function BudgetPadRows({ rowCount, rowsPerPage, colSpan }: BudgetPadRowsProps) {
  return (
    <>
      {Array.from({ length: Math.max(rowsPerPage - rowCount, 0) }).map((_, index) => (
        <tr key={`pad-${index}`}>
          <td className="px-4 py-3.5 border-b border-border/50" colSpan={colSpan}>
            &nbsp;
          </td>
        </tr>
      ))}
    </>
  )
}
