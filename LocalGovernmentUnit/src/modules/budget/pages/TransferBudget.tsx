import { useEffect, useMemo, useState } from 'react'
import {
	ArrowRightLeft,
	Wallet,
	FileSpreadsheet,
	HandCoins,
} from 'lucide-react'
import { PageHeader, StatsRow, StatCard } from '@/components/ui'
import { BUDGET_TABLE_ROWS_PER_PAGE } from '@/modules/budget/components/budgetConstants'
import { mapBudgetAccountDetailRow } from '@/modules/budget/components/budgetMappers'
import { BudgetSearchInput } from '@/modules/budget/components/BudgetSearchInput'
import { TransferBudgetForm } from '@/modules/budget/components/TransferBudgetForm'
import { BudgetEmptyRow, BudgetLoadingRow } from '@/modules/budget/components/BudgetTableRows'
import { formatCurrency, toErrorMessage } from '@/modules/budget/components/budgetUtils'
import {
	fetchBudgetAccountDetails,
	fetchBudgetGlAccountOptions,
	transferBudgetAllocation,
	type BudgetAccountType,
} from '@/services/budgetAccountDetailsService'
import { useAuthStore } from '@/store'

interface TransferBudgetRecord {
	id: string
	accountType: BudgetAccountType | null
	majorAccountGroupId: string
	glAccount: string
	year: number
	budget: number
	remaining: number
}

