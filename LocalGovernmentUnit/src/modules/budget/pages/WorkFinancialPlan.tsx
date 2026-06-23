import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  Wallet,
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader, StatsRow, StatCard } from '@/components/ui'
import { BaseDialog } from '@/components/ui/dialog'
import { BUDGET_TABLE_ROWS_PER_PAGE } from '@/modules/budget/components/budgetConstants'
import { mapBudgetAccountDetailRow } from '@/modules/budget/components/budgetMappers'
import { BudgetSearchInput } from '@/modules/budget/components/BudgetSearchInput'
import { BudgetTableFooter } from '@/modules/budget/components/BudgetTableFooter'
import { BudgetEmptyRow, BudgetLoadingRow, BudgetPadRows } from '@/modules/budget/components/BudgetTableRows'
import { BudgetYearFilter } from '@/modules/budget/components/BudgetYearFilter'
import { WorkFinancialPlanFormFields } from '@/modules/budget/components/WorkFinancialPlanFormFields'
import type {
  AccountDetailForm,
  AccountDetailFormErrors,
} from '@/modules/budget/components/workFinancialPlanTypes'
import {
  formatCurrency,
  formatMonthDay,
  isDateRangeOverlapping,
  toErrorMessage,
} from '@/modules/budget/components/budgetUtils'
import {
  createBudgetTransactionRecord,
  createBudgetAccountDetail,
  deleteBudgetAccountDetail,
  fetchBudgetAccountDetails,
  fetchBudgetGlAccountOptions,
  type BudgetAccountType,
  type BudgetAccountDetailRow,
  type BudgetMajorAccountGroupOption,
  updateBudgetAccountDetail,
} from '@/services/budgetAccountDetailsService'

// ── Types ──────────────────────────────────────────────────────────────
interface WorkFinancialPlanRecord {
  id: string
  accountType: BudgetAccountType | null
  majorAccountGroupId: string
  majorAccountGroup: string
  year: number
  description: string
  fromDate: string
  toDate: string
  budget: number
  remaining: number
}

// ── Helpers ────────────────────────────────────────────────────────────
const getUtilizationPercent = (budget: number, remaining: number) =>
  budget > 0 ? ((budget - remaining) / budget) * 100 : 0

const getUtilizationColor = (pct: number) => {
  if (pct >= 90) return { bar: 'bg-danger', text: 'text-danger' }
  if (pct >= 70) return { bar: 'bg-warning', text: 'text-warning' }
  return { bar: 'bg-success', text: 'text-success' }
}

const createEmptyForm = (): AccountDetailForm => ({
  accountType: 'Budgetary Accounts',
  majorAccountGroupId: '',
  year: String(new Date().getFullYear()),
  description: '',
  fromDate: `${new Date().getFullYear()}-01-01`,
  toDate: `${new Date().getFullYear()}-12-31`,
  budget: '',
  remaining: '',
})

const recordToForm = (record: WorkFinancialPlanRecord): AccountDetailForm => ({
  accountType: 'Budgetary Accounts',
  majorAccountGroupId: record.majorAccountGroupId,
  year: String(record.year),
  description: record.description,
  fromDate: record.fromDate,
  toDate: record.toDate,
  budget: String(record.budget),
  remaining: String(record.remaining),
})

