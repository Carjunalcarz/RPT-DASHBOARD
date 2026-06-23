import type { BudgetAccountType } from '@/services/budgetAccountDetailsService'

export interface AccountDetailForm {
  accountType: '' | BudgetAccountType
  majorAccountGroupId: string
  year: string
  description: string
  fromDate: string
  toDate: string
  budget: string
  remaining: string
}

export type AccountDetailFormErrors = Partial<Record<keyof AccountDetailForm, string>>
