import { cn } from '@/lib/utils'
import type { BudgetMajorAccountGroupOption } from '@/services/budgetAccountDetailsService'
import type { AccountDetailForm, AccountDetailFormErrors } from '@/modules/budget/components/workFinancialPlanTypes'

interface WorkFinancialPlanFormFieldsProps {
  formData: AccountDetailForm
  formErrors: AccountDetailFormErrors
  filteredGlAccountOptions: BudgetMajorAccountGroupOption[]
  onFormChange: (field: keyof AccountDetailForm, value: string) => void
}

export function WorkFinancialPlanFormFields({
  formData,
  formErrors,
  filteredGlAccountOptions,
  onFormChange,
}: WorkFinancialPlanFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
      <div className="space-y-1.5 md:col-span-2">
        <label htmlFor="entryYear" className="block text-sm font-medium text-foreground">
          Year <span className="text-danger">*</span>
        </label>
        <input
          id="entryYear"
          type="number"
          min={2000}
          max={2100}
          value={formData.year}
          onChange={(event) => onFormChange('year', event.target.value)}
          placeholder="e.g. 2026"
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.year ? 'border-danger' : 'border-border',
          )}
        />
        {formErrors.year && <p className="text-xs text-danger">{formErrors.year}</p>}
      </div>

      <div className="space-y-1.5 md:col-span-2 relative z-10">
        <label htmlFor="majorAccountGroup" className="block text-sm font-medium text-foreground">
          Major Account Group <span className="text-danger">*</span>
        </label>
        <select
          id="majorAccountGroup"
          value={formData.majorAccountGroupId}
          onChange={(event) => onFormChange('majorAccountGroupId', event.target.value)}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.majorAccountGroupId ? 'border-danger' : 'border-border',
          )}
        >
          <option value="">Select major account group</option>
          {filteredGlAccountOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {formErrors.majorAccountGroupId && <p className="text-xs text-danger">{formErrors.majorAccountGroupId}</p>}
        {filteredGlAccountOptions.length === 0 && !formErrors.majorAccountGroupId && (
          <p className="text-xs text-muted">No budgetary major account groups available.</p>
        )}
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <label htmlFor="entryDescription" className="block text-sm font-medium text-foreground">
          Description <span className="text-danger">*</span>
        </label>
        <input
          id="entryDescription"
          type="text"
          value={formData.description}
          onChange={(event) => onFormChange('description', event.target.value)}
          placeholder="e.g. Monthly, Quarterly, Daily, Yearly"
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.description ? 'border-danger' : 'border-border',
          )}
        />
        {formErrors.description && <p className="text-xs text-danger">{formErrors.description}</p>}
      </div>

      <div className="space-y-1.5 relative z-10">
        <label htmlFor="fromDate" className="block text-sm font-medium text-foreground">
          From Date <span className="text-danger">*</span>
        </label>
        <input
          id="fromDate"
          type="date"
          value={formData.fromDate}
          onChange={(event) => onFormChange('fromDate', event.target.value)}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.fromDate ? 'border-danger' : 'border-border',
          )}
        />
        {formErrors.fromDate && <p className="text-xs text-danger">{formErrors.fromDate}</p>}
      </div>

      <div className="space-y-1.5 relative z-10">
        <label htmlFor="toDate" className="block text-sm font-medium text-foreground">
          To Date <span className="text-danger">*</span>
        </label>
        <input
          id="toDate"
          type="date"
          value={formData.toDate}
          onChange={(event) => onFormChange('toDate', event.target.value)}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.toDate ? 'border-danger' : 'border-border',
          )}
        />
        {formErrors.toDate && <p className="text-xs text-danger">{formErrors.toDate}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="entryBudget" className="block text-sm font-medium text-foreground">
          Budget <span className="text-danger">*</span>
        </label>
        <input
          id="entryBudget"
          type="number"
          min={0}
          step="0.01"
          value={formData.budget}
          onChange={(event) => onFormChange('budget', event.target.value)}
          placeholder="0.00"
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.budget ? 'border-danger' : 'border-border',
          )}
        />
        {formErrors.budget && <p className="text-xs text-danger">{formErrors.budget}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="entryRemaining" className="block text-sm font-medium text-foreground">
          Remaining <span className="text-danger">*</span>
        </label>
        <input
          id="entryRemaining"
          type="number"
          min={0}
          step="0.01"
          value={formData.remaining}
          onChange={(event) => onFormChange('remaining', event.target.value)}
          placeholder="0.00"
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors',
            formErrors.remaining ? 'border-danger' : 'border-border',
          )}
        />
        {formErrors.remaining && <p className="text-xs text-danger">{formErrors.remaining}</p>}
      </div>
    </div>
  )
}
