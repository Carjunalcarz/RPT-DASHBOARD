import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  ResponsibilityCenter,
  ResponsibilityCenterSection,
  Unit,
  Item,
  Spec,
  PurchaseRequest,
  PurchaseRequestLine,
  PurchaseRequestFormData,
  PRLineFormData,
} from "@/types/gse.types";

// ────────────────────────────────────────────────────────────
// LOOKUPS (public + gse schemas)
// ────────────────────────────────────────────────────────────

export const fetchResponsibilityCenters = async (): Promise<
  ResponsibilityCenter[]
> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from("responsibility_center")
    .select("id, rc_code, description, is_active, created_at")
    .eq("is_active", true)
    .order("description");
  if (error) {
    console.error("Error fetching responsibility centers:", error);
    return [];
  }
  return data || [];
};

export const fetchSections = async (
  rcId?: string,
): Promise<ResponsibilityCenterSection[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = (supabase as NonNullable<typeof supabase>)
    .from("responsibility_center_section")
    .select("id, rcs_code, description, rc_id, is_active, created_at")
    .eq("is_active", true)
    .order("description");
  if (rcId) query = query.eq("rc_id", rcId);
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching sections:", error);
    return [];
  }
  return data || [];
};

export interface PRBudgetGlAccountOption {
  rc_gla_id: string;
  rc_id: string;
  gla_id: string;
  code: string;
  description: string;
  label: string;
  total_budget: number;
  total_remaining: number;
}

export const fetchPRBudgetGlAccountOptions = async (): Promise<
  PRBudgetGlAccountOption[]
> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  const client = supabase as NonNullable<typeof supabase>;

  const { data: budgetRows, error: budgetError } = await client
    .schema("budget")
    .from("work_financial_plan")
    .select("rc_gla_id, budget, remaining, status")
    .eq("status", true);

  if (budgetError) {
    console.error("Error fetching budget account details:", budgetError);
    return [];
  }

  const totalsByRcGla = new Map<
    string,
    { total_budget: number; total_remaining: number }
  >();

  for (const row of (budgetRows as any[]) || []) {
    const rcGlaId = String(row.rc_gla_id || "").trim();
    if (!rcGlaId) continue;

    const existing = totalsByRcGla.get(rcGlaId) || {
      total_budget: 0,
      total_remaining: 0,
    };

    existing.total_budget += Number(row.budget || 0);
    existing.total_remaining += Number(row.remaining || 0);
    totalsByRcGla.set(rcGlaId, existing);
  }

  const eligibleRcGlaIds = [...totalsByRcGla.entries()]
    .filter(([, totals]) => totals.total_remaining > 0)
    .map(([id]) => id);

  if (eligibleRcGlaIds.length === 0) return [];

  const { data: rcGlaRows, error: rcGlaError } = await client
    .schema("accounting")
    .from("responsibility_center_general_ledger_accounts")
    .select("id, rc_id, gla_id")
    .in("id", eligibleRcGlaIds);

  if (rcGlaError) {
    console.error("Error fetching RC-GLA connections:", rcGlaError);
    return [];
  }

  const rcGlaById = new Map<string, { rc_id: string; gla_id: string }>();
  for (const row of (rcGlaRows as any[]) || []) {
    rcGlaById.set(String(row.id), {
      rc_id: String(row.rc_id || ""),
      gla_id: String(row.gla_id || ""),
    });
  }

  const glaIds = [...new Set((rcGlaRows as any[]).map((r) => r.gla_id))].filter(
    Boolean,
  );
  if (glaIds.length === 0) return [];

  const { data: glaRows, error: glaError } = await client
    .schema("accounting")
    .from("general_ledger_account")
    .select("id, code, description, account_type")
    .in("id", glaIds);

  if (glaError) {
    console.error("Error fetching GL accounts:", glaError);
    return [];
  }

  const budgetaryGlaMap = new Map<
    string,
    { code: string; description: string }
  >();
  for (const row of (glaRows as any[]) || []) {
    if (row.account_type !== "Budgetary Accounts") continue;
    budgetaryGlaMap.set(String(row.id), {
      code: String(row.code || ""),
      description: String(row.description || ""),
    });
  }

  const options: PRBudgetGlAccountOption[] = [];

  for (const rcGlaId of eligibleRcGlaIds) {
    const totals = totalsByRcGla.get(rcGlaId);
    const rcGla = rcGlaById.get(rcGlaId);
    if (!totals || !rcGla) continue;

    const gla = budgetaryGlaMap.get(rcGla.gla_id);
    if (!gla) continue;

    options.push({
      rc_gla_id: rcGlaId,
      rc_id: rcGla.rc_id,
      gla_id: rcGla.gla_id,
      code: gla.code,
      description: gla.description,
      label: `${gla.code} - ${gla.description}`,
      total_budget: totals.total_budget,
      total_remaining: totals.total_remaining,
    });
  }

  return options.sort((a, b) => a.code.localeCompare(b.code));
};

