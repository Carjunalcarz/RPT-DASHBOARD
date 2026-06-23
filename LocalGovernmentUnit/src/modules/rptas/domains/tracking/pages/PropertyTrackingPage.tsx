import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import useSWR from "swr";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { DataTablePagination } from "@/modules/rptas/ui/data-table-pagination";
import { listFaasRecords, getFaasRecord } from "@/modules/rptas/shared/services/faasService";
import { listAuditLogs, type AuditLog } from "@/modules/rptas/shared/services/auditService";

type StatusKey =
  | "draft"
  | "for-review"
  | "pending-municipal"
  | "pending-provincial"
  | "approved"
  | "rejected"
  | "rejected-municipal"
  | "rejected-provincial";

type SearchFieldKey = "TDN" | "ANY";

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "for-review", label: "For Review" },
  { value: "pending-municipal", label: "Pending Municipal" },
  { value: "pending-provincial", label: "Pending Provincial" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "rejected-municipal", label: "Rejected (Municipal)" },
  { value: "rejected-provincial", label: "Rejected (Provincial)" },
];

const trackedStatuses: StatusKey[] = [
  "draft",
  "for-review",
  "pending-municipal",
  "pending-provincial",
  "approved",
  "rejected",
  "rejected-municipal",
  "rejected-provincial",
];

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeStatus = (value?: string | null): StatusKey => {
  const v = String(value || "").trim().toLowerCase();
  if (
    v === "draft" ||
    v === "for-review" ||
    v === "pending-municipal" ||
    v === "pending-provincial" ||
    v === "approved" ||
    v === "rejected" ||
    v === "rejected-municipal" ||
    v === "rejected-provincial"
  ) {
    return v;
  }
  return "draft";
};

const statusLabel = (status: StatusKey) => {
  switch (status) {
    case "draft":
      return "Draft";
    case "for-review":
      return "For Review";
    case "pending-municipal":
      return "Pending Municipal";
    case "pending-provincial":
      return "Pending Provincial";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "rejected-municipal":
      return "Rejected (Municipal)";
    case "rejected-provincial":
      return "Rejected (Provincial)";
    default:
      return status;
  }
};

const statusBadgeClass = (status: StatusKey) => {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800/40";
    case "pending-municipal":
    case "pending-provincial":
    case "for-review":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800/40";
    case "rejected":
    case "rejected-municipal":
    case "rejected-provincial":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800/40";
    case "draft":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-200 dark:border-slate-800/40";
  }
};

const getRecordText = (rec: any) => {
  const data = rec?.data || {};
  const tdn = rec?.tdn || data?.tdn || data?.TDN || "";
  const pin = data?.pin || data?.PIN || "";
  const owner =
    data?.owner ||
    data?.owner_name ||
    data?.OWNER_NAME ||
    data?.OWNER ||
    data?.declaredOwner ||
    data?.DECLARED_OWNER ||
    "";
  const barangay = data?.barangay || data?.BRGY || data?.BARANGAY || "";
  return { tdn: String(tdn || ""), pin: String(pin || ""), owner: String(owner || ""), barangay: String(barangay || "") };
};

