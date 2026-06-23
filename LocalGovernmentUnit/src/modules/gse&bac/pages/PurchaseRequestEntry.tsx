import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  StatsRow,
  StatCard,
  ActionsBar,
  PrimaryButton,
  DataTable,
  Tabs,
  IconButton,
} from "@/components/ui";
import {
  FileText,
  Plus,
  RefreshCw,
  Download,
  Pencil,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  History,
  Eye,
  Settings,
} from "lucide-react";
import type {
  PurchaseRequest,
  PurchaseRequestFormData,
  ResponsibilityCenterSection,
  Item,
  Unit,
  Spec,
} from "@/types/gse.types";
import {
  fetchPurchaseRequests,
  createPurchaseRequest,
  updatePurchaseRequest,
  deletePurchaseRequest,
  fetchPRLines,
  addPRLine,
  updatePRLine,
  deletePRLine,
  fetchPRBudgetGlAccountOptions,
  fetchSections,
  generateNextPRNumber,
  getOrCreateItem,
  getOrCreateUnit,
  getOrCreateSpec,
  fetchItems,
  fetchUnits,
  fetchSpecs,
  fetchItemSpecHistory,
  fetchItemSpecs,
  fetchSpecValueHistory,
  fetchAllCatalogSpecValues,
  fetchPreviousPRLinesByItem,
  upsertBudgetPendingDetailFromPR,
} from "@/services/gseService";
import { fetchPRsWithRemainingBudget } from "@/services/bacService";
import { DocumentHeader, DocumentFooter, DocumentSettingsDialog } from "../components";
import {
  loadDocumentSettings,
  type DocumentSettings,
} from "../services/documentSettingsService";
import type {
  ItemSpecDefault,
  PreviousPRLine,
  PRBudgetGlAccountOption,
} from "@/services/gseService";

type ViewMode = "list" | "form";

type SpecEntry = {
  id: string;
  s_id?: string; // links to specs.s_id when selected from catalog
  label: string;
  value: string;
};

type DraftRow = {
  localId: string;
  prl_id?: string;
  i_id: string;
  u_id: string;
  qty: string;
  unitPrice: string;
  specEntries: SpecEntry[];
  item_description: string;
  unit_code: string;
};

const newSpecEntry = (label = "", value = ""): SpecEntry => ({
  id: Math.random().toString(36).slice(2),
  label,
  value,
});

const emptyRow = (): DraftRow => ({
  localId: Math.random().toString(36).slice(2),
  i_id: "",
  u_id: "",
  qty: "",
  unitPrice: "",
  specEntries: [],
  item_description: "",
  unit_code: "",
});

const parseSpecEntries = (specifications: string | null): SpecEntry[] => {
  if (!specifications) return [];
  try {
    const parsed = JSON.parse(specifications);
    if (Array.isArray(parsed)) {
      return parsed.map((e: any) => ({
        id: Math.random().toString(36).slice(2),
        label: String(e.label ?? ""),
        value: String(e.value ?? ""),
      }));
    }
  } catch {
    // Legacy plain text — wrap as a single label entry
    if (specifications.trim()) {
      return [
        {
          id: Math.random().toString(36).slice(2),
          label: specifications.trim(),
          value: "",
        },
      ];
    }
  }
  return [];
};

const serializeSpecEntries = (entries: SpecEntry[]): string => {
  const cleaned = entries.filter((e) => e.label.trim() || e.value.trim());
  if (cleaned.length === 0) return "";
  return JSON.stringify(
    cleaned.map((e) => ({ label: e.label, value: e.value })),
  );
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/10 text-gray-500",
  SUBMITTED: "bg-blue-500/10 text-blue-500",
  APPROVED: "bg-green-500/10 text-green-500",
  REJECTED: "bg-red-500/10 text-red-500",
  CANCELLED: "bg-orange-500/10 text-orange-500",
};

const peso = (n: number) =>
  n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

