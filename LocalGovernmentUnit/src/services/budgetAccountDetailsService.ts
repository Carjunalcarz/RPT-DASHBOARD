import { supabase } from "./supabase";

export interface BudgetAccountDetailRow {
  id: string;
  created_at: string;
  editable?: boolean;
  status?: boolean;
  year: string;
  description: string;
  from_date: string;
  to_date: string;
  budget: number;
  remaining: number;
  mag_id: string;
}

export interface CreateBudgetAccountDetailInput {
  year: string;
  description: string;
  from_date: string;
  to_date: string;
  budget: number;
  remaining: number;
  mag_id: string;
}

export type UpdateBudgetAccountDetailInput =
  Partial<CreateBudgetAccountDetailInput>;
export type BudgetAccountType = "Budgetary Accounts" | "Financial Transactions";

const extractMonth = (isoDate: string): number => {
  const month = Number(String(isoDate).split("-")[1]);
  if (Number.isInteger(month) && month >= 1 && month <= 12) return month;
  throw new Error("Invalid date format. Expected YYYY-MM-DD.");
};

interface ResponsibilityCenterGLAConnectionRow {
  id: string;
  gla_id: string;
  rc_id: string;
}

interface GeneralLedgerAccountLookupRow {
  id: string;
  code: string;
  description: string;
  account_type?: string | null;
}

export interface BudgetMajorAccountGroupOption {
  id: string;
  accountType: BudgetAccountType | null;
  code: string;
  description: string;
  label: string;
}

export interface BudgetPendingDetailRow {
  id: string;
  created_at: string;
  editable?: boolean;
  status: boolean;
  rc_gla_id: string;
  po_id: string | null;
  pr_id: string | null;
  payroll_id: string | null;
  source_type: "purchase_order" | "purchase_request" | "payroll" | "unknown";
  source_id: string | null;
  source_label: string;
  amount: number;
}

interface BacPurchaseOrderRow {
  po_id: string;
  po_no: string | null;
  po_total_amount: number | null;
}

interface GsePurchaseRequestRow {
  pr_id: string;
  pr_no: string | null;
  pr_total_amount: number | null;
}

interface HrPayrollRow {
  id: string;
  period_name: string | null;
  total_amount: number | null;
}