export const fetchUnits = async (): Promise<Unit[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("unit")
    .select("u_id, u_code, description, is_active")
    .eq("is_active", true)
    .order("u_code");
  if (error) {
    console.error("Error fetching units:", error);
    return [];
  }
  return (data || []).map((r: any) => ({ id: r.u_id, ...r }));
};

export const fetchItems = async (): Promise<Item[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("items")
    .select("i_id, i_code, description, default_u_id, is_active")
    .eq("is_active", true)
    .order("i_code");
  if (error) {
    console.error("Error fetching items:", error);
    return [];
  }
  return (data || []).map((r: any) => ({ id: r.i_id, ...r }));
};

export const fetchSpecs = async (): Promise<Spec[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("specs")
    .select("s_id, s_code, description, is_active")
    .eq("is_active", true)
    .order("description");
  if (error) {
    console.error("Error fetching specs:", error);
    return [];
  }
  return (data || []).map((r: any) => ({ id: r.s_id, ...r }));
};

// Fetches catalog specs for a given item from item_spec table.
export interface ItemSpecDefault {
  s_id: string;
  s_code: string;
  s_description: string;
  spec_value: string;
}

export const fetchItemSpecs = async (
  i_id: string,
): Promise<ItemSpecDefault[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("item_spec")
    .select("s_id, spec_value, specs:s_id(s_code, description)")
    .eq("i_id", i_id);
  if (error) {
    console.error("Error fetching item specs:", error);
    return [];
  }
  return ((data as any[]) || []).map((row) => {
    const spec = Array.isArray(row.specs) ? row.specs[0] : row.specs;
    return {
      s_id: row.s_id,
      s_code: spec?.s_code ?? "",
      s_description: spec?.description ?? "",
      spec_value: row.spec_value ?? "",
    };
  });
};

// Returns the most-recent specifications JSON string keyed by item description.
// Used to auto-fill specs when an item is re-selected in a new PR line.
export const fetchItemSpecHistory = async (): Promise<
  Record<string, string | null>
> => {
  if (!isSupabaseConfigured() || !supabase) return {};
  const { data } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .select("specifications, items:i_id(description)")
    .order("created_at", { ascending: false });
  const map: Record<string, string | null> = {};
  for (const row of (data as any[]) || []) {
    const desc = (Array.isArray(row.items) ? row.items[0] : row.items)
      ?.description as string | undefined;
    if (desc && !(desc in map)) {
      map[desc] = row.specifications || null;
    }
  }
  return map;
};

export const fetchRcGlaContraCode = async (rcId?: string): Promise<string | null> => {
  if (!rcId || !isSupabaseConfigured() || !supabase) return null;
  const client = supabase as NonNullable<typeof supabase>;

  const { data, error } = await client
    .schema("accounting")
    .from("responsibility_center_gla_contra")
    .select("gla_contra(code)")
    .eq("rc_id", rcId)
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching RC-GLA contra code:", error);
    return null;
  }

  const code = (data?.gla_contra as { code?: string } | null)?.code ?? null;
  return code ? code.toUpperCase() : null;
};