const PurchaseRequestEntry = () => {
  const [mode, setMode] = useState<ViewMode>("list");

  // ─── List state ─────────────────────────────────────────
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [listLoading, setListLoading] = useState(false);

  // ─── Document settings state ───────────────────────────
  const [documentSettings, setDocumentSettings] = useState<DocumentSettings>(
    loadDocumentSettings
  );
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // ─── Form header state ─────────────────────────────────
  const [editingPR, setEditingPR] = useState<PurchaseRequest | null>(null);
  const [prNo, setPrNo] = useState("");
  const [prDate, setPrDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [rcId, setRcId] = useState("");
  const [rcsId, setRcsId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ─── Inline draft rows ──────────────────────────────────
  const [draftRows, setDraftRows] = useState<DraftRow[]>([emptyRow()]);
  const [removedPrlIds, setRemovedPrlIds] = useState<string[]>([]);

  // ─── Lookups ────────────────────────────────────────────
  const [budgetGlOptions, setBudgetGlOptions] = useState<
    PRBudgetGlAccountOption[]
  >([]);
  const [sections, setSections] = useState<ResponsibilityCenterSection[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [allSpecs, setAllSpecs] = useState<Spec[]>([]);

  // ─── Item spec history (description → most-recent specs JSON) ──
  const [itemSpecHistory, setItemSpecHistory] = useState<
    Record<string, string | null>
  >({});
  // Catalog specs per item i_id → [{s_id, s_description, spec_value}]
  const [itemDefaultSpecs, setItemDefaultSpecs] = useState<
    Record<string, ItemSpecDefault[]>
  >({});
  // Which row's item suggestion dropdown is open
  const [suggestionRowId, setSuggestionRowId] = useState<string | null>(null);
  // Which spec entry's label suggestion is open ("rowLocalId:entryId")
  const [specSuggestionKey, setSpecSuggestionKey] = useState<string | null>(
    null,
  );
  // spec label → all previously used values (from past PR lines)
  const [
    , setSpecValueHistory] = useState<
    Record<string, string[]>
  >({});
  // spec label → all catalog values across all items (from item_spec table)
  const [catalogSpecValues, setCatalogSpecValues] = useState<
    Record<string, string[]>
  >({});
  // Which spec entry's value dropdown is open ("rowLocalId:entryId")
  const [specValueKey, setSpecValueKey] = useState<string | null>(null);
  // Previous PR lines cache: i_id → PreviousPRLine[]
  const [prevPRLines, setPrevPRLines] = useState<
    Record<string, PreviousPRLine[]>
  >({});
  // Which row's "previous requests" bar is visible
  const [showPrevReqRowId, setShowPrevReqRowId] = useState<string | null>(null);
  // Which row's "previous requests" dropdown is open
  const [prevSpecsRowId, setPrevSpecsRowId] = useState<string | null>(null);
  // Loading state for previous PR lines
  const [loadingPrevLines, setLoadingPrevLines] = useState(false);
  // Which rows have specs section visible (tracks multiple rows)
  const [showSpecsRowIds, setShowSpecsRowIds] = useState<Set<string>>(
    new Set(),
  );
  // Which row's spec selection dropdown is open
  const [specSelectRowId, setSpecSelectRowId] = useState<string | null>(null);

  // ─── PRs with remaining budget ─────────────────────────
  type PRWithBudget = PurchaseRequest & {
    consumed_amount: number;
    remaining_budget: number;
  };
  const [prsWithBudget, setPrsWithBudget] = useState<PRWithBudget[]>([]);
  const [selectedParentPrId, setSelectedParentPrId] = useState<string>("");
  const [useExistingBudget, setUseExistingBudget] = useState(false);

  const resolveRcSelectionForUi = useCallback(
    (value: string) => {
      if (!value) return "";
      if (budgetGlOptions.some((opt) => opt.rc_gla_id === value)) return value;

      const byRc = budgetGlOptions.filter((opt) => opt.rc_id === value);
      if (byRc.length === 0) return value;

      // Prefer the account with highest remaining budget when legacy rows only store rc_id.
      return [...byRc].sort((a, b) => b.total_remaining - a.total_remaining)[0]
        .rc_gla_id;
    },
    [budgetGlOptions],
  );

  // ───────────────────────────────────────────────────────
  // DATA LOADING
  // ───────────────────────────────────────────────────────

  const loadPRs = useCallback(async () => {
    setListLoading(true);
    const [data, glOptions] = await Promise.all([
      fetchPurchaseRequests(),
      fetchPRBudgetGlAccountOptions(),
    ]);
    setPrs(data);
    setBudgetGlOptions(glOptions);
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadPRs();
  }, [loadPRs]);

  useEffect(() => {
    const sourceRcId =
      budgetGlOptions.find((opt) => opt.rc_gla_id === rcId)?.rc_id || rcId;

    if (!sourceRcId) {
      setSections([]);
      setRcsId("");
      return;
    }

    fetchSections(sourceRcId).then((loadedSections) => {
      setSections(loadedSections);
      setRcsId((prev) =>
        prev && loadedSections.some((section) => section.id === prev)
          ? prev
          : "",
      );
    });
  }, [rcId, budgetGlOptions]);

  // ───────────────────────────────────────────────────────
  // FORM OPEN / CLOSE
  // ───────────────────────────────────────────────────────

  const openForm = async (pr?: PurchaseRequest) => {
    // Load all lookups in parallel
    const [
      glOptions,
      items,
      units,
      specs,
      specHistory,
      specValHistory,
      catalogSpecVals,
    ] = await Promise.all([
      fetchPRBudgetGlAccountOptions(),
      fetchItems(),
      fetchUnits(),
      fetchSpecs(),
      fetchItemSpecHistory(),
      fetchSpecValueHistory(),
      fetchAllCatalogSpecValues(),
    ]);
    setBudgetGlOptions(glOptions);
    setAllItems(items);
    setAllUnits(units);
    setAllSpecs(specs);
    setItemSpecHistory(specHistory);
    setSpecValueHistory(specValHistory);
    setCatalogSpecValues(catalogSpecVals);

    if (pr) {
      const resolvedUiRc = resolveRcSelectionForUi(pr.rc_id);
      setEditingPR(pr);
      setPrNo(pr.pr_no || "");
      setPrDate(pr.pr_date);
      setRcId(resolvedUiRc);
      setRcsId(pr.rcs_id || "");
      setPurpose(pr.purpose);
      setRemarks(pr.remarks || "");
      setRequestedBy(pr.requested_by || "");
      const loadedLines = await fetchPRLines(pr.pr_id);
      const rows: DraftRow[] = loadedLines.map((l) => ({
        localId: l.prl_id,
        prl_id: l.prl_id,
        i_id: l.i_id,
        u_id: l.u_id,
        qty: String(l.qty),
        unitPrice: String(l.unit_price_estimated),
        specEntries: parseSpecEntries(l.specifications ?? null),
        item_description: l.item_description || "",
        unit_code: l.unit_code || "",
      }));
      setDraftRows(rows.length > 0 ? rows : [emptyRow()]);
      // Pre-load catalog specs for all items in this PR
      const uniqueIIds = [
        ...new Set(loadedLines.map((l) => l.i_id).filter(Boolean)),
      ];
      if (uniqueIIds.length > 0) {
        const results = await Promise.all(
          uniqueIIds.map((id) => fetchItemSpecs(id)),
        );
        setItemDefaultSpecs((prev) => {
          const next = { ...prev };
          uniqueIIds.forEach((id, i) => {
            next[id] = results[i];
          });
          return next;
        });
      }
    } else {
      setEditingPR(null);
      const nextPrNo = await generateNextPRNumber();
      setPrNo(nextPrNo);
      setPrDate(new Date().toISOString().slice(0, 10));
      setRcId("");
      setRcsId("");
      setSections([]);
      setPurpose("");
      setRemarks("");
      setRequestedBy("");
      setDraftRows([emptyRow()]);
      // Load PRs with remaining budget for selection
      const prsWithBudgetData = await fetchPRsWithRemainingBudget();
      setPrsWithBudget(prsWithBudgetData as PRWithBudget[]);
      setSelectedParentPrId("");
      setUseExistingBudget(false);
    }
    setRemovedPrlIds([]);
    setMode("form");
  };

  const closeForm = () => {
    setMode("list");
    setEditingPR(null);
    loadPRs();
  };

  // ───────────────────────────────────────────────────────
  // PR SAVE
  // ───────────────────────────────────────────────────────

  const handleSave = async (status?: string) => {
    if (!rcId || !purpose.trim()) {
      alert("Please fill in required fields (GL Account, Purpose)");
      return;
    }

    const selectedBudgetGl = budgetGlOptions.find((o) => o.rc_gla_id === rcId);
    const resolvedRcId = selectedBudgetGl?.rc_id || rcId;

    if (!resolvedRcId) {
      alert(
        "Selected GL account is no longer valid. Please choose another account.",
      );
      return;
    }

    // Validate budget when using existing PR budget
    if (useExistingBudget && selectedParentPrId) {
      const selectedPr = prsWithBudget.find(
        (p) => p.pr_id === selectedParentPrId,
      );
      if (selectedPr && total > selectedPr.remaining_budget) {
        alert(
          `Total amount (₱${peso(total)}) exceeds the remaining budget (₱${peso(selectedPr.remaining_budget)}) from the selected PR. Please reduce the quantity or unit price.`,
        );
        return;
      }
    }

    setIsSaving(true);
    const formData: PurchaseRequestFormData = {
      pr_no: prNo,
      pr_date: prDate,
      rc_id: resolvedRcId,
      rcs_id: rcsId,
      purpose: purpose.trim(),
      remarks: remarks.trim(),
      requested_by: requestedBy.trim(),
    };

    const validRows = draftRows.filter(
      (r) =>
        r.item_description.trim() &&
        r.unit_code.trim() &&
        r.qty &&
        parseFloat(r.qty) > 0,
    );

    // Ensure all new spec names are saved to the specs table
    const allSpecLabels = new Set<string>();
    for (const row of validRows) {
      for (const entry of row.specEntries) {
        if (entry.label.trim() && !entry.s_id) {
          allSpecLabels.add(entry.label.trim());
        }
      }
    }
    for (const label of allSpecLabels) {
      await getOrCreateSpec(label);
    }

    if (editingPR) {
      const payload = status ? { ...formData, status } : formData;
      const updateResult = await updatePurchaseRequest(
        editingPR.pr_id,
        payload,
      );
      if (!updateResult.success) {
        setIsSaving(false);
        alert(updateResult.error || "Failed to update PR");
        return;
      }
      // Delete removed rows
      for (const id of removedPrlIds) {
        await deletePRLine(id);
      }
      // Update existing / insert new rows
      for (const row of validRows) {
        const resolvedIId =
          row.i_id || (await getOrCreateItem(row.item_description));
        const resolvedUId = row.u_id || (await getOrCreateUnit(row.unit_code));
        if (!resolvedIId || !resolvedUId) continue;
        const qty = parseFloat(row.qty);
        const unitPrice = parseFloat(row.unitPrice) || 0;
        const lineData = {
          i_id: resolvedIId,
          u_id: resolvedUId,
          qty,
          unit_price_estimated: unitPrice,
          prl_total_amount_estimated: qty * unitPrice,
          specifications: serializeSpecEntries(row.specEntries),
        };
        if (row.prl_id) {
          await updatePRLine(row.prl_id, lineData);
        } else {
          await addPRLine(editingPR.pr_id, lineData);
        }
      }
      // Update pr_total_amount on header
      const editTotal = validRows.reduce((sum, r) => {
        return sum + (parseFloat(r.qty) || 0) * (parseFloat(r.unitPrice) || 0);
      }, 0);
      const updateHeaderResult = await updatePurchaseRequest(editingPR.pr_id, {
        pr_total_amount: editTotal,
        ...(status ? { status } : {}),
      });
      if (!updateHeaderResult.success) {
        setIsSaving(false);
        alert(updateHeaderResult.error || "Failed to update PR total/status");
        return;
      }

      const effectiveStatus = status || editingPR.status || "DRAFT";
      if (effectiveStatus === "SUBMITTED") {
        const pendingSync = await upsertBudgetPendingDetailFromPR(
          editingPR.pr_id,
        );
        if (!pendingSync.success) {
          console.error(
            "PR submitted, but failed to sync Budget Pending Details:",
            pendingSync.error,
          );
        }
      }
    } else {
      const result = await createPurchaseRequest(formData);
      if (!result.success || !result.pr_id) {
        setIsSaving(false);
        alert(result.error || "Failed to create PR");
        return;
      }
      for (const row of validRows) {
        const resolvedIId =
          row.i_id || (await getOrCreateItem(row.item_description));
        const resolvedUId = row.u_id || (await getOrCreateUnit(row.unit_code));
        if (!resolvedIId || !resolvedUId) continue;
        const qty = parseFloat(row.qty);
        const unitPrice = parseFloat(row.unitPrice) || 0;
        await addPRLine(result.pr_id, {
          i_id: resolvedIId,
          u_id: resolvedUId,
          qty,
          unit_price_estimated: unitPrice,
          prl_total_amount_estimated: qty * unitPrice,
          specifications: serializeSpecEntries(row.specEntries),
        });
      }
      // Update pr_total_amount on header
      const newTotal = validRows.reduce((sum, r) => {
        return sum + (parseFloat(r.qty) || 0) * (parseFloat(r.unitPrice) || 0);
      }, 0);

      const effectiveStatus = status || "DRAFT";
      const updateHeaderResult = await updatePurchaseRequest(result.pr_id, {
        pr_total_amount: newTotal,
        ...(effectiveStatus !== "DRAFT" ? { status: effectiveStatus } : {}),
      });
      if (!updateHeaderResult.success) {
        setIsSaving(false);
        alert(updateHeaderResult.error || "Failed to update PR total/status");
        return;
      }

      if (effectiveStatus === "SUBMITTED") {
        const pendingSync = await upsertBudgetPendingDetailFromPR(result.pr_id);
        if (!pendingSync.success) {
          console.error(
            "PR submitted, but failed to sync Budget Pending Details:",
            pendingSync.error,
          );
        }
      }
    }
    setIsSaving(false);
    closeForm();
  };

  // ───────────────────────────────────────────────────────
  // DELETE PR
  // ───────────────────────────────────────────────────────

  const handleDeletePR = async (pr: PurchaseRequest) => {
    if (!confirm(`Delete PR ${pr.pr_no || pr.pr_id}?`)) return;
    const result = await deletePurchaseRequest(pr.pr_id);
    if (result.success) loadPRs();
    else alert(result.error || "Failed to delete PR");
  };

  // ───────────────────────────────────────────────────────
  // LINE ITEM CRUD
  // ───────────────────────────────────────────────────────

  const updateDraftRow = (localId: string, changes: Partial<DraftRow>) => {
    setDraftRows((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, ...changes } : r)),
    );
  };

  const removeDraftRow = (row: DraftRow) => {
    if (row.prl_id) setRemovedPrlIds((prev) => [...prev, row.prl_id!]);
    setDraftRows((prev) => prev.filter((r) => r.localId !== row.localId));
  };

  const addEmptyRow = () => {
    setDraftRows((prev) => [...prev, emptyRow()]);
  };

  // ─── Spec entry CRUD ─────────────────────────────────────

  const addSpecEntryToRow = (rowLocalId: string) => {
    setDraftRows((prev) =>
      prev.map((r) =>
        r.localId === rowLocalId
          ? { ...r, specEntries: [...r.specEntries, newSpecEntry()] }
          : r,
      ),
    );
  };

  const updateSpecEntryInRow = (
    rowLocalId: string,
    entryId: string,
    changes: Partial<SpecEntry>,
  ) => {
    setDraftRows((prev) =>
      prev.map((r) =>
        r.localId === rowLocalId
          ? {
              ...r,
              specEntries: r.specEntries.map((e) =>
                e.id === entryId ? { ...e, ...changes } : e,
              ),
            }
          : r,
      ),
    );
  };

  const removeSpecEntryFromRow = (rowLocalId: string, entryId: string) => {
    setDraftRows((prev) =>
      prev.map((r) =>
        r.localId === rowLocalId
          ? { ...r, specEntries: r.specEntries.filter((e) => e.id !== entryId) }
          : r,
      ),
    );
  };

  // ───────────────────────────────────────────────────────
  // HELPERS
  // ───────────────────────────────────────────────────────

  const rcName = (id: string) => {
    const byRcGlaId = budgetGlOptions.find((o) => o.rc_gla_id === id);
    if (byRcGlaId) return byRcGlaId.label;

    const byRc = budgetGlOptions
      .filter((o) => o.rc_id === id)
      .sort((a, b) => b.total_remaining - a.total_remaining);
    if (byRc.length > 0) return byRc[0].label;

    return id;
  };

  const total = draftRows.reduce((s, r) => {
    const q = parseFloat(r.qty) || 0;
    const p = parseFloat(r.unitPrice) || 0;
    return s + q * p;
  }, 0);

  const filtered = prs.filter((pr) => {
    const q = search.toLowerCase();
    const matchSearch =
      (pr.pr_no || "").toLowerCase().includes(q) ||
      pr.purpose.toLowerCase().includes(q) ||
      rcName(pr.rc_id).toLowerCase().includes(q);
    if (activeTab === "all") return matchSearch;
    return matchSearch && pr.status === activeTab;
  });

  // ═══════════════════════════════════════════════════════
  //  RENDER — DOCUMENT-STYLE FORM VIEW
  // ═══════════════════════════════════════════════════════

  if (mode === "form") {
    const isReadOnly = !!(editingPR && editingPR.status !== "DRAFT");
    const cellBorder = "border border-gray-800";
    const cellPad = "px-3 py-2";
    const labelCls = "text-[10px] text-gray-500 font-medium uppercase";
    const inputCls =
      "block w-full text-xs bg-transparent border-0 border-b border-gray-300 py-0.5 focus:outline-none focus:border-gray-800";

    return (
      <div className="space-y-4 pb-10">
        {/* Top action bar */}
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={closeForm}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettingsDialog(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              title="Document Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {(!editingPR || editingPR.status === "DRAFT") && (
              <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingPR ? "Save Changes" : "Save as Draft"}
              </button>
            )}
            {editingPR && editingPR.status === "DRAFT" && (
              <button
                onClick={() => handleSave("SUBMITTED")}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
                Submit
              </button>
            )}
            {editingPR && editingPR.status !== "DRAFT" && (
              <span className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium border border-gray-300">
                Read-only — {editingPR.status}
              </span>
            )}
          </div>
        </div>

        {/* ── Use Existing Budget Option (only for new PRs) ─ */}
        {!editingPR && prsWithBudget.length > 0 && (
          <div className="max-w-7xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExistingBudget}
                  onChange={(e) => {
                    setUseExistingBudget(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedParentPrId("");
                    }
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-blue-800">
                  Use remaining budget from an existing approved PR
                </span>
              </label>
            </div>
            {useExistingBudget && (
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[300px]">
                  <label className="text-xs text-blue-700 font-medium block mb-1">
                    Select PR with Remaining Budget:
                  </label>
                  <select
                    className="w-full text-sm border border-blue-300 rounded px-3 py-2 bg-white"
                    value={selectedParentPrId}
                    onChange={(e) => {
                      const selPrId = e.target.value;
                      setSelectedParentPrId(selPrId);
                      // Pre-fill selected GL source from selected PR
                      const selPr = prsWithBudget.find(
                        (p) => p.pr_id === selPrId,
                      );
                      if (selPr) {
                        setRcId(resolveRcSelectionForUi(selPr.rc_id));
                        setRcsId(selPr.rcs_id || "");
                        // Also copy purpose as reference
                        setPurpose(selPr.purpose || "");
                      }
                    }}
                  >
                    <option value="">-- Select a PR --</option>
                    {prsWithBudget.map((pr) => {
                      const glLabel = rcName(pr.rc_id);
                      return (
                        <option key={pr.pr_id} value={pr.pr_id}>
                          {pr.pr_no} - {glLabel} | Remaining: ₱
                          {peso(pr.remaining_budget)}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {selectedParentPrId && (
                  <div className="bg-white border border-blue-300 rounded px-4 py-2">
                    {(() => {
                      const selPr = prsWithBudget.find(
                        (p) => p.pr_id === selectedParentPrId,
                      );
                      if (!selPr) return null;
                      return (
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-500">
                              Original Budget:
                            </span>
                            <span className="font-semibold">
                              ₱{peso(selPr.pr_total_amount || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-gray-500">Consumed:</span>
                            <span className="font-semibold text-orange-600">
                              ₱{peso(selPr.consumed_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-6 border-t pt-1">
                            <span className="text-gray-700 font-medium">
                              Remaining:
                            </span>
                            <span className="font-bold text-green-600">
                              ₱{peso(selPr.remaining_budget)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Paper document ─────────────────────────────── */}
        <div className="bg-white border-2 border-gray-800 max-w-7xl mx-auto shadow-lg print:shadow-none text-gray-900">
          {/* Document Header */}
          <DocumentHeader config={documentSettings.header} />

          {/* Title */}
          <div className="text-center border-b-2 border-gray-800 py-4 px-6">
            <h1 className="font-bold text-lg tracking-widest">
              PURCHASE REQUEST
            </h1>
          </div>

          {/* ── Meta fields (3 rows × 3 cols) ──────────── */}
          <table className="w-full text-xs border-collapse border-b-2 border-gray-800">
            <colgroup>
              <col style={{ width: "52%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "24%" }} />
            </colgroup>
            <tbody>
              {/* Row 1 */}
              <tr>
                <td
                  className={`${cellBorder} ${cellPad} border-t-0 border-l-0`}
                >
                  <span className={labelCls}>Procuring Entity:</span>
                </td>
                <td className={`${cellBorder} ${cellPad} border-t-0`}>
                  <span className={labelCls}>PR No.</span>
                  <div className="font-semibold mt-0.5">
                    {prNo || "(generating...)"}
                  </div>
                </td>
                <td
                  className={`${cellBorder} ${cellPad} border-t-0 border-r-0`}
                >
                  <span className={labelCls}>Date:</span>
                  <input
                    type="date"
                    className={inputCls}
                    value={prDate}
                    onChange={(e) => setPrDate(e.target.value)}
                    disabled={isReadOnly}
                  />
                </td>
              </tr>

              {/* Row 2 */}
              <tr>
                <td className={`${cellBorder} ${cellPad} border-l-0`}>
                  <span className={labelCls}>GL Account (Budgetary):</span>
                  <div className="flex items-center gap-1">
                    <select
                      className={inputCls + " flex-1"}
                      value={rcId}
                      onChange={(e) => {
                        setRcId(e.target.value);
                        setRcsId("");
                      }}
                      disabled={isReadOnly}
                    >
                      <option value="">-- Select GL Account --</option>
                      {rcId &&
                        !budgetGlOptions.some(
                          (opt) => opt.rc_gla_id === rcId,
                        ) && (
                          <option value={rcId}>
                            {rcName(rcId)} (Unavailable)
                          </option>
                        )}
                      {budgetGlOptions.map((opt) => (
                        <option key={opt.rc_gla_id} value={opt.rc_gla_id}>
                          {opt.label} (Remaining: ₱{peso(opt.total_remaining)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {budgetGlOptions.length === 0 && (
                    <p className="mt-1 text-[10px] text-red-600">
                      No eligible Budgetary GL accounts with remaining budget.
                    </p>
                  )}
                </td>
                <td className={`${cellBorder} ${cellPad}`}>
                  <span className={labelCls}>SAI No.</span>
                </td>
                <td className={`${cellBorder} ${cellPad} border-r-0`}>
                  <span className={labelCls}>Date:</span>
                </td>
              </tr>

              {/* Row 3 */}
              <tr>
                <td
                  className={`${cellBorder} ${cellPad} border-l-0 border-b-0`}
                >
                  <span className={labelCls}>Section:</span>
                  <div className="flex items-center gap-1">
                    <select
                      className={inputCls + " flex-1"}
                      value={rcsId}
                      onChange={(e) => setRcsId(e.target.value)}
                      disabled={!rcId || isReadOnly}
                    >
                      <option value="">-- None --</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  {rcId && sections.length === 0 && (
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      No active sections found for this responsibility center.
                    </div>
                  )}
                </td>
                <td className={`${cellBorder} ${cellPad} border-b-0`}>
                  <span className={labelCls}>ALOBS No.</span>
                </td>
                <td
                  className={`${cellBorder} ${cellPad} border-r-0 border-b-0`}
                >
                  <span className={labelCls}>Date:</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Line items table ───────────────────────── */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800 bg-gray-50">
                <th className="border-r border-gray-800 px-2 py-2.5 font-semibold text-center w-14">
                  ITEM
                  <br />
                  No.
                </th>
                <th className="border-r border-gray-800 px-2 py-2.5 font-semibold text-center w-14">
                  QTY
                </th>
                <th className="border-r border-gray-800 px-2 py-2.5 font-semibold text-center w-20">
                  UNIT OF
                  <br />
                  ISSUE
                </th>
                <th className="border-r border-gray-800 px-2 py-2.5 font-semibold text-left">
                  ITEM DESCRIPTION
                </th>
                <th className="border-r border-gray-800 px-2 py-2.5 font-semibold text-center w-28">
                  ESTIMATED
                  <br />
                  UNIT COST
                </th>
                <th className="px-2 py-2.5 font-semibold text-center w-28">
                  ESTIMATED
                  <br />
                  AMOUNT
                </th>
              </tr>
            </thead>

            <tbody>
              {draftRows.map((row, idx) => {
                const rowQty = parseFloat(row.qty) || 0;
                const rowPrice = parseFloat(row.unitPrice) || 0;
                const rowAmount = rowQty * rowPrice;
                const hasContent = !!(
                  row.item_description ||
                  row.qty ||
                  row.unitPrice
                );
                // Filtered suggestions for this row's autocomplete
                const q = row.item_description.toLowerCase().trim();
                const suggestions =
                  suggestionRowId === row.localId
                    ? (q
                        ? allItems.filter((it) =>
                            it.description.toLowerCase().includes(q),
                          )
                        : allItems
                      ).slice(0, 10)
                    : [];
                return (
                  <tr key={row.localId} className="border-b border-gray-300">
                    <td className="border-r border-gray-800 px-2 py-1 text-center align-top text-xs">
                      {hasContent ? idx + 1 : ""}
                    </td>
                    <td className="border-r border-gray-800 px-1 py-1 align-top">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        className="w-full text-xs text-center bg-transparent border-0 border-b border-transparent focus:border-gray-500 py-0.5 focus:outline-none"
                        placeholder="0"
                        value={row.qty}
                        onChange={(e) =>
                          updateDraftRow(row.localId, { qty: e.target.value })
                        }
                        disabled={isReadOnly}
                      />
                    </td>
                    <td className="border-r border-gray-800 px-1 py-1 align-top">
                      <select
                        className="w-full text-xs bg-transparent border-0 border-b border-transparent focus:border-gray-500 py-0.5 focus:outline-none"
                        value={row.u_id}
                        onChange={(e) => {
                          const uid = e.target.value;
                          const unit = allUnits.find((u) => u.id === uid);
                          updateDraftRow(row.localId, {
                            u_id: uid,
                            unit_code: unit?.u_code || "",
                          });
                        }}
                        disabled={isReadOnly}
                      >
                        <option value="">--</option>
                        {allUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.u_code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-r border-gray-800 px-1 py-1 align-top">
                      {/* ── Item description autocomplete ── */}
                      <div className="relative">
                        <input
                          type="text"
                          autoComplete="off"
                          className="w-full text-xs bg-transparent border-0 border-b border-transparent focus:border-gray-500 py-0.5 focus:outline-none font-semibold"
                          placeholder="Item description"
                          value={row.item_description}
                          onFocus={() =>
                            !isReadOnly && setSuggestionRowId(row.localId)
                          }
                          onBlur={() =>
                            setTimeout(() => setSuggestionRowId(null), 150)
                          }
                          onClick={() => {
                            if (row.i_id && !isReadOnly) {
                              setShowPrevReqRowId((prev) =>
                                prev === row.localId ? null : row.localId,
                              );
                              setPrevSpecsRowId(null);
                            }
                          }}
                          onChange={(e) => {
                            updateDraftRow(row.localId, {
                              item_description: e.target.value,
                              i_id: "",
                            });
                            setSuggestionRowId(row.localId);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setSuggestionRowId(null);
                          }}
                          disabled={isReadOnly}
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute z-50 left-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-44 overflow-y-auto w-full min-w-max">
                            {suggestions.map((it) => {
                              const hasSpecs =
                                !!itemSpecHistory[it.description];
                              return (
                                <button
                                  key={it.id}
                                  type="button"
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2"
                                  onMouseDown={async (e) => {
                                    e.preventDefault();
                                    const defUnit = allUnits.find(
                                      (u) => u.id === it.default_u_id,
                                    );
                                    // Don't populate specEntries immediately - user will select from dropdown
                                    updateDraftRow(row.localId, {
                                      item_description: it.description,
                                      i_id: it.id,
                                      specEntries: [], // Clear specs - user will select from dropdown
                                      ...(defUnit
                                        ? {
                                            u_id: defUnit.id,
                                            unit_code: defUnit.u_code,
                                          }
                                        : {}),
                                    });
                                    setSuggestionRowId(null);
                                    // Remove this row from shown specs (user will select from dropdown)
                                    setShowSpecsRowIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(row.localId);
                                      return next;
                                    });
                                    // Lazily load catalog specs for this item
                                    if (!itemDefaultSpecs[it.id]) {
                                      fetchItemSpecs(it.id).then((s) =>
                                        setItemDefaultSpecs((prev) => ({
                                          ...prev,
                                          [it.id]: s,
                                        })),
                                      );
                                    }
                                    // Pre-load previous PR lines for this item
                                    if (!prevPRLines[it.id]) {
                                      const lines =
                                        await fetchPreviousPRLinesByItem(it.id);
                                      setPrevPRLines((prev) => ({
                                        ...prev,
                                        [it.id]: lines,
                                      }));
                                    }
                                  }}
                                >
                                  <span className="flex-1">
                                    {it.description}
                                  </span>
                                  {hasSpecs && (
                                    <span className="text-[9px] text-blue-400 shrink-0">
                                      has specs
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* ── Previous specifications dropdown (replaces "Previous Requests" button) ── */}
                      {row.i_id &&
                        !isReadOnly &&
                        (() => {
                          // Get unique specifications by their content
                          const allLines = prevPRLines[row.i_id] || [];
                          const uniqueSpecs = new Map<
                            string,
                            (typeof allLines)[0]
                          >();
                          allLines.forEach((line) => {
                            const specs = parseSpecEntries(line.specifications);
                            const specKey =
                              specs.length > 0
                                ? specs
                                    .map((s) => `${s.label}:${s.value}`)
                                    .sort()
                                    .join("|")
                                : "";
                            if (specKey && !uniqueSpecs.has(specKey)) {
                              uniqueSpecs.set(specKey, line);
                            }
                          });
                          const uniqueLines = Array.from(uniqueSpecs.values());

                          return (
                            <div className="relative mt-1">
                              <button
                                type="button"
                                className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer text-left flex items-center justify-between"
                                onClick={() =>
                                  setSpecSelectRowId(
                                    specSelectRowId === row.localId
                                      ? null
                                      : row.localId,
                                  )
                                }
                              >
                                <span className="text-gray-500">
                                  -- See list of specifications --
                                </span>
                                <span className="text-gray-400">
                                  {specSelectRowId === row.localId ? "▲" : "▼"}
                                </span>
                              </button>
                              {specSelectRowId === row.localId && (
                                <div className="absolute z-50 left-0 top-full mt-0.5 bg-white border border-gray-300 rounded-lg shadow-xl w-full min-w-[400px] max-h-60 overflow-y-auto">
                                  {uniqueLines.length === 0 ? (
                                    <div className="px-3 py-3 text-[11px] text-gray-400 text-center">
                                      No previous specifications
                                    </div>
                                  ) : (
                                    uniqueLines
                                      .slice(0, 10)
                                      .map((prev, pIdx) => {
                                        const specs = parseSpecEntries(
                                          prev.specifications,
                                        );
                                        const specSummary =
                                          specs.length > 0
                                            ? specs
                                                .map(
                                                  (s) =>
                                                    `${s.label}: ${s.value}`,
                                                )
                                                .join(", ")
                                            : "No specs";
                                        const rowColors = [
                                          "bg-blue-50 hover:bg-blue-100 border-l-blue-500",
                                          "bg-green-50 hover:bg-green-100 border-l-green-500",
                                          "bg-purple-50 hover:bg-purple-100 border-l-purple-500",
                                          "bg-amber-50 hover:bg-amber-100 border-l-amber-500",
                                          "bg-rose-50 hover:bg-rose-100 border-l-rose-500",
                                          "bg-teal-50 hover:bg-teal-100 border-l-teal-500",
                                          "bg-indigo-50 hover:bg-indigo-100 border-l-indigo-500",
                                          "bg-orange-50 hover:bg-orange-100 border-l-orange-500",
                                          "bg-cyan-50 hover:bg-cyan-100 border-l-cyan-500",
                                          "bg-pink-50 hover:bg-pink-100 border-l-pink-500",
                                        ];
                                        const colorCls =
                                          rowColors[pIdx % rowColors.length];
                                        return (
                                          <button
                                            key={prev.prl_id}
                                            type="button"
                                            className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 border-l-4 transition-colors ${colorCls}`}
                                            onClick={() => {
                                              const specEntries =
                                                parseSpecEntries(
                                                  prev.specifications,
                                                );
                                              updateDraftRow(row.localId, {
                                                specEntries,
                                              });
                                              setShowSpecsRowIds((prev) =>
                                                new Set(prev).add(row.localId),
                                              );
                                              setSpecSelectRowId(null);
                                            }}
                                          >
                                            <div className="text-[11px] text-gray-700 whitespace-normal break-words">
                                              {specSummary}
                                            </div>
                                          </button>
                                        );
                                      })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      {/* ── Structured specs editor (only shown after selecting from dropdown or for existing PR rows) ───── */}
                      {row.specEntries.length > 0 &&
                        (showSpecsRowIds.has(row.localId) || row.prl_id) && (
                          <div className="mt-2 border-t border-gray-200 pt-1">
                            <span className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">
                              Specs:
                            </span>
                            {row.specEntries.map((entry) => {
                              const skKey = `${row.localId}:${entry.id}`;
                              const catalogSpecs =
                                itemDefaultSpecs[row.i_id] || [];
                              const specQ = entry.label.toLowerCase();
                              const specSuggestions = allSpecs
                                .filter(
                                  (s) =>
                                    !specQ ||
                                    s.description.toLowerCase().includes(specQ),
                                )
                                .slice(0, 20);

                              // Get values only from this item's catalog specs
                              const itemCatalogValues = catalogSpecs
                                .filter(
                                  (d) =>
                                    d.s_description === entry.label ||
                                    d.s_id === entry.s_id,
                                )
                                .map((d) => d.spec_value)
                                .filter((v) => v);

                              // Get values from previous PR lines for THIS item only
                              const itemPrevLines = prevPRLines[row.i_id] || [];
                              const itemPastValues: string[] = [];
                              for (const line of itemPrevLines) {
                                try {
                                  const specs = JSON.parse(
                                    line.specifications || "[]",
                                  );
                                  if (Array.isArray(specs)) {
                                    for (const spec of specs) {
                                      if (
                                        spec.label === entry.label &&
                                        spec.value
                                      ) {
                                        itemPastValues.push(spec.value);
                                      }
                                    }
                                  }
                                } catch {
                                  // ignore parse errors
                                }
                              }

                              // Combine item-specific values only (no global values)
                              const allValues = [
                                ...new Set([
                                  ...itemCatalogValues,
                                  ...itemPastValues,
                                ]),
                              ];
                              const valueQ = entry.value.toLowerCase();
                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-start gap-1 mt-1 group"
                                >
                                  {/* Spec label with autocomplete */}
                                  <div className="relative w-[38%] min-w-0">
                                    <input
                                      autoComplete="off"
                                      value={entry.label}
                                      placeholder="Spec name"
                                      className="text-[11px] font-bold bg-transparent border-0 border-b border-transparent focus:border-gray-400 py-0 focus:outline-none w-full"
                                      onFocus={() =>
                                        !isReadOnly &&
                                        setSpecSuggestionKey(skKey)
                                      }
                                      onBlur={() =>
                                        setTimeout(
                                          () => setSpecSuggestionKey(null),
                                          150,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Escape")
                                          setSpecSuggestionKey(null);
                                      }}
                                      onChange={(e) => {
                                        updateSpecEntryInRow(
                                          row.localId,
                                          entry.id,
                                          {
                                            label: e.target.value,
                                            s_id: undefined,
                                          },
                                        );
                                        setSpecSuggestionKey(skKey);
                                      }}
                                      disabled={isReadOnly}
                                    />
                                    {specSuggestionKey === skKey &&
                                      specSuggestions.length > 0 && (
                                        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl w-56 min-w-full max-h-44 overflow-y-auto py-1">
                                          {specSuggestions.map((s) => {
                                            const defaultVal =
                                              catalogSpecs.find(
                                                (d) => d.s_id === s.id,
                                              )?.spec_value ?? "";
                                            return (
                                              <button
                                                key={s.id}
                                                type="button"
                                                className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateSpecEntryInRow(
                                                    row.localId,
                                                    entry.id,
                                                    {
                                                      s_id: s.id,
                                                      label: s.description,
                                                      // Don't auto-populate value - let user select from value dropdown
                                                    },
                                                  );
                                                  setSpecSuggestionKey(null);
                                                }}
                                              >
                                                <History className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="font-medium flex-1 truncate">
                                                  {s.description}
                                                </span>
                                                {defaultVal && (
                                                  <span className="text-[9px] text-gray-400 shrink-0">
                                                    {defaultVal}
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                  </div>
                                  <span className="text-[11px] font-bold shrink-0 mt-0.5">
                                    :
                                  </span>
                                  {/* Value input with history suggestions */}
                                  <div className="relative flex-1 min-w-0">
                                    <input
                                      autoComplete="off"
                                      value={entry.value}
                                      placeholder="value"
                                      className="text-[11px] w-full bg-transparent border-0 border-b border-transparent focus:border-gray-400 py-0 focus:outline-none text-gray-700"
                                      onFocus={() =>
                                        !isReadOnly && setSpecValueKey(skKey)
                                      }
                                      onBlur={() =>
                                        setTimeout(
                                          () => setSpecValueKey(null),
                                          150,
                                        )
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Escape")
                                          setSpecValueKey(null);
                                      }}
                                      onChange={(e) => {
                                        updateSpecEntryInRow(
                                          row.localId,
                                          entry.id,
                                          {
                                            value: e.target.value,
                                          },
                                        );
                                        setSpecValueKey(skKey);
                                      }}
                                      disabled={isReadOnly}
                                    />
                                    {specValueKey === skKey &&
                                      allValues.length > 0 && (
                                        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl min-w-[140px] w-max max-h-36 overflow-y-auto py-1">
                                          {allValues.map((v) => {
                                            const isMatch =
                                              !valueQ ||
                                              v.toLowerCase().includes(valueQ);
                                            return (
                                              <button
                                                key={v}
                                                type="button"
                                                className={`w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-blue-50 flex items-center gap-2 transition-colors ${!isMatch && valueQ ? "opacity-40" : ""}`}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  updateSpecEntryInRow(
                                                    row.localId,
                                                    entry.id,
                                                    { value: v },
                                                  );
                                                  setSpecValueKey(null);
                                                }}
                                              >
                                                <History className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="truncate">
                                                  {v}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSpecEntryFromRow(
                                        row.localId,
                                        entry.id,
                                      )
                                    }
                                    className="text-gray-300 hover:text-red-500 text-xs leading-none opacity-0 group-hover:opacity-100 shrink-0 print:hidden"
                                    title="Remove spec row"
                                    hidden={isReadOnly}
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      <button
                        type="button"
                        onClick={() => {
                          addSpecEntryToRow(row.localId);
                          setShowSpecsRowIds((prev) =>
                            new Set(prev).add(row.localId),
                          ); // Show specs when adding new spec
                        }}
                        className="mt-1.5 flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 font-medium print:hidden"
                        hidden={isReadOnly}
                      >
                        <Plus className="w-3 h-3" />
                        Add Product Spec
                      </button>
                    </td>
                    <td className="border-r border-gray-800 px-1 py-1 align-top">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full text-xs text-right bg-transparent border-0 border-b border-transparent focus:border-gray-500 py-0.5 focus:outline-none"
                        placeholder="0.00"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateDraftRow(row.localId, {
                            unitPrice: e.target.value,
                          })
                        }
                        disabled={isReadOnly}
                      />
                    </td>
                    <td className="px-2 py-1 text-right align-top text-xs font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <span>{rowAmount > 0 ? peso(rowAmount) : ""}</span>
                        <button
                          type="button"
                          onClick={() => removeDraftRow(row)}
                          className="text-gray-300 hover:text-red-500 print:hidden leading-none"
                          title="Remove row"
                          hidden={isReadOnly}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Add row button */}
              {!isReadOnly && (
                <tr className="border-b border-gray-300 print:hidden">
                  <td colSpan={6} className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={addEmptyRow}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Row
                    </button>
                  </td>
                </tr>
              )}

              {/* Nothing Follows */}
              {draftRows.some((r) => r.item_description) && (
                <tr className="border-b border-gray-300">
                  <td
                    colSpan={4}
                    className="border-r border-gray-800 px-2 py-2 text-center italic text-gray-400 text-[11px]"
                  >
                    xxxxxNothing Followsxxxxx
                  </td>
                  <td className="border-r border-gray-800 px-2 py-2">&nbsp;</td>
                  <td className="px-2 py-2">&nbsp;</td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-gray-800">
                <td
                  colSpan={4}
                  className="border-r border-gray-800 px-3 py-2.5"
                />
                <td className="border-r border-gray-800 px-2 py-2.5 text-right font-bold">
                  TOTAL
                </td>
                <td className="px-2 py-2.5 text-right font-bold">
                  {peso(total)}
                </td>
              </tr>
              {/* Budget Exceeded Warning */}
              {useExistingBudget &&
                selectedParentPrId &&
                (() => {
                  const selectedPr = prsWithBudget.find(
                    (p) => p.pr_id === selectedParentPrId,
                  );
                  if (selectedPr && total > selectedPr.remaining_budget) {
                    return (
                      <tr className="bg-red-50">
                        <td
                          colSpan={6}
                          className="px-3 py-2 text-xs text-red-700 font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-red-500">⚠️</span>
                            Total amount (₱{peso(total)}) exceeds the remaining
                            budget (₱{peso(selectedPr.remaining_budget)}) from
                            selected PR. Please reduce to save.
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })()}
            </tfoot>
          </table>

          {/* ── Purpose ────────────────────────────────── */}
          <div className="border-t-2 border-gray-800 px-3 py-3">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-gray-500 uppercase shrink-0 pt-1">
                Purpose
              </span>
              <textarea
                className="flex-1 text-xs border-0 border-b border-gray-300 bg-transparent resize-none py-0.5 focus:outline-none focus:border-gray-800"
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Purpose of the purchase request"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* ── Document Footer (Signatories) ─────────────── */}
          <DocumentFooter
            signatories={documentSettings.signatories}
            requestedByValue={requestedBy}
            onRequestedByChange={setRequestedBy}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* Shared datalist for spec names from gse.specs table */}
        <datalist id="specs-datalist">
          {allSpecs.map((s) => (
            <option key={s.id} value={s.description} />
          ))}
        </datalist>

        {/* Document Settings Dialog */}
        <DocumentSettingsDialog
          isOpen={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          onSave={setDocumentSettings}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  //  RENDER — LIST VIEW
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Request Entry"
        subtitle="Create and manage Purchase Requests (PR)"
        icon={<FileText className="w-6 h-6" />}
      />

      <StatsRow>
        <StatCard label="Total PRs" value={prs.length} />
        <StatCard
          label="Draft"
          value={prs.filter((p) => p.status === "DRAFT").length}
          color="default"
        />
        <StatCard
          label="Submitted"
          value={prs.filter((p) => p.status === "SUBMITTED").length}
          color="primary"
        />
        <StatCard
          label="Approved"
          value={prs.filter((p) => p.status === "APPROVED").length}
          color="success"
        />
      </StatsRow>

      <Tabs
        tabs={[
          { id: "all", label: "All" },
          { id: "DRAFT", label: "Draft" },
          { id: "SUBMITTED", label: "Submitted" },
          { id: "APPROVED", label: "Approved" },
          { id: "REJECTED", label: "Rejected" },
          { id: "CANCELLED", label: "Cancelled" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <ActionsBar>
        <PrimaryButton onClick={() => openForm()}>
          <Plus className="w-4 h-4" />
          New PR
        </PrimaryButton>
        <PrimaryButton onClick={loadPRs} disabled={listLoading}>
          <RefreshCw
            className={`w-4 h-4 ${listLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </PrimaryButton>
        <PrimaryButton onClick={() => {}}>
          <Download className="w-4 h-4" />
          Export
        </PrimaryButton>
      </ActionsBar>

      <DataTable<PurchaseRequest>
        data={filtered}
        columns={[
          { key: "pr_no", header: "PR No." },
          { key: "pr_date", header: "Date" },
          {
            key: "rc_id",
            header: "GL Account",
            render: (row) => <span>{rcName(row.rc_id)}</span>,
          },
          {
            key: "purpose",
            header: "Purpose",
            render: (row) => (
              <span className="truncate max-w-50 block">{row.purpose}</span>
            ),
          },
          {
            key: "pr_total_amount",
            header: "Total",
            render: (row) => (
              <span className="font-semibold">
                ₱{peso(row.pr_total_amount ?? 0)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <span
                className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${statusColors[row.status]}`}
              >
                {row.status}
              </span>
            ),
          },
          {
            key: "actions" as any,
            header: "Actions",
            render: (row) => (
              <div className="flex gap-1">
                {row.status === "DRAFT" ? (
                  <IconButton onClick={() => openForm(row)} title="Edit">
                    <Pencil className="w-4 h-4" />
                  </IconButton>
                ) : (
                  <IconButton onClick={() => openForm(row)} title="View">
                    <Eye className="w-4 h-4" />
                  </IconButton>
                )}
                <IconButton
                  onClick={() => handleDeletePR(row)}
                  title="Delete"
                  variant="danger"
                  disabled={row.status !== "DRAFT"}
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            ),
          },
        ]}
        title={`Purchase Requests (${filtered.length})`}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by PR no., purpose, or GL account..."
        emptyMessage={
          listLoading
            ? "Loading purchase requests…"
            : "No purchase requests found."
        }
      />
    </div>
  );
};

export default PurchaseRequestEntry;
