import { supabase, isSupabaseConfigured } from "./supabase";
import type { DisbursementVoucher } from "@/types/gse.types";

type DisbursementVoucherRow = {
  uuid: string;
  user_facility: string | null;
  pq: string | null;
  payee: string | null;
  desc: string | null;
  amount: number | null;
  dv_no: string | null;
  editable: boolean | null;
  status: boolean | null;
  mode_of_payment: string | null;
};

const mapRowToVoucher = (row: DisbursementVoucherRow): DisbursementVoucher => ({
  uuid: row.uuid,
  user_facility: row.user_facility,
  pq: row.pq,
  payee: row.payee,
  desc: row.desc ?? "",
  amount: Number(row.amount ?? 0),
  dv_no: row.dv_no ?? "",
  editable: row.editable ?? true,
  status: row.status ?? true,
  mode_of_payment: row.mode_of_payment ?? "CHECK",
  id: row.uuid,
});

export const fetchDisbursementVouchers = async (): Promise<DisbursementVoucher[]> => {
  if (!isSupabaseConfigured() || !supabase) return [];

  const client = supabase as NonNullable<typeof supabase>;
  const { data, error } = await client
    .schema("office")
    .from("disbursement_voucher")
      .select(
        "uuid, user_facility, pq, payee, \"desc\", amount, dv_no, editable, status, mode_of_payment",
      )
    .order("uuid", { ascending: false });

  if (error) {
    console.error("Error fetching disbursement vouchers:", error);
    return [];
  }

  const rows = (data ?? []) as DisbursementVoucherRow[];
  return rows.map(mapRowToVoucher);
};

export const createDisbursementVoucher = async (payload: {
  user_facility?: string | null;
  pq?: string | null;
  payee?: string | null;
  desc: string;
  amount: number;
  mode_of_payment?: string;
}): Promise<{ success: boolean; voucher?: DisbursementVoucher; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const client = supabase as NonNullable<typeof supabase>;
  const { data, error } = await client
    .schema("office")
    .from("disbursement_voucher")
    .insert([
      {
        user_facility: payload.user_facility || null,
        pq: payload.pq || null,
        payee: payload.payee || null,
        "desc": payload.desc,
        amount: payload.amount,
        editable: true,
        status: true,
        mode_of_payment: payload.mode_of_payment || "CHECK",
      },
    ])
    .select(
      "uuid, user_facility, pq, payee, \"desc\", amount, dv_no, editable, status, mode_of_payment",
    )
    .single();

  if (error) {
    console.error("Error creating disbursement voucher:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "No data returned from Supabase" };
  }

  return { success: true, voucher: mapRowToVoucher(data as DisbursementVoucherRow) };
};

export const updateDisbursementVoucher = async (
  uuid: string,
  payload: {
    desc?: string;
    amount?: number;
    mode_of_payment?: string;
  },
): Promise<{ success: boolean; voucher?: DisbursementVoucher; error?: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  const updatePayload: Record<string, unknown> = {};
  if (payload.desc !== undefined) updatePayload["desc"] = payload.desc;
  if (payload.amount !== undefined) updatePayload["amount"] = payload.amount;
  if (payload.mode_of_payment !== undefined)
    updatePayload["mode_of_payment"] = payload.mode_of_payment;

  if (!Object.keys(updatePayload).length) {
    return { success: false, error: "No fields provided for update" };
  }

  const client = supabase as NonNullable<typeof supabase>;
  const { data, error } = await client
    .schema("office")
    .from("disbursement_voucher")
    .update(updatePayload)
    .eq("uuid", uuid)
    .select(
      "uuid, user_facility, pq, payee, \"desc\", amount, dv_no, editable, status, mode_of_payment",
    )
    .single();

  if (error) {
    console.error("Error updating disbursement voucher:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "No data returned from Supabase" };
  }

  return { success: true, voucher: mapRowToVoucher(data as DisbursementVoucherRow) };
};