// Returns all previously-used values keyed by spec label.
// Parses every specifications JSON in purchase_request_list so the value
// field can suggest options based on what was typed in past entries.
export const fetchSpecValueHistory = async (): Promise<
  Record<string, string[]>
> => {
  if (!isSupabaseConfigured() || !supabase) return {};
  const { data } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .select("specifications")
    .not("specifications", "is", null);
  const map: Record<string, Set<string>> = {};
  for (const row of (data as any[]) || []) {
    try {
      const parsed = JSON.parse(row.specifications);
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          const label = String(e.label ?? "").trim();
          const value = String(e.value ?? "").trim();
          if (label && value) {
            if (!map[label]) map[label] = new Set();
            map[label].add(value);
          }
        }
      }
    } catch {
      // ignore non-JSON rows
    }
  }
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(map)) result[k] = [...v];
  return result;
};

// Returns all distinct spec values from the item_spec catalog table,
// grouped by spec description (e.g. "Brand" → ["Xiaomi","Huawei"], "Color" → ["black","white"]).
export const fetchAllCatalogSpecValues = async (): Promise<
  Record<string, string[]>
> => {
  if (!isSupabaseConfigured() || !supabase) return {};
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("item_spec")
    .select("spec_value, specs:s_id(description)");
  if (error) {
    console.error("Error fetching catalog spec values:", error);
    return {};
  }
  const map: Record<string, Set<string>> = {};
  for (const row of (data as any[]) || []) {
    const spec = Array.isArray(row.specs) ? row.specs[0] : row.specs;
    const label = (spec?.description ?? "").trim();
    const value = (row.spec_value ?? "").trim();
    if (label && value) {
      if (!map[label]) map[label] = new Set();
      map[label].add(value);
    }
  }
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(map)) result[k] = [...v];
  return result;
};

// ────────────────────────────────────────────────────────────
// PURCHASE REQUESTS — header
// ────────────────────────────────────────────────────────────