const buildLifecycle = (record: any, auditLogs: AuditLog[]) => {
  const status = normalizeStatus(record?.status);
  const createdAt = record?.createdAt || record?.created_at || null;
  const updatedAt = record?.updatedAt || record?.updated_at || null;

  const statusLogs = (auditLogs || [])
    .filter((l) => String(l.action || "").toUpperCase() === "UPDATE_STATUS")
    .slice()
    .sort((a, b) => new Date(String(a.timestamp)).getTime() - new Date(String(b.timestamp)).getTime());

  const firstStatusTime = (target: StatusKey) => {
    const hit = statusLogs.find((l) => normalizeStatus(l.details?.status) === target);
    return hit?.timestamp || null;
  };

  const submittedAt = firstStatusTime("for-review") || firstStatusTime("pending-municipal");
  const municipalAt = firstStatusTime("pending-provincial") || record?.data?.municipal_approval_date || null;
  const provincialAt = firstStatusTime("approved") || record?.data?.provincial_approval_date || null;
  const rejectedAt =
    firstStatusTime("rejected") || firstStatusTime("rejected-municipal") || firstStatusTime("rejected-provincial") || null;

  const steps: Array<{
    key: string;
    title: string;
    description: string;
    at: string | null;
    state: "completed" | "current" | "pending";
    icon: React.ReactNode;
  }> = [];

  const rejected = status.includes("rejected");
  const stageOrder: StatusKey[] = rejected
    ? ["draft", "for-review", "pending-municipal", "pending-provincial", normalizeStatus(status)]
    : ["draft", "for-review", "pending-municipal", "pending-provincial", "approved"];

  const currentIndex = (() => {
    const idx = stageOrder.indexOf(status);
    if (idx >= 0) return idx;
    if (status === "for-review") return 1;
    return 0;
  })();

  const push = (i: number, key: string, title: string, description: string, at: string | null) => {
    const state: "completed" | "current" | "pending" = i < currentIndex ? "completed" : i === currentIndex ? "current" : "pending";
    const icon =
      state === "completed" ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      ) : state === "current" ? (
        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      ) : (
        <Clock className="h-5 w-5 text-slate-400" />
      );
    steps.push({ key, title, description, at, state, icon });
  };

  push(
    0,
    "draft",
    "Data Entry",
    "Draft created and saved for this property record.",
    createdAt,
  );
  push(
    1,
    "submitted",
    "Submitted",
    "Record submitted for initial review.",
    submittedAt,
  );
  push(
    2,
    "municipal",
    "Municipal Review",
    "Municipal assessor review and verification.",
    firstStatusTime("pending-municipal"),
  );
  push(
    3,
    "provincial",
    "Provincial Review",
    "Provincial assessor review pending.",
    municipalAt,
  );

  if (rejected) {
    const rejectIcon = <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
    steps.push({
      key: "rejected",
      title: "Rejected",
      description: "Record was rejected. Check remarks for details.",
      at: rejectedAt || updatedAt,
      state: "current",
      icon: rejectIcon,
    });
  } else {
    push(
      4,
      "approved",
      "Final Approval",
      "Record fully approved and finalized.",
      provincialAt,
    );
  }

  return { status, updatedAt, steps, statusLogs, currentIndex };
};

