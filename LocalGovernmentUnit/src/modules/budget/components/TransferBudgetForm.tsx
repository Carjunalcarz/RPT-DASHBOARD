import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/modules/budget/components/budgetUtils'

interface TransferBudgetFormAccount {
  id: string
  glAccount: string
  year: number
  remaining: number
}

interface TransferBudgetFormProps {
  budgetaryRecords: TransferBudgetFormAccount[]
  destinationOptions: TransferBudgetFormAccount[]
  fromAccountId: string
  toAccountId: string
  transferAmount: string
  reason: string
  sourceRemainingText: string
  disabled: boolean
  isSubmitting: boolean
  onSourceChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onAmountChange: (value: string) => void
  onReasonChange: (value: string) => void
  onSubmit: () => void
}

export function TransferBudgetForm({
  budgetaryRecords,
  destinationOptions,
  fromAccountId,
  toAccountId,
  transferAmount,
  reason,
  sourceRemainingText,
  disabled,
  isSubmitting,
  onSourceChange,
  onDestinationChange,
  onAmountChange,
  onReasonChange,
  onSubmit,
}: TransferBudgetFormProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Transfer Form</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="source-account" className="text-sm font-medium text-foreground">
            Source Account
          </label>
          <select
            id="source-account"
            value={fromAccountId}
            onChange={(event) => onSourceChange(event.target.value)}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success transition-colors"
          >
            <option value="">Select source account</option>
            {budgetaryRecords.map((item) => (
              <option key={item.id} value={item.id}>
                {item.glAccount} ({item.year}) — Remaining {formatCurrency(item.remaining)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="destination-account" className="text-sm font-medium text-foreground">
            Destination Account
          </label>
          <select
            id="destination-account"
            value={toAccountId}
            onChange={(event) => onDestinationChange(event.target.value)}
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success transition-colors"
          >
            <option value="">Select destination account</option>
            {destinationOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.glAccount} ({item.year}) — Remaining {formatCurrency(item.remaining)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="transfer-amount" className="text-sm font-medium text-foreground">
            Amount
          </label>
          <input
            id="transfer-amount"
            type="number"
            min="0"
            step="0.01"
            value={transferAmount}
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="transfer-reason" className="text-sm font-medium text-foreground">
            Reason (optional)
          </label>
          <input
            id="transfer-reason"
            type="text"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Reason for transfer"
            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-muted">{sourceRemainingText}</div>

        <button
          onClick={onSubmit}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
          Transfer Budget
        </button>
      </div>
    </div>
  )
}
