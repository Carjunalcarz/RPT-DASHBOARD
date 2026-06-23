import { useEffect, useMemo, useState } from 'react'
import {
  FileClock,
  Hash,
  FileSpreadsheet,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader, StatsRow, StatCard } from '@/components/ui'
import { BUDGET_TABLE_ROWS_PER_PAGE } from '@/modules/budget/components/budgetConstants'
import { BudgetSearchInput } from '@/modules/budget/components/BudgetSearchInput'
import { BudgetTableFooter } from '@/modules/budget/components/BudgetTableFooter'
import { BudgetEmptyRow, BudgetLoadingRow, BudgetPadRows } from '@/modules/budget/components/BudgetTableRows'
import { BudgetYearFilter } from '@/modules/budget/components/BudgetYearFilter'
import { formatDateTime, getSortedYears, toErrorMessage } from '@/modules/budget/components/budgetUtils'
import {
  createBudgetTransactionRecord,
  fetchBudgetGlAccountOptions,
  fetchBudgetPendingDetails,
  type BudgetMajorAccountGroupOption,
  type BudgetPendingDetailRow,
  updateBudgetPendingDetailStatus,
} from '@/services/budgetAccountDetailsService'

interface PendingDetailsRecord {
  id: string
  rcGlaId: string
  type: 'Purchase Order' | 'Purchase Request' | 'Payroll' | 'Unknown'
  sourceId: string | null
  sourceLabel: string
  amount: number
  glAccount: string
  createdAt: string
  status: boolean
  editable: boolean
}