export interface BudgetTransactionRecordRow {
  id: string;
  created_at: string;
  module_name: "account_details" | "pending_details" | "work_financial_plan";
  action_type: string;
  entity_id: string | null;
  description: string;
  actor_id: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateBudgetTransactionRecordInput {
  module_name: BudgetTransactionRecordRow["module_name"];
  action_type: string;
  entity_id?: string | null;
  description: string;
  actor_id?: string | null;
  actor_name?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TransferBudgetInput {
  fromAccountDetailId: string;
  toAccountDetailId: string;
  amount: number;
  actorId?: string | null;
  actorName?: string | null;
  reason?: string | null;
}

export interface TransferBudgetResult {
  success: boolean;
  fromAccountDetailId: string;
  toAccountDetailId: string;
  amount: number;
  year: string;
}

const RC_GLA_PRIMARY_TABLE = "responsibility_center_general_ledger_accounts";
const RC_GLA_FALLBACK_TABLE = "responsibility_center_general_ledger";

const ensureSupabase = () => {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase;
};

export async function fetchBudgetAccountDetails(): Promise<
  BudgetAccountDetailRow[]
> {
  const client = ensureSupabase();

  const { data, error } = await client
    .schema("budget")
    .from("work_financial_plan")
    .select(
      "id, created_at, editable, status, year, description, from_date, to_date, budget, remaining, mag_id",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as BudgetAccountDetailRow[]) || [];
}

export async function createBudgetAccountDetail(
  payload: CreateBudgetAccountDetailInput,
): Promise<BudgetAccountDetailRow> {
  const client = ensureSupabase();

  const payloadWithMonths = {
    ...payload,
    from_month: extractMonth(payload.from_date),
    to_month: extractMonth(payload.to_date),
  };

  const { data, error } = await client
    .schema("budget")
    .from("work_financial_plan")
    .insert(payloadWithMonths)
    .select(
      "id, created_at, editable, status, year, description, from_date, to_date, budget, remaining, mag_id",
    )
    .single();

  if (error) throw error;
  return data as BudgetAccountDetailRow;
}

export async function updateBudgetAccountDetail(
  id: string,
  payload: UpdateBudgetAccountDetailInput,
): Promise<BudgetAccountDetailRow> {
  const client = ensureSupabase();

  const payloadWithMonths: Record<string, unknown> = { ...payload };

  if (payload.from_date) {
    payloadWithMonths.from_month = extractMonth(payload.from_date);
  }

  if (payload.to_date) {
    payloadWithMonths.to_month = extractMonth(payload.to_date);
  }

  const { data, error } = await client
    .schema("budget")
    .from("work_financial_plan")
    .update(payloadWithMonths)
    .eq("id", id)
    .select(
      "id, created_at, editable, status, year, description, from_date, to_date, budget, remaining, mag_id",
    )
    .single();

  if (error) throw error;
  return data as BudgetAccountDetailRow;
}

export async function deleteBudgetAccountDetail(id: string): Promise<void> {
  const client = ensureSupabase();

  const { error } = await client
    .schema("budget")
    .from("work_financial_plan")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

async function fetchResponsibilityCenterGlaConnections(): Promise<
  ResponsibilityCenterGLAConnectionRow[]
> {
  const client = ensureSupabase();

  let { data, error } = await client
    .schema("accounting")
    .from(RC_GLA_PRIMARY_TABLE)
    .select("*");

  if (error && error.code === "PGRST205") {
    const fallback = await client
      .schema("accounting")
      .from(RC_GLA_FALLBACK_TABLE)
      .select("*");

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data as ResponsibilityCenterGLAConnectionRow[]) || [];
}

const normalizeAccountType = (
  value: string | null | undefined,
): BudgetAccountType | null => {
  if (value === "Budgetary Accounts") return "Budgetary Accounts";
  if (value === "Financial Transactions") return "Financial Transactions";
  return null;
};

async function fetchGeneralLedgerAccountLookup(
  glaIds: string[],
): Promise<Map<string, GeneralLedgerAccountLookupRow>> {
  const client = ensureSupabase();

  if (glaIds.length === 0) return new Map();

  const { data, error } = await client
    .schema("accounting")
    .from("general_ledger_account")
    .select("id, code, description, account_type")
    .in("id", glaIds);

  if (error) throw error;

  return new Map(
    (data || []).map((row) => [row.id, row as GeneralLedgerAccountLookupRow]),
  );
}

export async function fetchBudgetGlAccountOptions(): Promise<
  BudgetMajorAccountGroupOption[]
> {
  const client = ensureSupabase();

  const { data, error } = await client
    .schema('accounting')
    .from('major_account_group')
    .select('*')
    .eq('status', true)
    .order('code', { ascending: true });

  if (error) {
    if (error.code === '42501') {
      const { data: fallbackRows, error: fallbackError } = await client
        .schema('budget')
        .from('work_financial_plan')
        .select('mag_id')
        .order('mag_id', { ascending: true });

      if (fallbackError) throw fallbackError;

      const uniqueMagIds = [...new Set(((fallbackRows as Array<{ mag_id: string }> | null) || [])
        .map((row) => String(row.mag_id || '').trim())
        .filter(Boolean))];

      return uniqueMagIds.map((magId) => ({
        id: magId,
        accountType: 'Budgetary Accounts' as BudgetAccountType,
        code: 'MAG',
        description: magId,
        label: `Major Account Group (${magId})`,
      }));
    }

    throw error;
  }

  return (data || [])
    .map((row) => ({
      id: row.id,
      accountType: 'Budgetary Accounts' as BudgetAccountType,
      code: row.code,
      description: row.description,
      label: `${row.code} — ${row.description}`,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function fetchBudgetPendingDetails(): Promise<
  BudgetPendingDetailRow[]
> {
  const client = ensureSupabase();

  const { data, error } = await client
    .schema("budget")
    .from("pending_details")
    .select(
      "id, created_at, editable, status, rc_gla_id, po_id, pr_id, payroll_id",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const pendingDetails =
    (data as Array<{
      id: string;
      created_at: string;
      editable?: boolean;
      status: boolean;
      rc_gla_id: string;
      po_id: string | null;
      pr_id: string | null;
      payroll_id: string | null;
    }> | null) ?? [];

  const poIds = [
    ...new Set(pendingDetails.map((row) => row.po_id).filter(Boolean)),
  ] as string[];
  const prIds = [
    ...new Set(pendingDetails.map((row) => row.pr_id).filter(Boolean)),
  ] as string[];
  const payrollIds = [
    ...new Set(pendingDetails.map((row) => row.payroll_id).filter(Boolean)),
  ] as string[];

  const [poResult, prResult, payrollResult] = await Promise.all([
    poIds.length
      ? client
          .schema("bac")
          .from("purchase_order")
          .select("po_id, po_no, po_total_amount")
          .in("po_id", poIds)
      : Promise.resolve({ data: [], error: null }),
    prIds.length
      ? client
          .schema("gse")
          .from("purchase_request")
          .select("pr_id, pr_no, pr_total_amount")
          .in("pr_id", prIds)
      : Promise.resolve({ data: [], error: null }),
    payrollIds.length
      ? client
          .schema("hr")
          .from("payroll")
          .select("id, period_name, total_amount")
          .in("id", payrollIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (poResult.error) throw poResult.error;
  if (prResult.error) throw prResult.error;
  if (payrollResult.error) throw payrollResult.error;

  const poLookup = new Map(
    ((poResult.data as BacPurchaseOrderRow[] | null) ?? []).map((row) => [
      row.po_id,
      row,
    ]),
  );
  const prLookup = new Map(
    ((prResult.data as GsePurchaseRequestRow[] | null) ?? []).map((row) => [
      row.pr_id,
      row,
    ]),
  );
  const payrollLookup = new Map(
    ((payrollResult.data as HrPayrollRow[] | null) ?? []).map((row) => [
      row.id,
      row,
    ]),
  );

  return pendingDetails.map((row) => {
    if (row.po_id) {
      const po = poLookup.get(row.po_id);
      return {
        ...row,
        source_type: "purchase_order" as const,
        source_id: row.po_id,
        source_label: po?.po_no ?? row.po_id,
        amount: Number(po?.po_total_amount) || 0,
      };
    }

    if (row.pr_id) {
      const pr = prLookup.get(row.pr_id);
      return {
        ...row,
        source_type: "purchase_request" as const,
        source_id: row.pr_id,
        source_label: pr?.pr_no ?? row.pr_id,
        amount: Number(pr?.pr_total_amount) || 0,
      };
    }

    if (row.payroll_id) {
      const payroll = payrollLookup.get(row.payroll_id);
      return {
        ...row,
        source_type: "payroll" as const,
        source_id: row.payroll_id,
        source_label: payroll?.period_name ?? row.payroll_id,
        amount: Number(payroll?.total_amount) || 0,
      };
    }

    return {
      ...row,
      source_type: "unknown" as const,
      source_id: null,
      source_label: "Unlinked",
      amount: 0,
    };
  });
}

export async function updateBudgetPendingDetailStatus(
  id: string,
  status: boolean,
): Promise<BudgetPendingDetailRow> {
  const client = ensureSupabase();

  const { data, error } = await client
    .schema("budget")
    .from("pending_details")
    .update({ status })
    .eq("id", id)
    .select(
      "id, created_at, editable, status, rc_gla_id, po_id, pr_id, payroll_id",
    )
    .single();

  if (error) throw error;
  const row = data as {
    id: string;
    created_at: string;
    editable?: boolean;
    status: boolean;
    rc_gla_id: string;
    po_id: string | null;
    pr_id: string | null;
    payroll_id: string | null;
  };

  const sourceId = row.po_id ?? row.pr_id ?? row.payroll_id;

  return {
    ...row,
    source_type: "unknown",
    source_id: sourceId,
    source_label: sourceId ?? "Unlinked",
    amount: 0,
  };
}

export async function fetchBudgetPurchaseOrderLookup(
  poIds: string[],
): Promise<Map<string, string>> {
  const client = ensureSupabase();

  if (poIds.length === 0) return new Map();

  const { data, error } = await client
    .schema("bac")
    .from("purchase_order")
    .select("po_id, po_no")
    .in("po_id", poIds);

  if (error) throw error;

  return new Map(
    (data || []).map((row) => [
      row.po_id as string,
      (row.po_no as string | null) || row.po_id,
    ]),
  );
}

export async function fetchBudgetTransactionRecords(): Promise<
  BudgetTransactionRecordRow[]
> {
  const client = ensureSupabase();

  const { data, error } = await client
    .schema("budget")
    .from("transaction_records")
    .select(
      "id, created_at, module_name, action_type, entity_id, description, actor_id, actor_name, metadata",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as BudgetTransactionRecordRow[]) || [];
}

export async function createBudgetTransactionRecord(
  payload: CreateBudgetTransactionRecordInput,
): Promise<BudgetTransactionRecordRow> {
  const client = ensureSupabase();

  const { data, error } = await client
    .schema("budget")
    .from("transaction_records")
    .insert(payload)
    .select(
      "id, created_at, module_name, action_type, entity_id, description, actor_id, actor_name, metadata",
    )
    .single();

  if (error) throw error;

  return data as BudgetTransactionRecordRow;
}

export async function transferBudgetAllocation(
  payload: TransferBudgetInput,
): Promise<TransferBudgetResult> {
  const client = ensureSupabase();

  const { data, error } = await client.schema("budget").rpc("transfer_budget", {
    p_from_account_detail_id: payload.fromAccountDetailId,
    p_to_account_detail_id: payload.toAccountDetailId,
    p_amount: payload.amount,
    p_actor_id: payload.actorId ?? null,
    p_actor_name: payload.actorName ?? null,
    p_reason: payload.reason ?? null,
  });

  if (error) throw error;

  const result = data as TransferBudgetResult | null;
  if (!result?.success) {
    throw new Error("Budget transfer failed.");
  }

  return result;
}
