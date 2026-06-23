import type {
  BudgetAccountDetailRow,
  BudgetAccountType,
  BudgetMajorAccountGroupOption,
} from '@/services/budgetAccountDetailsService'

interface BudgetAccountDetailBaseRecord {
  id: string
  accountType: BudgetAccountType | null
  majorAccountGroupId: string
  majorAccountGroupLabel: string
  year: number
  budget: number
  remaining: number
}

export const mapBudgetAccountDetailRow = (
  row: BudgetAccountDetailRow,
  optionLookup: Map<string, BudgetMajorAccountGroupOption>,
): BudgetAccountDetailBaseRecord => {
  const option = optionLookup.get(row.mag_id)

  return {
    id: row.id,
    accountType: option?.accountType ?? null,
    majorAccountGroupId: row.mag_id,
    majorAccountGroupLabel: option?.label ?? `Unknown Major Account Group (${row.mag_id})`,
    year: Number(row.year),
    budget: Number(row.budget),
    remaining: Number(row.remaining),
  }
}
