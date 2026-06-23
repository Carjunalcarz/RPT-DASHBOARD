import { useEffect, useMemo, useState } from 'react'
import {
	History,
	Hash,
	Calendar,
	FileSpreadsheet,
	Activity,
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
	fetchBudgetTransactionRecords,
	type BudgetTransactionRecordRow,
} from '@/services/budgetAccountDetailsService'

interface TransactionHistoryRecord {
	id: string
	createdAt: string
	moduleName: 'account_details' | 'pending_details' | 'work_financial_plan'
	actionType: string
	description: string
	actorName: string
}

const MODULE_LABELS: Record<TransactionHistoryRecord['moduleName'], string> = {
	account_details: 'Work Financial Plan (Legacy)',
	pending_details: 'Pending Details',
	work_financial_plan: 'Work Financial Plan',
}

const mapRowToRecord = (row: BudgetTransactionRecordRow): TransactionHistoryRecord => ({
	id: row.id,
	createdAt: row.created_at,
	moduleName: row.module_name,
	actionType: row.action_type,
	description: row.description,
	actorName: row.actor_name?.trim() || 'System',
})

export default function TransactionRecords() {
	const [records, setRecords] = useState<TransactionHistoryRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedModule, setSelectedModule] = useState<'all' | TransactionHistoryRecord['moduleName']>('all')
	const [selectedYear, setSelectedYear] = useState<string>('all')
	const [currentPage, setCurrentPage] = useState(1)

	const loadData = async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const rows = await fetchBudgetTransactionRecords()
			setRecords(rows.map(mapRowToRecord))
		} catch (error) {
			const message = toErrorMessage(error, 'Failed to load transaction records.')
			if (message.toLowerCase().includes('permission denied for schema budget')) {
				setLoadError('Database permissions are missing for Budget schema. Run migration 022_fix_budget_accounting_permissions.sql.')
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

	const years = useMemo(() => getSortedYears(records, (item) => item.createdAt), [records])

	const filteredData = useMemo(() => {
		const query = searchQuery.toLowerCase().trim()

		return records.filter((item) => {
			const year = new Date(item.createdAt).getFullYear()
			const matchesSearch =
				item.description.toLowerCase().includes(query) ||
				item.actionType.toLowerCase().includes(query) ||
				MODULE_LABELS[item.moduleName].toLowerCase().includes(query)
			const matchesModule = selectedModule === 'all' || item.moduleName === selectedModule
			const matchesYear = selectedYear === 'all' || year === Number(selectedYear)

			return matchesSearch && matchesModule && matchesYear
		})
	}, [searchQuery, selectedModule, selectedYear, records])

	const stats = useMemo(() => {
		const workFinancialPlanCount = filteredData.filter((item) => item.moduleName === 'work_financial_plan').length
		const pendingDetailCount = filteredData.filter((item) => item.moduleName === 'pending_details').length

		return {
			total: filteredData.length,
			workFinancialPlanCount,
			pendingDetailCount,
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

	const handleModuleChange = (value: 'all' | TransactionHistoryRecord['moduleName']) => {
		setSelectedModule(value)
		setCurrentPage(1)
	}

	const handleYearChange = (value: string) => {
		setSelectedYear(value)
		setCurrentPage(1)
	}

	return (
		<div className="p-6 space-y-6">
			<PageHeader
				title="Transaction Records"
				subtitle="Tracking history from Work Financial Plan and Pending Details"
				icon={<History className="w-6 h-6" />}
			/>

			{loadError && (
				<div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
					{loadError}
				</div>
			)}

			<StatsRow>
				<StatCard label="Total Records" value={stats.total} color="primary" icon={<Hash className="w-4 h-4" />} />
				<StatCard
					label="Work Financial Plan"
					value={stats.workFinancialPlanCount}
					color="success"
					icon={<Activity className="w-4 h-4" />}
				/>
				<StatCard
					label="Pending Details"
					value={stats.pendingDetailCount}
					color="warning"
					icon={<Calendar className="w-4 h-4" />}
				/>
			</StatsRow>

			<div className="bg-surface border border-border rounded-2xl p-4">
				<div className="flex flex-col lg:flex-row gap-3">
					<BudgetSearchInput
						value={searchQuery}
						onChange={handleSearchChange}
						placeholder="Search by action or description..."
					/>

					<select
						value={selectedModule}
						onChange={(e) => handleModuleChange(e.target.value as 'all' | TransactionHistoryRecord['moduleName'])}
						aria-label="Filter by source module"
						className="px-4 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success min-w-[180px] transition-colors"
					>
						<option value="all">All Sources</option>
						<option value="work_financial_plan">Work Financial Plan</option>
						<option value="pending_details">Pending Details</option>
					</select>

					<BudgetYearFilter value={selectedYear} years={years} onChange={handleYearChange} />
				</div>
			</div>

			<div className="bg-surface border border-border rounded-2xl p-6">
				<div className="flex items-center gap-2 mb-4">
					<span className="text-success">
						<FileSpreadsheet className="w-5 h-5" />
					</span>
					<h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
					<span className="ml-auto text-xs text-muted font-medium">
						{filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[220px]">
									Timestamp
								</th>
								<th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[150px]">
									Source
								</th>
								<th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[140px]">
									Action
								</th>
								<th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider">
									Description
								</th>
								<th className="bg-background text-muted font-semibold text-left px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[150px]">
									Actor
								</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<BudgetLoadingRow colSpan={5} message="Loading transaction records..." />
							) : pageData.length === 0 ? (
								<BudgetEmptyRow
									colSpan={5}
									content={
										<div className="flex flex-col items-center gap-2">
											<FileSpreadsheet className="w-10 h-10 text-muted/40" />
											<span className="text-muted text-sm">No transaction records found</span>
										</div>
									}
								/>
							) : (
								<>
									{pageData.map((item) => (
										<tr key={item.id} className="hover:bg-background transition-colors">
											<td className="px-4 py-3.5 border-b border-border/50 text-foreground">{formatDateTime(item.createdAt)}</td>
											<td className="px-4 py-3.5 border-b border-border/50">
												<span
													className={cn(
														'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border',
														item.moduleName === 'work_financial_plan'
															? 'bg-success/10 border-success/20 text-success'
															: item.moduleName === 'account_details'
																? 'bg-primary/10 border-primary/20 text-primary'
																: 'bg-accent/10 border-accent/20 text-accent'
													)}
												>
													{MODULE_LABELS[item.moduleName]}
												</span>
											</td>
											<td className="px-4 py-3.5 border-b border-border/50 text-foreground font-medium">
												{item.actionType}
											</td>
											<td className="px-4 py-3.5 border-b border-border/50 text-foreground">{item.description}</td>
											<td className="px-4 py-3.5 border-b border-border/50 text-foreground">{item.actorName}</td>
										</tr>
									))}
									<BudgetPadRows rowCount={pageData.length} rowsPerPage={BUDGET_TABLE_ROWS_PER_PAGE} colSpan={5} />
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
