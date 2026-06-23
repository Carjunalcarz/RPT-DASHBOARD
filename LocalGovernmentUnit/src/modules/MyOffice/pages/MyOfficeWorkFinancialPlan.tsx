import { useEffect, useMemo, useState } from "react";
import { BookOpen, Eye, FileText, Search, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { PageHeader } from "@/components/ui";
import {
  BudgetEmptyRow,
  BudgetLoadingRow,
} from "@/modules/budget/components/BudgetTableRows";
import {
  formatCurrency,
  toErrorMessage,
} from "@/modules/budget/components/budgetUtils";
import {
  fetchBudgetAccountDetails,
  fetchBudgetGlAccountOptions,
  type BudgetAccountDetailRow,
  type BudgetMajorAccountGroupOption,
} from "@/services/budgetAccountDetailsService";
import {
  fetchPRLines,
  fetchPurchaseRequests,
  fetchSections,
} from "@/services/gseService";
import type { PurchaseRequest, PurchaseRequestLine } from "@/types/gse.types";

interface AccountDetailRecord {
  id: string;
  majorAccountGroupId: string;
  majorAccountGroup: string;
  year: number;
  description: string;
  fromDate: string;
  toDate: string;
  budget: number;
  remaining: number;
}

type ParsedSpecEntry = {
  label: string;
  value: string;
};

const formatMonthDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const parseSpecEntries = (specifications: string | null): ParsedSpecEntry[] => {
  if (!specifications) return [];

  try {
    const parsed = JSON.parse(specifications);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => ({
          label: String(entry?.label ?? "").trim(),
          value: String(entry?.value ?? "").trim(),
        }))
        .filter((entry) => entry.label || entry.value);
    }
  } catch {
    if (specifications.trim()) {
      return [{ label: specifications.trim(), value: "" }];
    }
  }

  return [];
};

const statusColorClass: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-300",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function MyOffice() {
  const [records, setRecords] = useState<AccountDetailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBudgetRecord, setSelectedBudgetRecord] =
    useState<AccountDetailRecord | null>(null);
  const [isPrListOpen, setIsPrListOpen] = useState(false);
  const [prListLoading, setPrListLoading] = useState(false);
  const [prListError, setPrListError] = useState<string | null>(null);
  const [prList, setPrList] = useState<PurchaseRequest[]>([]);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);
  const [isPrFormOpen, setIsPrFormOpen] = useState(false);
  const [prFormLoading, setPrFormLoading] = useState(false);
  const [prFormError, setPrFormError] = useState<string | null>(null);
  const [prLines, setPrLines] = useState<PurchaseRequestLine[]>([]);
  const [prSectionLabel, setPrSectionLabel] = useState("");

  const mapRowToRecord = (
    row: BudgetAccountDetailRow,
    optionLookup: Map<string, BudgetMajorAccountGroupOption>,
  ): AccountDetailRecord => {
    const option = optionLookup.get(row.mag_id);

    return {
      id: row.id,
      majorAccountGroupId: row.mag_id,
      majorAccountGroup: option?.label ?? `Unknown Major Account Group (${row.mag_id})`,
      year: Number(row.year),
      description: row.description,
      fromDate: row.from_date,
      toDate: row.to_date,
      budget: Number(row.budget),
      remaining: Number(row.remaining),
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [rows, options] = await Promise.all([
        fetchBudgetAccountDetails(),
        fetchBudgetGlAccountOptions(),
      ]);

      const optionLookup = new Map(options.map((item) => [item.id, item]));
      setRecords(rows.map((row) => mapRowToRecord(row, optionLookup)));
    } catch (error) {
      setLoadError(
        toErrorMessage(error, "Failed to load my office account entries."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return records;

    return records.filter((item) => {
      return (
        item.majorAccountGroup.toLowerCase().includes(query) ||
        String(item.year).includes(query)
      );
    });
  }, [records, searchQuery]);

  const openBudgetaryPrList = async (record: AccountDetailRecord) => {
    setSelectedBudgetRecord(record);
    setIsPrListOpen(true);
    setPrListLoading(true);
    setPrListError(null);

    try {
      const allPrs = await fetchPurchaseRequests();
      const filtered = allPrs.filter((pr) => pr.rc_id === record.majorAccountGroupId);
      setPrList(filtered);
    } catch (error) {
      setPrListError(
        toErrorMessage(
          error,
          "Failed to load purchase requests for this budget entry.",
        ),
      );
      setPrList([]);
    } finally {
      setPrListLoading(false);
    }
  };

  const closePrListModal = () => {
    setIsPrListOpen(false);
    setPrList([]);
    setPrListError(null);
    setSelectedBudgetRecord(null);
  };

  const openPrForm = async (pr: PurchaseRequest) => {
    setSelectedPr(pr);
    setIsPrFormOpen(true);
    setPrFormLoading(true);
    setPrFormError(null);
    setPrLines([]);
    setPrSectionLabel("");

    try {
      const [lines, sections] = await Promise.all([
        fetchPRLines(pr.pr_id),
        pr.rc_id ? fetchSections(pr.rc_id) : Promise.resolve([]),
      ]);
      setPrLines(lines);
      if (pr.rcs_id) {
        const section = sections.find((row) => row.id === pr.rcs_id);
        setPrSectionLabel(section?.description ?? "");
      }
    } catch (error) {
      setPrFormError(
        toErrorMessage(error, "Failed to load purchase request form details."),
      );
    } finally {
      setPrFormLoading(false);
    }
  };

  const closePrFormModal = () => {
    setIsPrFormOpen(false);
    setSelectedPr(null);
    setPrFormError(null);
    setPrLines([]);
    setPrSectionLabel("");
  };

  const prComputedTotal = useMemo(
    () =>
      prLines.reduce((sum, row) => {
        const qty = Number(row.qty) || 0;
        const price = Number(row.unit_price_estimated) || 0;
        return sum + qty * price;
      }, 0),
    [prLines],
  );

  const resolvedPrTotal =
    selectedPr && Number(selectedPr.pr_total_amount) > 0
      ? Number(selectedPr.pr_total_amount)
      : prComputedTotal;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="My Office Work Financial Plan"
        subtitle="Budget allocations for responsibility centers"
        icon={<BookOpen className="w-6 h-6" />}
      />

      {loadError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success"
          />
        </div>

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
								<th className="bg-background text-muted font-semibold text-center px-4 py-3 border-b border-border text-xs uppercase tracking-wider w-[100px]">
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
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
                <BudgetLoadingRow colSpan={7} message="Loading account entries..." />
							) : filteredData.length === 0 ? (
								<BudgetEmptyRow
                  colSpan={7}
									content={<span className="text-sm text-muted">No account entries found.</span>}
								/>
							) : (
								filteredData.map((item) => (
									<tr key={item.id} className="hover:bg-background transition-colors">
										<td className="px-4 py-3.5 border-b border-border/50 text-foreground">{item.majorAccountGroup}</td>
                    <td className="px-4 py-3.5 border-b border-border/50 text-foreground">{item.description}</td>
										<td className="px-4 py-3.5 border-b border-border/50 text-center text-foreground">{item.year}</td>
										<td className="px-4 py-3.5 border-b border-border/50 text-center text-foreground">
                      {formatMonthDay(item.fromDate)}
										</td>
										<td className="px-4 py-3.5 border-b border-border/50 text-center text-foreground">
                      {formatMonthDay(item.toDate)}
										</td>
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