const downloadCsv = (rows: Array<Record<string, any>>, filename: string) => {
  const safe = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = Array.from(
    rows.reduce((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>()),
  );
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => safe(r[h])).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const PropertyTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedId = searchParams.get("id") || "";

  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchField, setSearchField] = useState<SearchFieldKey>("TDN");
  const [searchValue, setSearchValue] = useState("");

  const listParams = useMemo(() => {
    const filterValue = searchValue.trim();
    const base: any = {
      page: pagination.page,
      limit: pagination.limit,
    };
    if (statusFilter) base.status = statusFilter;
    if (filterValue) {
      base.searchField = searchField === "TDN" ? "TDN" : "OWNER";
      base.filterValue = filterValue;
    }
    return base;
  }, [pagination.page, pagination.limit, searchField, searchValue, statusFilter]);

  const { data: listResp, isLoading: isListLoading, error: listError, mutate: mutateList } = useSWR(
    ["faas-tracking-list", listParams],
    ([, params]) => listFaasRecords(params),
    { keepPreviousData: true, revalidateOnFocus: true, refreshInterval: 15000 },
  );

  const listSuccess = listResp ? listResp.success !== false : true;
  const records = useMemo(() => (listResp?.data || []) as any[], [listResp?.data]);
  const paginationMeta = useMemo(() => listResp?.pagination, [listResp?.pagination]);

  useEffect(() => {
    if (!paginationMeta) return;
    setPagination((prev) => ({
      ...prev,
      totalPages: Number(paginationMeta.totalPages || prev.totalPages || 1),
    }));
  }, [paginationMeta]);

  const { data: statusCounts } = useSWR(
    ["faas-tracking-counts"],
    async () => {
      const pairs = await Promise.all(
        trackedStatuses.map(async (s) => {
          const resp = await listFaasRecords({ status: s, page: 1, limit: 1 });
          const total = Number(resp?.pagination?.total || 0);
          return [s, total] as const;
        }),
      );
      return Object.fromEntries(pairs) as Record<StatusKey, number>;
    },
    { revalidateOnFocus: false, refreshInterval: 30000 },
  );

  const { data: selectedRecord, error: recordError, isLoading: isRecordLoading } = useSWR(
    selectedId ? ["faas-record", selectedId] : null,
    ([, id]) => getFaasRecord(id),
    { revalidateOnFocus: true, refreshInterval: 10000 },
  );

  const { data: auditResp, error: auditError } = useSWR(
    selectedId ? ["faas-audit", selectedId] : null,
    ([, id]) =>
      listAuditLogs({
        source: "supabase",
        tableName: "faas_records",
        recordId: id,
        page: 1,
        limit: 100,
      }),
    { revalidateOnFocus: true, refreshInterval: 15000 },
  );

  const auditLogs = useMemo(() => (auditResp?.data || []) as AuditLog[], [auditResp?.data]);

  const lifecycle = useMemo(() => buildLifecycle(selectedRecord, auditLogs), [selectedRecord, auditLogs]);

  const lastStatusRef = useRef<string>("");
  useEffect(() => {
    if (!selectedRecord) return;
    const current = String((selectedRecord as any).status || "");
    if (!lastStatusRef.current) {
      lastStatusRef.current = current;
      return;
    }
    if (current && current !== lastStatusRef.current) {
      toast.success(`Status updated: ${statusLabel(normalizeStatus(current))}`);
      lastStatusRef.current = current;
    }
  }, [selectedRecord]);

  useEffect(() => {
    if (listError) toast.error("Failed to load tracking list.");
  }, [listError]);

  useEffect(() => {
    if (listResp && listResp.success === false) toast.error("Failed to load tracking list.");
  }, [listResp]);

  useEffect(() => {
    if (recordError) toast.error("Failed to load property status.");
  }, [recordError]);

  useEffect(() => {
    if (auditError) toast.error("Failed to load status events.");
  }, [auditError]);

  const handleSelect = (id: string) => {
    const next = new URLSearchParams(location.search);
    next.set("id", id);
    navigate(`${location.pathname}?${next.toString()}`);
  };

  const handleClearSelection = () => {
    const next = new URLSearchParams(location.search);
    next.delete("id");
    navigate(`${location.pathname}${next.toString() ? `?${next.toString()}` : ""}`);
  };

  const handleExport = () => {
    const rows = records.map((r) => {
      const text = getRecordText(r);
      return {
        id: r.id,
        tdn: text.tdn,
        pin: text.pin,
        owner: text.owner,
        barangay: text.barangay,
        status: statusLabel(normalizeStatus(r.status)),
        updatedAt: formatDateTime(r.updatedAt || r.updated_at),
      };
    });
    downloadCsv(rows, `property_tracking_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Report downloaded.");
  };

  const selectedText = useMemo(() => getRecordText(selectedRecord), [selectedRecord]);

  return (
    <div className="h-full flex flex-col bg-background dark:bg-surface">
      <div className="bg-surface dark:bg-background border-b border-border dark:border-border px-6 py-4 shadow-sm z-10 border-t-4 border-t-primary">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="text-primary" />
              <div className="text-lg font-bold text-foreground dark:text-white">Property Tracking</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => mutateList()}
                className="px-3 py-2 bg-surface dark:bg-muted/20 border border-border dark:border-border text-foreground dark:text-foreground rounded-lg hover:bg-muted/5 dark:hover:bg-muted/30 transition-colors flex items-center gap-2 shadow-sm font-medium text-sm"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-2 bg-primary hover:bg-primary-light text-white dark:text-white rounded-lg transition-colors flex items-center gap-2 shadow-md font-medium text-sm"
              >
                <Download size={16} />
                Download Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs text-muted dark:text-muted mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setPagination((p) => ({ ...p, page: 1 }));
                  setStatusFilter(e.target.value);
                }}
                className="w-full h-9 text-sm bg-surface dark:bg-background border border-border dark:border-border rounded-md px-3"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-muted dark:text-muted mb-1">Search Field</label>
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as SearchFieldKey)}
                className="w-full h-9 text-sm bg-surface dark:bg-background border border-border dark:border-border rounded-md px-3"
              >
                <option value="TDN">TDN</option>
                <option value="ANY">Any</option>
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs text-muted dark:text-muted mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted dark:text-muted" />
                <input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  placeholder={searchField === "TDN" ? "e.g. 22-" : "Owner / PIN / Barangay"}
                  className="w-full h-9 text-sm bg-surface dark:bg-background border border-border dark:border-border rounded-md pl-10 pr-3"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-muted dark:text-muted mb-1">Counts</label>
              <div className="h-9 flex items-center gap-2 text-xs text-muted dark:text-muted bg-muted/10 dark:bg-muted/20 border border-border dark:border-border rounded-md px-3 overflow-x-auto">
                {trackedStatuses.slice(0, 5).map((s) => (
                  <span key={s} className="whitespace-nowrap">
                    {statusLabel(s)}: <span className="text-foreground dark:text-white font-semibold">{statusCounts?.[s] ?? "-"}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        <div className="lg:col-span-5 xl:col-span-4 bg-surface dark:bg-background border border-border dark:border-border rounded-lg overflow-hidden flex flex-col min-h-[320px]">
          <div className="px-4 py-3 border-b border-border dark:border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground dark:text-white">Properties</div>
            <div className="text-xs text-muted dark:text-muted">
              {paginationMeta?.total ? `${paginationMeta.total} total` : ""}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {isListLoading ? (
              <div className="p-6 text-sm text-muted dark:text-muted flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : !listSuccess ? (
              <div className="p-6 text-sm text-muted dark:text-muted flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Failed to load records.
              </div>
            ) : records.length === 0 ? (
              <div className="p-6 text-sm text-muted dark:text-muted">No records found.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-primary text-surface">
                  <tr className="bg-primary text-surface">
                    <th className="px-3 py-2 text-left font-medium">TDN</th>
                    <th className="px-3 py-2 text-left font-medium">Owner</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {records.map((r, index) => {
                    const text = getRecordText(r);
                    const isSelected = selectedId && String(r.id) === String(selectedId);
                    const rowBg = isSelected ? "bg-emerald-50 dark:bg-emerald-900/20" : index % 2 === 0 ? "bg-surface dark:bg-surface" : "bg-background/40 dark:bg-background/20";
                    const hoverBg = !isSelected ? "hover:bg-muted/10 dark:hover:bg-muted/20" : "";
                    const indicator = isSelected ? "border-emerald-500 dark:border-emerald-400" : "border-transparent";
                    const s = normalizeStatus(r.status);
                    return (
                      <tr
                        key={String(r.id)}
                        className={`cursor-pointer transition-colors ${rowBg} ${hoverBg}`}
                        onClick={() => handleSelect(String(r.id))}
                      >
                        <td className={`px-3 py-2 border-l-4 ${indicator}`}>
                          <div className="font-mono text-[11px] text-foreground dark:text-white truncate">
                            {text.tdn || "—"}
                          </div>
                          <div className="text-[10px] text-muted dark:text-muted truncate">{formatDateTime(r.updatedAt || r.updated_at)}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-[11px] text-foreground dark:text-white truncate">{text.owner || "—"}</div>
                          <div className="text-[10px] text-muted dark:text-muted truncate">{text.barangay || ""}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadgeClass(s)}`}>
                            {statusLabel(s)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-border dark:border-border">
            <DataTablePagination
              pageIndex={pagination.page}
              pageSize={pagination.limit}
              totalCount={Number(paginationMeta?.total || 0)}
              totalPages={Number(paginationMeta?.totalPages || pagination.totalPages || 1)}
              setPageIndex={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              setPageSize={(s) => setPagination((prev) => ({ ...prev, page: 1, limit: s }))}
              isLoading={isListLoading}
            />
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 bg-surface dark:bg-background border border-border dark:border-border rounded-lg overflow-hidden flex flex-col min-h-[320px]">
          <div className="px-4 py-3 border-b border-border dark:border-border flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground dark:text-white">Lifecycle</div>
            <div className="flex items-center gap-2">
              {selectedId ? (
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-2 bg-surface dark:bg-muted/20 border border-border dark:border-border text-foreground dark:text-foreground rounded-lg hover:bg-muted/5 dark:hover:bg-muted/30 transition-colors shadow-sm font-medium text-sm"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-sm text-muted dark:text-muted">Select a property to view its tracking timeline.</div>
            </div>
          ) : isRecordLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted dark:text-muted">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading property status...
              </div>
            </div>
          ) : !selectedRecord ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted dark:text-muted">
                <AlertCircle className="h-4 w-4" />
                Property not found.
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="rounded-lg border border-border dark:border-border bg-background dark:bg-background/30 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted dark:text-muted">TDN</div>
                    <div className="font-mono text-sm text-foreground dark:text-white">{selectedText.tdn || "—"}</div>
                    <div className="text-xs text-muted dark:text-muted">Owner</div>
                    <div className="text-sm text-foreground dark:text-white truncate">{selectedText.owner || "—"}</div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${statusBadgeClass(lifecycle.status)}`}>
                      {statusLabel(lifecycle.status)}
                    </span>
                    <div className="text-xs text-muted dark:text-muted">Last update: {formatDateTime(lifecycle.updatedAt)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border dark:border-border bg-background dark:bg-background/30 p-4">
                <div className="text-sm font-semibold text-foreground dark:text-white mb-3">Step-by-step progress</div>
                <ol className="relative">
                  {lifecycle.steps.map((step, idx) => {
                    const isCompletedSegment = idx < lifecycle.currentIndex;
                    const segmentClass = isCompletedSegment
                      ? "bg-emerald-600 dark:bg-emerald-400 w-[3px]"
                      : "bg-slate-200 dark:bg-slate-700 w-px";

                    return (
                      <li key={step.key} className="relative pl-12 pb-6 last:pb-0">
                        <span className="absolute left-0 top-0 h-9 w-9 rounded-full bg-surface dark:bg-muted/20 border border-border dark:border-border flex items-center justify-center">
                          {step.icon}
                        </span>
                        {idx < lifecycle.steps.length - 1 ? (
                          <span
                            aria-hidden="true"
                            className={`absolute left-[18px] top-9 -bottom-6 rounded-full transition-all duration-200 ease-in-out motion-reduce:transition-none ${segmentClass}`}
                          />
                        ) : null}
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-foreground dark:text-white">{step.title}</div>
                          <div className="text-xs text-muted dark:text-muted">{formatDateTime(step.at)}</div>
                        </div>
                        <div className="text-xs text-muted dark:text-muted mt-1">{step.description}</div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="rounded-lg border border-border dark:border-border bg-background dark:bg-background/30 p-4">
                <div className="text-sm font-semibold text-foreground dark:text-white mb-3">Status events</div>
                {lifecycle.statusLogs.length === 0 ? (
                  <div className="text-sm text-muted dark:text-muted">No status events recorded yet.</div>
                ) : (
                  <div className="space-y-3">
                    {lifecycle.statusLogs
                      .slice()
                      .reverse()
                      .map((log) => {
                        const s = normalizeStatus(log.details?.status);
                        const stage = String(log.details?.stage || "");
                        const remarks = String(log.details?.remarks || "");
                        return (
                          <div key={String(log.id)} className="flex gap-3">
                            <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-foreground dark:text-white">
                                  {stage ? stage : statusLabel(s)}{" "}
                                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadgeClass(s)}`}>
                                    {statusLabel(s)}
                                  </span>
                                </div>
                                <div className="text-xs text-muted dark:text-muted">{formatDateTime(log.timestamp)}</div>
                              </div>
                              <div className="text-xs text-muted dark:text-muted mt-1">
                                {log.userEmail ? `By ${log.userEmail}` : log.userId ? `By ${log.userId}` : "By system"}
                              </div>
                              {remarks ? <div className="text-xs text-foreground dark:text-white mt-1">Remarks: {remarks}</div> : null}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyTrackingPage;