// ── Component ──────────────────────────────────────────────────────────
export default function WorkFinancialPlan() {
  const [records, setRecords] = useState<WorkFinancialPlanRecord[]>([])
  const [majorAccountGroupOptions, setMajorAccountGroupOptions] = useState<BudgetMajorAccountGroupOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AccountDetailForm>(createEmptyForm)
  const [formErrors, setFormErrors] = useState<AccountDetailFormErrors>({})
  const [deleteTarget, setDeleteTarget] = useState<WorkFinancialPlanRecord | null>(null)

  const mapRowToRecord = (
    row: BudgetAccountDetailRow,
    optionLookup: Map<string, BudgetMajorAccountGroupOption>
  ): WorkFinancialPlanRecord => {
    const baseRecord = mapBudgetAccountDetailRow(row, optionLookup)

    return {
      id: baseRecord.id,
      accountType: baseRecord.accountType,
      majorAccountGroupId: baseRecord.majorAccountGroupId,
      majorAccountGroup: baseRecord.majorAccountGroupLabel,
      year: baseRecord.year,
      description: row.description,
      fromDate: row.from_date,
      toDate: row.to_date,
      budget: baseRecord.budget,
      remaining: baseRecord.remaining,
    }
  }

  const logAccountDetailTransaction = async (
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    record: WorkFinancialPlanRecord,
    metadata?: Record<string, unknown>
  ) => {
    const actionLabel =
      actionType === 'CREATE' ? 'Created' : actionType === 'UPDATE' ? 'Updated' : 'Deleted'

    try {
      await createBudgetTransactionRecord({
        module_name: 'work_financial_plan',
        action_type: actionType,
        entity_id: record.id,
        description: `${actionLabel} work financial plan entry for ${record.majorAccountGroup} (${record.year}).`,
        metadata,
      })
    } catch (error) {
      setMutationError((prev) => {
        if (prev) return prev
        return toErrorMessage(
          error,
          'Entry was saved but transaction logging failed. Please check budget.transaction_records configuration.'
        )
      })
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const [rows, options] = await Promise.all([
        fetchBudgetAccountDetails(),
        fetchBudgetGlAccountOptions(),
      ])

      const optionLookup = new Map(options.map((item) => [item.id, item]))

      setMajorAccountGroupOptions(options)
      setRecords(rows.map((row) => mapRowToRecord(row, optionLookup)))
    } catch (error) {
      setLoadError(toErrorMessage(error, 'Failed to load work financial plan data.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const years = useMemo(() => [...new Set(records.map((d) => d.year))].sort((a, b) => b - a), [records])

  const filteredGlAccountOptions = useMemo(() => {
    return majorAccountGroupOptions.filter((option) => option.accountType === 'Budgetary Accounts')
  }, [majorAccountGroupOptions])

  // Filtered data
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return records.filter((item) => {
      const matchesSearch = item.majorAccountGroup.toLowerCase().includes(q)
      const matchesYear = selectedYear === 'all' || item.year === Number(selectedYear)
      return matchesSearch && matchesYear
    })
  }, [searchQuery, selectedYear, records])

  // Stats
  const stats = useMemo(() => {
    const totalBudget = filteredData.reduce((sum, d) => sum + d.budget, 0)
    const totalRemaining = filteredData.reduce((sum, d) => sum + d.remaining, 0)
    return { totalBudget, totalRemaining }
  }, [filteredData])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / BUDGET_TABLE_ROWS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startIdx = (safePage - 1) * BUDGET_TABLE_ROWS_PER_PAGE
  const pageData = filteredData.slice(startIdx, startIdx + BUDGET_TABLE_ROWS_PER_PAGE)

  // Reset page on filter change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }
  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    setCurrentPage(1)
  }

  const handleFormChange = (field: keyof AccountDetailForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (mutationError) setMutationError(null)

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    if (field === 'accountType' && formErrors.majorAccountGroupId) {
      setFormErrors((prev) => ({ ...prev, majorAccountGroupId: undefined }))
    }
  }

  const openCreateDialog = () => {
    setEditingId(null)
    setFormData(createEmptyForm())
    setFormErrors({})
    setMutationError(null)
    setIsFormOpen(true)
  }

  const openEditDialog = (record: WorkFinancialPlanRecord) => {
    setEditingId(record.id)
    setFormData(recordToForm(record))
    setFormErrors({})
    setMutationError(null)
    setIsFormOpen(true)
  }

  const validateForm = () => {
    const errors: AccountDetailFormErrors = {}
    const parsedYear = Number(formData.year)
    const fromDate = formData.fromDate
    const toDate = formData.toDate

    if (!formData.majorAccountGroupId.trim()) {
      errors.majorAccountGroupId = 'General ledger account is required.'
    }

    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      errors.year = 'Enter a valid year (2000-2100).'
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required.'
    }

    const parsedFromDate = new Date(`${fromDate}T00:00:00`)
    const parsedToDate = new Date(`${toDate}T00:00:00`)

    if (!fromDate || Number.isNaN(parsedFromDate.getTime())) {
      errors.fromDate = 'Select a valid start date.'
    }

    if (!toDate || Number.isNaN(parsedToDate.getTime())) {
      errors.toDate = 'Select a valid end date.'
    }

    if (
      !errors.fromDate &&
      !errors.toDate &&
      toDate < fromDate
    ) {
      errors.toDate = 'End date must be on or after start date.'
    }

    if (!errors.fromDate && Number.isInteger(parsedYear)) {
      const fromYear = parsedFromDate.getFullYear()
      if (fromYear !== parsedYear) {
        errors.fromDate = 'Start date year must match selected year.'
      }
    }

    if (!errors.toDate && Number.isInteger(parsedYear)) {
      const toYear = parsedToDate.getFullYear()
      if (toYear !== parsedYear) {
        errors.toDate = 'End date year must match selected year.'
      }
    }

    if (
      formData.majorAccountGroupId &&
      !errors.fromDate &&
      !errors.toDate &&
      records.some(
        (record) =>
          record.majorAccountGroupId === formData.majorAccountGroupId &&
          record.id !== editingId &&
          isDateRangeOverlapping(fromDate, toDate, record.fromDate, record.toDate)
      )
    ) {
      errors.toDate = 'Date range overlaps an existing entry for this major account group.'
    }

    const parsedBudget = Number(formData.budget)
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      errors.budget = 'Budget must be a non-negative amount.'
    }

    const parsedRemaining = Number(formData.remaining)
    if (!Number.isFinite(parsedRemaining) || parsedRemaining < 0) {
      errors.remaining = 'Remaining must be a non-negative amount.'
    }

    if (
      Number.isFinite(parsedBudget) &&
      Number.isFinite(parsedRemaining) &&
      parsedRemaining > parsedBudget
    ) {
      errors.remaining = 'Remaining cannot be greater than budget.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitForm = () => {
    if (!validateForm() || isSubmitting) {
      return
    }

    void (async () => {
      setIsSubmitting(true)
      setMutationError(null)

      try {
        const payload = {
          mag_id: formData.majorAccountGroupId,
          year: String(Number(formData.year)),
          description: formData.description.trim(),
          from_date: formData.fromDate,
          to_date: formData.toDate,
          budget: Number(formData.budget),
          remaining: Number(formData.remaining),
        }

        const optionLookup = new Map(majorAccountGroupOptions.map((item) => [item.id, item]))

        if (editingId) {
          const updated = await updateBudgetAccountDetail(editingId, payload)
          const updatedRecord = mapRowToRecord(updated, optionLookup)
          setRecords((prev) => prev.map((item) => (item.id === editingId ? updatedRecord : item)))
          await logAccountDetailTransaction('UPDATE', updatedRecord, {
            accountType: updatedRecord.accountType,
            year: updatedRecord.year,
            description: updatedRecord.description,
            fromDate: updatedRecord.fromDate,
            toDate: updatedRecord.toDate,
            budget: updatedRecord.budget,
            remaining: updatedRecord.remaining,
            majorAccountGroupId: updatedRecord.majorAccountGroupId,
          })
        } else {
          const created = await createBudgetAccountDetail(payload)
          const createdRecord = mapRowToRecord(created, optionLookup)
          setRecords((prev) => [createdRecord, ...prev])
          await logAccountDetailTransaction('CREATE', createdRecord, {
            accountType: createdRecord.accountType,
            year: createdRecord.year,
            description: createdRecord.description,
            fromDate: createdRecord.fromDate,
            toDate: createdRecord.toDate,
            budget: createdRecord.budget,
            remaining: createdRecord.remaining,
            majorAccountGroupId: createdRecord.majorAccountGroupId,
          })
        }

        setIsFormOpen(false)
        setEditingId(null)
        setFormData(createEmptyForm())
        setFormErrors({})
      } catch (error) {
        const message = toErrorMessage(error, 'Failed to save work financial plan entry.')

        if (
          message.includes('excl_work_financial_plan_mag_date_overlap') ||
          message.toLowerCase().includes('conflicting key value violates exclusion constraint')
        ) {
          setFormErrors((prev) => ({
            ...prev,
            toDate: 'Date range overlaps an existing entry for this major account group.',
          }))
          setMutationError('Date range overlaps an existing entry. Choose a non-overlapping range (e.g., start after the current end date).')
        } else if (
          message.includes('uq_budget_account_details_year_rc_gla_type')
        ) {
          setMutationError('Database still has a legacy constraint path. Please apply the latest budget migrations, then try again.')
        } else {
          setMutationError(message)
        }
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  const handleDelete = () => {
    if (!deleteTarget || isDeleting) return

    void (async () => {
      setIsDeleting(true)
      setMutationError(null)

      try {
        await deleteBudgetAccountDetail(deleteTarget.id)
        await logAccountDetailTransaction('DELETE', deleteTarget, {
          accountType: deleteTarget.accountType,
          year: deleteTarget.year,
          budget: deleteTarget.budget,
          remaining: deleteTarget.remaining,
          majorAccountGroupId: deleteTarget.majorAccountGroupId,
        })
        setRecords((prev) => prev.filter((item) => item.id !== deleteTarget.id))
        setDeleteTarget(null)
      } catch (error) {
        setMutationError(toErrorMessage(error, 'Failed to delete work financial plan entry.'))
      } finally {
        setIsDeleting(false)
      }
    })()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Work Financial Plan"
        subtitle="General ledger accounts with budget allocation and utilization"
        icon={<BookOpen className="w-6 h-6" />}
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

      {/* Summary Cards */}
      <StatsRow>
        <StatCard
          label="Total Budget"
          value={formatCurrency(stats.totalBudget)}
          color="primary"
          icon={<Wallet className="w-4 h-4" />}
        />
        <StatCard
          label="Total Remaining"
          value={formatCurrency(stats.totalRemaining)}
          color="warning"
          icon={<Calendar className="w-4 h-4" />}
        />
      </StatsRow>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <BudgetSearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by general ledger account..."
          />
          <BudgetYearFilter value={selectedYear} years={years} onChange={handleYearChange} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        {/* Table Title */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-success">
            <FileSpreadsheet className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">GL Account Entries</h2>
          <button
            onClick={openCreateDialog}
            disabled={isLoading || majorAccountGroupOptions.length === 0}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
          <span className="text-xs text-muted font-medium">
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Major Account Group
                </th>
                <th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Description
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[80px]">
                  Year
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[100px]">
                  From Date
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[100px]">
                  To Date
                </th>
                <th className="bg-background text-muted font-semibold text-right px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Budget
                </th>
                <th className="bg-background text-muted font-semibold text-right px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
                  Remaining
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[160px]">
                  Utilization
                </th>
                <th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[130px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <BudgetLoadingRow colSpan={9} message="Loading work financial plan entries..." />
              ) : pageData.length === 0 ? (
                <BudgetEmptyRow
                  colSpan={9}
                  content={
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-10 h-10 text-muted/40" />
                      <span className="text-muted text-sm">No records found</span>
                      <button
                        onClick={openCreateDialog}
                        className="inline-flex items-center gap-2 mt-2 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Entry
                      </button>
                    </div>
                  }
                />
              ) : (
                <>
                  {pageData.map((item) => {
                    const pct = getUtilizationPercent(item.budget, item.remaining)
                    const uColor = getUtilizationColor(pct)
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-background transition-colors group"
                      >
                        {/* Major Account Group */}
                        <td className="px-4 py-3.5 border-b border-border/50">
                          <span className="text-sm text-foreground">{item.majorAccountGroup}</span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-border/50">
                          <span className="text-sm text-foreground">{item.description}</span>
                        </td>
                        {/* Year */}
                        <td className="px-4 py-3.5 border-b border-border/50 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700">
                            {item.year}
                          </span>
                        </td>
                        {/* From Month */}
                        <td className="px-4 py-3.5 border-b border-border/50 text-center">
                          <span className="text-sm text-foreground">
                            {formatMonthDay(item.fromDate)}
                          </span>
                        </td>
                        {/* To Month */}
                        <td className="px-4 py-3.5 border-b border-border/50 text-center">
                          <span className="text-sm text-foreground">
                            {formatMonthDay(item.toDate)}
                          </span>
                        </td>
                        {/* Budget */}
                        <td className="px-4 py-3.5 border-b border-border/50 text-right font-medium text-foreground tabular-nums">
                          {formatCurrency(item.budget)}
                        </td>
                        {/* Remaining */}
                        <td className="px-4 py-3.5 border-b border-border/50 text-right tabular-nums">
                          <span
                            className={cn(
                              'font-medium',
                              item.remaining === 0
                                ? 'text-danger'
                                : 'text-foreground'
                            )}
                          >
                            {formatCurrency(item.remaining)}
                          </span>
                        </td>
                        {/* Utilization Bar */}
                        <td className="px-4 py-3.5 border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <progress
                              value={Math.min(pct, 100)}
                              max={100}
                              className={cn('flex-1 h-2 rounded-full overflow-hidden', uColor.bar)}
                              aria-label={`Utilization ${pct.toFixed(0)} percent`}
                            />
                            <span
                              className={cn(
                                'text-xs font-semibold min-w-[40px] text-right',
                                uColor.text
                              )}
                            >
                              {pct.toFixed(0)}%
                              </span>
                            </div>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3.5 border-b border-border/50">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditDialog(item)}
                              aria-label={`Edit ${item.majorAccountGroup}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted hover:text-primary hover:bg-background transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              aria-label={`Delete ${item.majorAccountGroup}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Pad empty rows */}
                  <BudgetPadRows rowCount={pageData.length} rowsPerPage={BUDGET_TABLE_ROWS_PER_PAGE} colSpan={9} />
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <BudgetTableFooter
          totalCount={filteredData.length}
          currentPage={safePage}
          totalPages={totalPages}
          rowsPerPage={BUDGET_TABLE_ROWS_PER_PAGE}
          startIndex={startIdx}
          onPageChange={setCurrentPage}
        />
      </div>

      <BaseDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit Budget Entry' : 'Add Budget Entry'}
        onSubmit={handleSubmitForm}
        submitLabel={editingId ? 'Save Changes' : 'Create Entry'}
        cancelLabel="Cancel"
        isLoading={isSubmitting}
        size="lg"
      >
        {mutationError && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {mutationError}
          </div>
        )}

        <WorkFinancialPlanFormFields
          formData={formData}
          formErrors={formErrors}
          filteredGlAccountOptions={filteredGlAccountOptions}
          onFormChange={handleFormChange}
        />

      </BaseDialog>

      <BaseDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Work Financial Plan Entry"
        onSubmit={handleDelete}
        submitLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        size="sm"
      >
        <div className="space-y-3 text-sm">
          <p className="text-foreground">This action will permanently remove this entry from the current list.</p>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="font-medium text-foreground">{deleteTarget?.majorAccountGroup}</p>
          </div>
          <p className="text-muted">Are you sure you want to continue?</p>
        </div>
      </BaseDialog>
    </div>
  )
}