export default function TransferBudget() {
	const currentUser = useAuthStore((state) => state.user)

	const [records, setRecords] = useState<TransferBudgetRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [submitError, setSubmitError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [fromAccountId, setFromAccountId] = useState('')
	const [toAccountId, setToAccountId] = useState('')
	const [transferAmount, setTransferAmount] = useState('')
	const [reason, setReason] = useState('')

	const loadData = async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const [rows, options] = await Promise.all([
				fetchBudgetAccountDetails(),
				fetchBudgetGlAccountOptions(),
			])

			const optionLookup = new Map(options.map((item) => [item.id, item]))
			setRecords(
				rows.map((row) => {
					const baseRecord = mapBudgetAccountDetailRow(row, optionLookup)
					return {
						id: baseRecord.id,
						accountType: baseRecord.accountType,
						majorAccountGroupId: baseRecord.majorAccountGroupId,
						glAccount: baseRecord.majorAccountGroupLabel,
						year: baseRecord.year,
						budget: baseRecord.budget,
						remaining: baseRecord.remaining,
					}
				})
			)
		} catch (error) {
			const message = toErrorMessage(error, 'Failed to load work financial plan entries for transfer.')
			if (message.toLowerCase().includes('permission denied for schema accounting') || message.toLowerCase().includes('permission denied for schema budget')) {
				setLoadError('Database permissions are missing for Budget/Accounting schemas. Run migration 022_fix_budget_accounting_permissions.sql.')
			} else {
				setLoadError(message)
			}
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		void loadData()
	}, [])

	const budgetaryRecords = useMemo(
		() => records.filter((item) => item.accountType === 'Budgetary Accounts'),
		[records]
	)

	const fromRecord = useMemo(
		() => budgetaryRecords.find((item) => item.id === fromAccountId) ?? null,
		[budgetaryRecords, fromAccountId]
	)
	const toRecord = useMemo(
		() => budgetaryRecords.find((item) => item.id === toAccountId) ?? null,
		[budgetaryRecords, toAccountId]
	)

	const destinationOptions = useMemo(() => {
		if (!fromRecord) return budgetaryRecords.filter((item) => item.id !== fromAccountId)
		return budgetaryRecords.filter((item) => item.id !== fromRecord.id && item.year === fromRecord.year)
	}, [budgetaryRecords, fromRecord, fromAccountId])

	const filteredData = useMemo(() => {
		const query = searchQuery.toLowerCase().trim()
		if (!query) return budgetaryRecords

		return budgetaryRecords.filter((item) => {
			return (
				item.glAccount.toLowerCase().includes(query) ||
				String(item.year).includes(query)
			)
		})
	}, [budgetaryRecords, searchQuery])

	const pageData = filteredData.slice(0, BUDGET_TABLE_ROWS_PER_PAGE)

	const stats = useMemo(() => {
		const totalBudget = budgetaryRecords.reduce((sum, item) => sum + item.budget, 0)
		const totalRemaining = budgetaryRecords.reduce((sum, item) => sum + item.remaining, 0)

		return {
			totalAccounts: budgetaryRecords.length,
			totalBudget,
			totalRemaining,
		}
	}, [budgetaryRecords])

	useEffect(() => {
		if (fromAccountId && !budgetaryRecords.some((item) => item.id === fromAccountId)) {
			setFromAccountId('')
		}
		if (toAccountId && !budgetaryRecords.some((item) => item.id === toAccountId)) {
			setToAccountId('')
		}
	}, [budgetaryRecords, fromAccountId, toAccountId])

	const validateTransfer = () => {
		if (!fromRecord) return 'Please select a source account.'
		if (!toRecord) return 'Please select a destination account.'
		if (fromRecord.accountType !== 'Budgetary Accounts' || toRecord.accountType !== 'Budgetary Accounts') {
			return 'Transfers are allowed only between Budgetary Accounts.'
		}
		if (fromRecord.id === toRecord.id) return 'Source and destination must be different.'

		const amount = Number(transferAmount)
		if (!Number.isFinite(amount) || amount <= 0) return 'Transfer amount must be greater than zero.'
		if (amount > fromRecord.remaining) {
			return `Transfer amount cannot exceed source remaining balance of ${formatCurrency(fromRecord.remaining)}.`
		}

		if (fromRecord.year !== toRecord.year) {
			return 'Source and destination must be in the same year.'
		}

		return null
	}

	const handleTransfer = () => {
		if (isSubmitting) return

		const error = validateTransfer()
		if (error) {
			setSubmitError(error)
			setSuccessMessage(null)
			return
		}

		void (async () => {
			const amount = Number(transferAmount)
			if (!fromRecord || !toRecord || !Number.isFinite(amount)) return

			setIsSubmitting(true)
			setSubmitError(null)
			setSuccessMessage(null)

			try {
				await transferBudgetAllocation({
					fromAccountDetailId: fromRecord.id,
					toAccountDetailId: toRecord.id,
					amount,
					actorId: currentUser?.id ?? null,
					actorName: currentUser?.username ?? null,
					reason: reason.trim() || null,
				})

				setSuccessMessage(
					`Successfully transferred ${formatCurrency(amount)} from ${fromRecord.glAccount} to ${toRecord.glAccount}.`
				)

				setTransferAmount('')
				setReason('')
				await loadData()
			} catch (transferError) {
				setSubmitError(toErrorMessage(transferError, 'Failed to transfer budget.'))
			} finally {
				setIsSubmitting(false)
			}
		})()
	}

	const handleSourceAccountChange = (nextSourceId: string) => {
		setFromAccountId(nextSourceId)

		if (nextSourceId === toAccountId) {
			setToAccountId('')
		}
	}

	const sourceRemainingText = fromRecord
		? `Source remaining balance: ${formatCurrency(fromRecord.remaining)}`
		: 'Select source and destination budgetary accounts to transfer budget.'

	return (
		<div className="p-6 space-y-6">
			<PageHeader
				title="Transfer Budget"
				subtitle="Move budget allocation between budgetary general ledger accounts"
				icon={<ArrowRightLeft className="w-6 h-6" />}
			/>

			{loadError && (
				<div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
					{loadError}
				</div>
			)}

			{submitError && (
				<div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
					{submitError}
				</div>
			)}

			{successMessage && (
				<div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
					{successMessage}
				</div>
			)}

			<StatsRow>
				<StatCard
					label="Work Plan Rows"
					value={stats.totalAccounts}
					color="primary"
					icon={<FileSpreadsheet className="w-4 h-4" />}
				/>
				<StatCard
					label="Total Budget"
					value={formatCurrency(stats.totalBudget)}
					color="warning"
					icon={<Wallet className="w-4 h-4" />}
				/>
				<StatCard
					label="Total Remaining"
					value={formatCurrency(stats.totalRemaining)}
					color="success"
					icon={<HandCoins className="w-4 h-4" />}
				/>
			</StatsRow>

			<TransferBudgetForm
				budgetaryRecords={budgetaryRecords}
				destinationOptions={destinationOptions}
				fromAccountId={fromAccountId}
				toAccountId={toAccountId}
				transferAmount={transferAmount}
				reason={reason}
				sourceRemainingText={sourceRemainingText}
				disabled={isLoading || isSubmitting || budgetaryRecords.length < 2}
				isSubmitting={isSubmitting}
				onSourceChange={handleSourceAccountChange}
				onDestinationChange={setToAccountId}
				onAmountChange={setTransferAmount}
				onReasonChange={setReason}
				onSubmit={handleTransfer}
			/>

			<div className="bg-surface border border-border rounded-2xl p-6">
				<div className="mb-4">
					<BudgetSearchInput
						value={searchQuery}
						onChange={setSearchQuery}
						placeholder="Search work financial plan entries..."
					/>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
									GL Account
								</th>
								<th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[100px]">
									Year
								</th>
								<th className="bg-background text-muted font-semibold text-right px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
									Budget
								</th>
								<th className="bg-background text-muted font-semibold text-right px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
									Remaining
								</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<BudgetLoadingRow colSpan={4} message="Loading account balances..." />
							) : pageData.length === 0 ? (
								<BudgetEmptyRow
									colSpan={4}
									content={<span className="text-sm text-muted">No work financial plan rows found.</span>}
								/>
							) : (
								pageData.map((item) => (
									<tr key={item.id} className="hover:bg-background transition-colors">
										<td className="px-4 py-3.5 border-b border-border/50 text-foreground">{item.glAccount}</td>
										<td className="px-4 py-3.5 border-b border-border/50 text-center text-foreground">{item.year}</td>
										<td className="px-4 py-3.5 border-b border-border/50 text-right text-foreground font-medium tabular-nums">
											{formatCurrency(item.budget)}
										</td>
										<td className="px-4 py-3.5 border-b border-border/50 text-right text-foreground font-medium tabular-nums">
											{formatCurrency(item.remaining)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}