export const fetchPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request")
    .select(
      `
      pr_id, pr_no, pr_date, rc_id, rcs_id, purpose, remarks,
      pr_total_amount, status, requested_by, approved_by, approved_at,
      created_at, updated_at
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching purchase requests:", error);
    return [];
  }

  return ((data || []) as any[]).map((row) => ({
    ...row,
    id: row.pr_id,
  })) as PurchaseRequest[];
};

export const createPurchaseRequest = async (
  formData: PurchaseRequestFormData,
): Promise<{ success: boolean; pr_id?: string; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const cleaned: Record<string, unknown> = {
    pr_date: formData.pr_date,
    rc_id: formData.rc_id,
    rcs_id: formData.rcs_id || null,
    purpose: formData.purpose,
    remarks: formData.remarks || null,
    requested_by: formData.requested_by || null,
    status: "DRAFT",
  };
  if (formData.pr_no) cleaned.pr_no = formData.pr_no;

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request")
    .insert([cleaned])
    .select("pr_id")
    .single();

  if (error) {
    console.error("Error creating PR:", error);
    return { success: false, error: error.message };
  }

  return { success: true, pr_id: data?.pr_id };
};

export const updatePurchaseRequest = async (
  prId: string,
  formData: Partial<PurchaseRequestFormData & { status: string }>,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const { error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request")
    .update(formData)
    .eq("pr_id", prId);

  if (error) {
    console.error("Error updating PR:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deletePurchaseRequest = async (
  prId: string,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const { error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request")
    .delete()
    .eq("pr_id", prId);

  if (error) {
    console.error("Error deleting PR:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const upsertBudgetPendingDetailFromPR = async (
  prId: string,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const client = supabase as NonNullable<typeof supabase>;

  const { data: prRow, error: prError } = await client
    .schema("gse")
    .from("purchase_request")
    .select("rc_id")
    .eq("pr_id", prId)
    .maybeSingle();

  if (prError || !prRow?.rc_id) {
    return {
      success: false,
      error:
        prError?.message || "Unable to resolve responsibility center from PR.",
    };
  }

  const { data: rcGlaRows, error: rcGlaError } = await client
    .schema("accounting")
    .from("responsibility_center_general_ledger_accounts")
    .select("id")
    .eq("rc_id", prRow.rc_id);

  if (rcGlaError || !rcGlaRows || rcGlaRows.length === 0) {
    return {
      success: false,
      error:
        rcGlaError?.message ||
        "No RC-GLA mapping found for the PR responsibility center.",
    };
  }

  const rcGlaIds = rcGlaRows.map((row) => row.id as string);

  const { data: budgetRows } = await client
    .schema("budget")
    .from("work_financial_plan")
    .select("rc_gla_id, remaining")
    .in("rc_gla_id", rcGlaIds)
    .eq("status", true);

  let selectedRcGlaId = rcGlaIds[0];
  if (budgetRows && budgetRows.length > 0) {
    const remainingByRcGla = new Map<string, number>();
    for (const row of budgetRows as any[]) {
      const key = String(row.rc_gla_id || "");
      if (!key) continue;
      const current = remainingByRcGla.get(key) || 0;
      remainingByRcGla.set(key, current + Number(row.remaining || 0));
    }

    selectedRcGlaId =
      [...remainingByRcGla.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      selectedRcGlaId;
  }

  const { data: existingRows, error: existingError } = await client
    .schema("budget")
    .from("pending_details")
    .select("id")
    .eq("pr_id", prId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existingRows && existingRows.length > 0) {
    const { error: updateError } = await client
      .schema("budget")
      .from("pending_details")
      .update({ rc_gla_id: selectedRcGlaId })
      .eq("id", existingRows[0].id);

    if (updateError) return { success: false, error: updateError.message };
    return { success: true };
  }

  const { error: insertError } = await client
    .schema("budget")
    .from("pending_details")
    .insert({
      pr_id: prId,
      rc_gla_id: selectedRcGlaId,
    });

  if (insertError) return { success: false, error: insertError.message };
  return { success: true };
};

// ────────────────────────────────────────────────────────────
// PURCHASE REQUEST LINE ITEMS
// ────────────────────────────────────────────────────────────

// Fetches previous PR lines for a given item, including PR no. for identification.
export interface PreviousPRLine {
  prl_id: string;
  pr_id: string;
  pr_no: string;
  pr_date: string;
  qty: number;
  unit_price_estimated: number;
  specifications: string | null;
  unit_code: string;
}

export const fetchPreviousPRLinesByItem = async (
  i_id: string,
): Promise<PreviousPRLine[]> => {
  if (!isSupabaseConfigured() || !supabase || !i_id) return [];
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .select(
      `
      prl_id, pr_id, qty, unit_price_estimated, specifications,
      unit:u_id ( u_code ),
      purchase_request:pr_id ( pr_no, pr_date )
    `,
    )
    .eq("i_id", i_id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching previous PR lines by item:", error);
    return [];
  }
  return ((data as any[]) || []).map((row) => {
    const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit;
    const pr = Array.isArray(row.purchase_request)
      ? row.purchase_request[0]
      : row.purchase_request;
    return {
      prl_id: row.prl_id,
      pr_id: row.pr_id,
      pr_no: pr?.pr_no ?? "",
      pr_date: pr?.pr_date ?? "",
      qty: row.qty,
      unit_price_estimated: row.unit_price_estimated,
      specifications: row.specifications,
      unit_code: unit?.u_code ?? "",
    };
  });
};

export const fetchPRLines = async (
  prId: string,
): Promise<PurchaseRequestLine[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .select(
      `
      prl_id, pr_id, i_id, u_id, qty, unit_price_estimated,
      prl_total_amount_estimated, specifications, created_at, updated_at,
      items:i_id ( i_code, description ),
      unit:u_id  ( u_code )
    `,
    )
    .eq("pr_id", prId)
    .order("created_at");

  if (error) {
    console.error("Error fetching PR lines:", error);
    return [];
  }

  return ((data as any[]) || []).map((row) => {
    const item = Array.isArray(row.items) ? row.items[0] : row.items;
    const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit;
    return {
      ...row,
      id: row.prl_id,
      item_code: item?.i_code ?? "",
      item_description: item?.description ?? "",
      unit_code: unit?.u_code ?? "",
    };
  });
};

export const addPRLine = async (
  prId: string,
  line: PRLineFormData,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const { error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .insert([
      {
        pr_id: prId,
        i_id: line.i_id,
        u_id: line.u_id,
        qty: line.qty,
        unit_price_estimated: line.unit_price_estimated,
        specifications: line.specifications || null,
      },
    ]);

  if (error) {
    console.error("Error adding PR line:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const updatePRLine = async (
  prlId: string,
  line: Partial<PRLineFormData>,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const { error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .update(line)
    .eq("prl_id", prlId);

  if (error) {
    console.error("Error updating PR line:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deletePRLine = async (
  prlId: string,
): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const { error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request_list")
    .delete()
    .eq("prl_id", prlId);

  if (error) {
    console.error("Error deleting PR line:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

// ────────────────────────────────────────────────────────────
// RESPONSIBILITY CENTER / SECTION — QUICK CREATE
// ────────────────────────────────────────────────────────────

export const createResponsibilityCenter = async (
  description: string,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase)
    return { success: false, error: "Supabase is not configured" };
  const rc_code = "RC-" + Date.now().toString().slice(-6);
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from("responsibility_center")
    .insert({ rc_code, description: description.trim(), is_active: true })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
};

export const createResponsibilityCenterSection = async (
  description: string,
  rc_id: string,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase)
    return { success: false, error: "Supabase is not configured" };
  const rcs_code = "RCS-" + Date.now().toString().slice(-6);
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .from("responsibility_center_section")
    .insert({
      rcs_code,
      description: description.trim(),
      rc_id,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
};

// ────────────────────────────────────────────────────────────
// AUTO-GENERATE PR NUMBER
// ────────────────────────────────────────────────────────────

export const generateNextPRNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;

  if (!isSupabaseConfigured() || !supabase) {
    return `${prefix}0001`;
  }

  const { data } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("purchase_request")
    .select("pr_no")
    .like("pr_no", `${prefix}%`)
    .order("pr_no", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0 && data[0].pr_no) {
    const lastNum = parseInt(data[0].pr_no.replace(prefix, ""), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// ────────────────────────────────────────────────────────────
// GET OR CREATE ITEM / UNIT (for free-text inputs)
// ────────────────────────────────────────────────────────────

export const getOrCreateItem = async (
  description: string,
): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase || !description.trim()) return null;

  const { data: existing } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("items")
    .select("i_id")
    .ilike("description", description.trim())
    .limit(1);

  if (existing && existing.length > 0) return existing[0].i_id;

  const i_code = "ITEM-" + Date.now().toString().slice(-6);
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("items")
    .insert({ i_code, description: description.trim(), is_active: true })
    .select("i_id")
    .single();

  if (error) {
    console.error("Error creating item:", error);
    return null;
  }
  return data?.i_id ?? null;
};

export const getOrCreateUnit = async (code: string): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase || !code.trim()) return null;

  const { data: existing } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("unit")
    .select("u_id")
    .ilike("u_code", code.trim())
    .limit(1);

  if (existing && existing.length > 0) return existing[0].u_id;

  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("unit")
    .insert({
      u_code: code.trim().toUpperCase(),
      description: code.trim(),
      is_active: true,
    })
    .select("u_id")
    .single();

  if (error) {
    console.error("Error creating unit:", error);
    return null;
  }
  return data?.u_id ?? null;
};

export const getOrCreateSpec = async (
  description: string,
): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase || !description.trim()) return null;

  const { data: existing } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("specs")
    .select("s_id")
    .ilike("description", description.trim())
    .limit(1);

  if (existing && existing.length > 0) return existing[0].s_id;

  const s_code = "SPEC-" + Date.now().toString().slice(-6);
  const { data, error } = await (supabase as NonNullable<typeof supabase>)
    .schema("gse")
    .from("specs")
    .insert({ s_code, description: description.trim(), is_active: true })
    .select("s_id")
    .single();

  if (error) {
    console.error("Error creating spec:", error);
    return null;
  }
  return data?.s_id ?? null;
};