export default function PendingDetails() {
  const [records, setRecords] = useState<PendingDetailsRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [actionTargetId, setActionTargetId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const mapRowToRecord = (
    row: BudgetPendingDetailRow,
    optionLookup: Map<string, BudgetMajorAccountGroupOption>
  ): PendingDetailsRecord => {
    const option = optionLookup.get(row.rc_gla_id)
    const typeLabel =
      row.source_type === 'purchase_order'
        ? 'Purchase Order'
        : row.source_type === 'purchase_request'
        ? 'Purchase Request'
        : row.source_type === 'payroll'
        ? 'Payroll'
        : 'Unknown'

    return {
      id: row.id,
      rcGlaId: row.rc_gla_id,
      type: typeLabel,
      sourceId: row.source_id,
      sourceLabel: row.source_label,
      amount: row.amount,
      glAccount: option?.label ?? `Unknown GL Account (${row.rc_gla_id})`,
      createdAt: row.created_at,
      status: row.status,
      editable: row.editable !== false,
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const [rows, glOptions] = await Promise.all([
        fetchBudgetPendingDetails(),
        fetchBudgetGlAccountOptions(),
      ])

      const glLookup = new Map(glOptions.map((option) => [option.id, option]))

      setRecords(rows.map((row) => mapRowToRecord(row, glLookup)))
    } catch (error) {
      setLoadError(toErrorMessage(error, 'Failed to load pending details data.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const years = useMemo(() => getSortedYears(records, (item) => item.createdAt), [records])

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return records.filter((item) => {
      const itemYear = new Date(item.createdAt).getFullYear()
      const matchesSearch =
        item.glAccount.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.sourceLabel.toLowerCase().includes(query) ||
        (item.sourceId?.toLowerCase().includes(query) ?? false)
      const matchesYear = selectedYear === 'all' || itemYear === Number(selectedYear)
      return matchesSearch && matchesYear
    })
  }, [searchQuery, selectedYear, records])

  const stats = useMemo(() => {
    const approved = filteredData.filter((item) => item.status).length
    const rejected = filteredData.length - approved

    return {
      records: filteredData.length,
      approved,
      rejected,
    }
  }, [filteredData])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / BUDGET_TABLE_ROWS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startIdx = (safePage - 1) * BUDGET_TABLE_ROWS_PER_PAGE
  const pageData = filteredData.slice(startIdx, startIdx + BUDGET_TABLE_ROWS_PER_PAGE)

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    setCurrentPage(1)
  }

  const handleStatusAction = (record: PendingDetailsRecord, status: boolean) => {
    if (actionTargetId || !record.editable) return

    void (async () => {
      setActionTargetId(record.id)
      setMutationError(null)

      try {
        const updated = await updateBudgetPendingDetailStatus(record.id, status)

        try {
          await createBudgetTransactionRecord({
            module_name: 'pending_details',
            action_type: 'STATUS_UPDATE',
            entity_id: record.id,
            description: `${status ? 'Approved' : 'Rejected'} pending detail for ${record.glAccount} (${record.type}: ${record.sourceLabel}).`,
            metadata: {
              rcGlaId: record.rcGlaId,
              sourceType: record.type,
              sourceId: record.sourceId,
              sourceLabel: record.sourceLabel,
              amount: record.amount,
              previousStatus: record.status,
              newStatus: status,
            },
          })
        } catch (err) {
          // ignore transaction record creation error
        }

        setRecords((prev) =>
          prev.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  status: updated.status,
                  editable: updated.editable !== false,
                }
              : item
          )
        )
      } catch (error) {
        setMutationError(toErrorMessage(error, 'Failed to update pending detail status.'))
      } finally {
        setActionTargetId(null)
      }
    })()
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Pending Details"
        subtitle="Pending detail records loaded from budget schema"
        icon={<FileClock className="w-6 h-6" />}
      />

      {loadError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      {mutationError && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {mutationError}
        </div>
      )}

      <StatsRow>
        <StatCard label="Total Records" value={stats.records} color="primary" icon={<Hash className="w-4 h-4" />} />
        <StatCard
          label="Approved"
          value={stats.approved}
          color="success"
          icon={<Check className="w-4 h-4" />}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          color="warning"
          icon={<X className="w-4 h-4" />}
        />
      </StatsRow>

      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <BudgetSearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by GL account, type, or reference..."
          />

          <BudgetYearFilter value={selectedYear} years={years} onChange={handleYearChange} />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-success">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Pending Entry List</h2>
          <span className="ml-auto text-xs text-muted font-medium">
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  General Ledger Account
                </th>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Type
                </th>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Reference
                </th>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Amount
                </th>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Created At
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[120px]">
                  Status
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[180px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <BudgetLoadingRow colSpan={7} message="Loading pending details..." />
              ) : pageData.length === 0 ? (
                <BudgetEmptyRow
                  colSpan={7}
                  content={
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-10 h-10 text-muted/40" />
                      <span className="text-muted text-sm">No pending details found</span>
                    </div>
                  }
                />
              ) : (
                <>
                  {pageData.map((item) => (
                    <tr key={item.id} className="hover:bg-background transition-colors">
                      <td className="px-4 py-3.5 border-b border-border/50 font-medium text-foreground">
                        {item.glAccount}
                      </td>
                      <td className="px-4 py-3.5 border-b border-border/50 text-foreground">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-background border border-border font-medium">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-b border-border/50 text-foreground">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-background border border-border font-medium">
                          {item.sourceLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-b border-border/50 text-foreground font-medium">
                        ₱{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 border-b border-border/50 text-foreground">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3.5 border-b border-border/50 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border',
                            item.status
                              ? 'bg-success/10 border-success/20 text-success'
                              : 'bg-danger/10 border-danger/20 text-danger'
                          )}
                        >
                          {item.status ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-b border-border/50">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStatusAction(item, true)}
                            disabled={actionTargetId === item.id || item.status || !item.editable}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusAction(item, false)}
                            disabled={actionTargetId === item.id || !item.status || !item.editable}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <BudgetPadRows rowCount={pageData.length} rowsPerPage={BUDGET_TABLE_ROWS_PER_PAGE} colSpan={7} />
                </>
              )}
            </tbody>
          </table>
        </div>

        <BudgetTableFooter
          totalCount={filteredData.length}
          currentPage={safePage}
          totalPages={totalPages}
          rowsPerPage={BUDGET_TABLE_ROWS_PER_PAGE}
          startIndex={startIdx}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
