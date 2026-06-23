import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle, FileText, Hammer, Link, Plus, Pencil } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { DataTable, PageHeader, PrimaryButton, StatCard, StatsRow } from "@/components/ui";
import { formatCurrency, toErrorMessage } from "@/modules/budget/components/budgetUtils";
import {
  fetchDisbursementVouchers,
  createDisbursementVoucher,
  updateDisbursementVoucher,
} from "@/services/disbursementVoucherService";
import { fetchResponsibilityCenters, fetchRcGlaContraCode } from "@/services/gseService";
import {
  fetchSuppliers,
  createSupplier,
  fetchPurchaseOrders,
  fetchPurchaseOrderDetail,
} from "@/services/bacService";
import type {
  DisbursementVoucher,
  ResponsibilityCenter,
  Supplier,
  PurchaseOrder,
  PurchaseOrderDetail,
} from "@/types/gse.types";

const disbursementTypeOptions = [
  { value: "PURCHASE_ORDER", label: "Purchase Order" },
  { value: "OTHERS", label: "Others" },
] as const;

const paymentModeOptions = [
  { value: "CHECK", label: "Check" },
  { value: "CASH", label: "Cash" },
  { value: "OTHERS", label: "Others" },
] as const;

type DisbursementType = (typeof disbursementTypeOptions)[number]["value"];
type PaymentMode = (typeof paymentModeOptions)[number]["value"];

export default function DisbursementVoucher() {
  const [vouchers, setVouchers] = useState<DisbursementVoucher[]>([]);
  const [responsibilityCenters, setResponsibilityCenters] = useState<ResponsibilityCenter[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeVoucher, setActiveVoucher] = useState<DisbursementVoucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [disbursementType, setDisbursementType] = useState<DisbursementType>(
    disbursementTypeOptions[0].value,
  );
  const [selectedPoId, setSelectedPoId] = useState("");
  const [poDetail, setPoDetail] = useState<PurchaseOrderDetail | null>(null);
  const [isPoDetailLoading, setIsPoDetailLoading] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(paymentModeOptions[0].value);
  const [otherSupplierId, setOtherSupplierId] = useState("");
  const [otherRcId, setOtherRcId] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [newSupplierTin, setNewSupplierTin] = useState("");
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [supplierCreateError, setSupplierCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editMode, setEditMode] = useState<PaymentMode>(paymentModeOptions[0].value);
  const [isUpdateSaving, setIsUpdateSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [rcGlaContraCode, setRcGlaContraCode] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [voucherRows, centers, supplierRows, poRows] = await Promise.all([
          fetchDisbursementVouchers(),
          fetchResponsibilityCenters(),
          fetchSuppliers(),
          fetchPurchaseOrders(),
        ]);

        setVouchers(voucherRows);
        setResponsibilityCenters(centers);
        setSuppliers(supplierRows);
        setPurchaseOrders(poRows);
      } catch (error) {
        setLoadError(toErrorMessage(error, "Unable to load disbursement vouchers."));
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (disbursementType !== "PURCHASE_ORDER") {
      setSelectedPoId("");
      setPoDetail(null);
      setIsPoDetailLoading(false);
      return;
    }

    if (!selectedPoId) {
      setPoDetail(null);
      return;
    }

    setIsPoDetailLoading(true);
    void fetchPurchaseOrderDetail(selectedPoId)
      .then((detail) => setPoDetail(detail))
      .catch((error) => {
        console.error("Error loading PO detail:", error);
        setPoDetail(null);
      })
      .finally(() => setIsPoDetailLoading(false));
  }, [disbursementType, selectedPoId]);

  const centerLookup = useMemo(() => {
    const map = new Map<string, ResponsibilityCenter>();
    for (const center of responsibilityCenters) {
      map.set(center.id, center);
    }
    return map;
  }, [responsibilityCenters]);

  const supplierLookup = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const supplier of suppliers) {
      map.set(supplier.s_id, supplier);
    }
    return map;
  }, [suppliers]);

  const purchaseOrderLookup = useMemo(() => {
    const map = new Map<string, PurchaseOrder>();
    for (const po of purchaseOrders) {
      map.set(po.po_id, po);
    }
    return map;
  }, [purchaseOrders]);

  const poSupplierDetail = poDetail?.winning_b_id
    ? supplierLookup.get(poDetail.winning_b_id)
    : null;

  const poFacilityDetail = poDetail?.rc_id ? centerLookup.get(poDetail.rc_id) : null;

  const poAmount = poDetail?.po_total_amount ?? 0;

  const isPurchaseOrderFlow = disbursementType === "PURCHASE_ORDER";

  const selectedOtherSupplier = otherSupplierId
    ? supplierLookup.get(otherSupplierId) ?? null
    : null;

  const isFormValid = isPurchaseOrderFlow
    ? Boolean(selectedPoId && poDetail)
    : Boolean(otherSupplierId && otherRcId && otherAmount);

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim() || isCreatingSupplier) return;

    setIsCreatingSupplier(true);
    setSupplierCreateError(null);

    const result = await createSupplier(
      newSupplierName,
      newSupplierAddress,
      undefined,
      newSupplierTin,
    );

    if (!result.success || !result.s_id) {
      setSupplierCreateError(result.error ?? "Unable to create supplier");
      setIsCreatingSupplier(false);
      return;
    }

    const refreshedSuppliers = await fetchSuppliers();
    setSuppliers(refreshedSuppliers);
    setOtherSupplierId(result.s_id);
    setNewSupplierName("");
    setNewSupplierAddress("");
    setNewSupplierTin("");
    setIsSupplierDialogOpen(false);
    setIsCreatingSupplier(false);
  };

  const handleSave = async () => {
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    type CreateVoucherPayload = {
      type: DisbursementType;
      paymentMode: PaymentMode;
      description: string;
      payee: string | null;
      user_facility: string | null;
      amount: number;
      pq?: string;
    };

    const payload: CreateVoucherPayload = {
      type: disbursementType,
      paymentMode,
      description: descriptionValue.trim(),
      payee: isPurchaseOrderFlow ? poSupplierDetail?.s_id ?? null : otherSupplierId || null,
      user_facility: isPurchaseOrderFlow ? poFacilityDetail?.id ?? null : otherRcId || null,
      amount: isPurchaseOrderFlow ? poAmount : Number(otherAmount) || 0,
      pq: isPurchaseOrderFlow ? selectedPoId : undefined,
    };

    const result = await createDisbursementVoucher({
      user_facility: payload.user_facility,
      pq: payload.pq,
      payee: payload.payee,
      desc: payload.description,
      amount: payload.amount,
      mode_of_payment: payload.paymentMode,
    });

    if (!result.success) {
      setSaveError(result.error ?? "Unable to save voucher");
      setIsSaving(false);
      return;
    }

    const savedVoucher = result.voucher;
    if (savedVoucher) {
      setVouchers((prev) => [savedVoucher, ...prev]);
    }

    setSaveSuccess(true);
    setDescriptionValue("");
    setSelectedPoId("");
    setPoDetail(null);
    setOtherSupplierId("");
    setOtherRcId("");
    setOtherAmount("");
    setIsSaving(false);
  };

  const loadRcGlaContraCode = useCallback(async (rcId?: string) => {
    setRcGlaContraCode(null);
    if (!rcId) return;
    const code = await fetchRcGlaContraCode(rcId);
    setRcGlaContraCode(code);
  }, []);

  const openVoucherModal = useCallback(
    (voucher: DisbursementVoucher, edit = false) => {
      setActiveVoucher(voucher);
      setUpdateError(null);
      setEditDescription(voucher.desc);
      setEditAmount(voucher.amount.toString());
      const paymentOption = paymentModeOptions.find((option) => option.value === voucher.mode_of_payment);
      setEditMode(paymentOption?.value ?? paymentModeOptions[0].value);
      setIsModalEditing(edit && voucher.editable);
      void loadRcGlaContraCode(voucher.user_facility ?? undefined);
    },
    [loadRcGlaContraCode],
  );

  const handleViewVoucher = useCallback(
    (voucher: DisbursementVoucher) => openVoucherModal(voucher, false),
    [openVoucherModal],
  );

  const formatDisplayId = (value: string) => (value ? value.toUpperCase() : "—");
  const handleEditVoucher = useCallback(
    (voucher: DisbursementVoucher) => {
      if (!voucher.editable) return;
      openVoucherModal(voucher, true);
    },
    [openVoucherModal],
  );

  const isPurchaseOrderVoucher = Boolean(activeVoucher?.pq);

  const handleUpdateVoucher = async () => {
    if (!activeVoucher) return;
    setIsUpdateSaving(true);
    setUpdateError(null);

    const updatePayload: { desc: string; mode_of_payment: string; amount?: number } = {
      desc: editDescription.trim(),
      mode_of_payment: editMode,
    };
    if (!isPurchaseOrderVoucher) {
      updatePayload.amount = Number(editAmount) || 0;
    }

    const result = await updateDisbursementVoucher(activeVoucher.uuid, updatePayload);

    setIsUpdateSaving(false);

    if (!result.success || !result.voucher) {
      setUpdateError(result.error ?? "Unable to update voucher");
      return;
    }

    setVouchers((prev) =>
      prev.map((voucher) => (voucher.uuid === result.voucher?.uuid ? result.voucher : voucher)),
    );
    setActiveVoucher(result.voucher);
    setIsModalEditing(false);
  };

  const filteredVouchers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return vouchers.filter((voucher) => {
      const facility = centerLookup.get(voucher.user_facility ?? "");
      const supplier = supplierLookup.get(voucher.payee ?? "");
      const po = voucher.pq ? purchaseOrderLookup.get(voucher.pq) : null;
      const matchesSearch =
        !query ||
        voucher.dv_no.toLowerCase().includes(query) ||
        voucher.uuid.toLowerCase().includes(query) ||
        voucher.desc.toLowerCase().includes(query) ||
        facility?.description?.toLowerCase().includes(query) ||
        supplier?.description?.toLowerCase().includes(query) ||
        po?.po_no?.toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [searchQuery, vouchers, centerLookup, supplierLookup, purchaseOrderLookup]);

  const totalAmount = useMemo(
    () => vouchers.reduce((sum, voucher) => sum + voucher.amount, 0),
    [vouchers],
  );

  const linkedToPO = useMemo(
    () => vouchers.filter((voucher) => Boolean(voucher.pq)).length,
    [vouchers],
  );

  const stats = useMemo(() => {
    return [
      {
        label: "Total vouchers",
        value: vouchers.length,
        icon: <FileText className="w-5 h-5" />,
      },
      {
        label: "Linked to PO",
        value: linkedToPO,
        icon: <Link className="w-5 h-5" />,
      },
      {
        label: "Unlinked",
        value: vouchers.length - linkedToPO,
        icon: <Hammer className="w-5 h-5" />,
      },
      {
        label: "Total amount",
        value: formatCurrency(totalAmount),
        icon: <CheckCircle className="w-5 h-5" />,
      },
    ];
  }, [linkedToPO, totalAmount, vouchers.length]);

  type DisbursementVoucherColumn = {
    key: keyof DisbursementVoucher | "actions";
    header: string;
    render?: (item: DisbursementVoucher) => ReactNode;
    className?: string;
  };

    const columns = useMemo<DisbursementVoucherColumn[]>(
      () => [
      {
        key: "dv_no",
        header: "DV No.",
        render: (item: DisbursementVoucher) => (
          <p className="text-sm font-semibold text-foreground">
            {formatDisplayId(item.dv_no)}
          </p>
        ),
      },
      {
        key: "user_facility",
        header: "Facility",
        className: "min-w-[180px]",
        render: (item: DisbursementVoucher) => {
          const facility = centerLookup.get(item.user_facility ?? "");
          return (
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {facility?.rc_code ?? "—"}
              </p>
              <p className="text-xs text-muted">{facility?.description ?? "Independent"}</p>
            </div>
          );
        },
      },
      {
        key: "payee",
        header: "Payee",
        render: (item: DisbursementVoucher) => (
          <p className="text-sm text-foreground">
            {supplierLookup.get(item.payee ?? "")?.description ?? "—"}
          </p>
        ),
      },
        {
          key: "mode_of_payment",
          header: "Payment mode",
          render: (item: DisbursementVoucher) => (
            <p className="text-sm font-semibold uppercase text-foreground">
              {item.mode_of_payment ?? "—"}
            </p>
          ),
        },
      {
        key: "desc",
        header: "Description",
        render: (item: DisbursementVoucher) => (
          <p className="text-sm text-muted truncate">{item.desc || "—"}</p>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        className: "text-right",
        render: (item: DisbursementVoucher) => (
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(item.amount)}
          </span>
        ),
      },
      {
        key: "pq",
        header: "Purchase Order",
        className: "text-right",
        render: (item: DisbursementVoucher) => (
          <p className="text-sm text-foreground">
            {purchaseOrderLookup.get(item.pq ?? "")?.po_no ?? "—"}
          </p>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (item: DisbursementVoucher) => (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="text-sm font-semibold text-success hover:underline"
                onClick={() => handleViewVoucher(item)}
            >
              View
            </button>
            <button
              type="button"
              disabled={!item.editable}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition ${
                item.editable ? "text-success hover:border-success" : "border-border text-muted"
              } ${!item.editable ? "cursor-not-allowed opacity-60" : ""}`}
              onClick={() => handleEditVoucher(item)}
              aria-label={item.editable ? "Edit voucher" : "Edit disabled"}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [centerLookup, purchaseOrderLookup, supplierLookup, handleEditVoucher, handleViewVoucher],
  );

    const selectedFacility = activeVoucher
      ? centerLookup.get(activeVoucher.user_facility ?? "")
      : null;
    const selectedSupplier = activeVoucher
      ? supplierLookup.get(activeVoucher.payee ?? "")
      : null;
    const selectedPO = activeVoucher
      ? purchaseOrderLookup.get(activeVoucher.pq ?? "")
      : null;
    const voucherMode = isModalEditing && activeVoucher
      ? editMode
      : activeVoucher?.mode_of_payment ?? paymentModeOptions[0].value;
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Disbursement Vouchers"
        subtitle="Track disbursement requests issued by the office"
        icon={<FileText className="w-6 h-6" />}
      />

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Disbursement type
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
              value={disbursementType}
              onChange={(event) => setDisbursementType(event.target.value as DisbursementType)}
            >
              {disbursementTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Payment mode
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value as PaymentMode)}
            >
              {paymentModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preparing</p>
            <p className="text-sm text-foreground">Disbursement voucher for MyOffice</p>
          </div>
        </div>

        {isPurchaseOrderFlow && (
          <div className="space-y-4">
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Purchase order
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                value={selectedPoId}
                onChange={(event) => setSelectedPoId(event.target.value)}
              >
                <option value="">Select a purchase order</option>
                {purchaseOrders.map((po) => (
                  <option key={po.po_id} value={po.po_id}>
                    {po.po_no}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted">Payee</p>
                <p className="text-sm text-foreground">
                  {isPoDetailLoading ? "Loading..." : poSupplierDetail?.description ?? "—"}
                </p>
                {poSupplierDetail?.s_code && (
                  <p className="text-xs text-muted">{poSupplierDetail.s_code}</p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted">Address</p>
                <p className="text-sm text-foreground">
                  {isPoDetailLoading ? "Loading..." : poSupplierDetail?.address ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted">TIN</p>
                <p className="text-sm text-foreground">
                  {isPoDetailLoading ? "Loading..." : poSupplierDetail?.tin ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted">Responsibility center</p>
                <p className="text-sm text-foreground">
                  {isPoDetailLoading ? "Loading..." : poFacilityDetail?.description ?? "—"}
                </p>
                {poFacilityDetail?.rc_code && (
                  <p className="text-xs text-muted">{poFacilityDetail.rc_code}</p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-background p-4 space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted">Amount</p>
                <p className="text-sm font-semibold text-foreground">
                  {isPoDetailLoading ? "Loading..." : formatCurrency(poAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isPurchaseOrderFlow && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
              <div className="flex items-center justify-between gap-2">
                <span>Payee</span>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierCreateError(null);
                    setIsSupplierDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:border-success"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                value={otherSupplierId}
                onChange={(event) => setOtherSupplierId(event.target.value)}
              >
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.s_id} value={supplier.s_id}>
                    {supplier.description}
                  </option>
                ))}
              </select>
            </div>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Address
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                value={selectedOtherSupplier?.address ?? ""}
                readOnly
                placeholder="Supplier address"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
              TIN
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                value={selectedOtherSupplier?.tin ?? ""}
                readOnly
                placeholder="Supplier TIN"
              />
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Responsibility center
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                value={otherRcId}
                onChange={(event) => setOtherRcId(event.target.value)}
              >
                <option value="">Select a responsibility center</option>
                {responsibilityCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.rc_code} — {center.description}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Amount
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                value={otherAmount}
                onChange={(event) => setOtherAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted">Description</label>
          <textarea
            className="w-full min-h-[96px] rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
            value={descriptionValue}
            onChange={(event) => setDescriptionValue(event.target.value)}
            placeholder="Describe what the voucher is for"
          />
        </div>

        <div className="flex justify-end pt-2">
          <PrimaryButton onClick={handleSave} disabled={!isFormValid || isSaving}>
            {isSaving ? "Saving..." : "Save voucher"}
          </PrimaryButton>
        </div>
        {saveError && (
          <p className="text-sm text-danger text-right">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="text-sm text-success text-right">Voucher saved successfully.</p>
        )}
      </div>

      {loadError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}

      <StatsRow>
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </StatsRow>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Disbursement log</p>
            <p className="text-xs text-muted">Showing recent vouchers across all offices</p>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DV ID, facility, payee, description, PO"
            className="w-60 rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted focus:border-success focus:outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-success" />
            Loading disbursement vouchers...
          </div>
        ) : (
          <DataTable
            data={filteredVouchers}
            columns={columns}
            emptyMessage="No disbursement vouchers match the current filters."
            rowsPerPage={6}
          />
        )}
      </div>

      <Dialog.Root
        open={isSupplierDialogOpen}
        onOpenChange={(isOpen) => {
          setIsSupplierDialogOpen(isOpen);
          if (!isOpen) {
            setSupplierCreateError(null);
            setIsCreatingSupplier(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Create supplier</h3>
              <p className="text-sm text-muted">Add a supplier for disbursement type Others.</p>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Supplier name
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                  value={newSupplierName}
                  onChange={(event) => setNewSupplierName(event.target.value)}
                  placeholder="Enter supplier name"
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
                Address
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                  value={newSupplierAddress}
                  onChange={(event) => setNewSupplierAddress(event.target.value)}
                  placeholder="Street, brgy, city"
                />
              </label>
              <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
                TIN
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
                  value={newSupplierTin}
                  onChange={(event) => setNewSupplierTin(event.target.value)}
                  placeholder="Enter TIN"
                />
              </label>
            </div>

            {supplierCreateError && (
              <p className="text-sm text-danger">{supplierCreateError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:border-success"
                onClick={() => setIsSupplierDialogOpen(false)}
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handleCreateSupplier}
                disabled={!newSupplierName.trim() || isCreatingSupplier}
              >
                {isCreatingSupplier ? "Creating..." : "Create supplier"}
              </PrimaryButton>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(activeVoucher)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setActiveVoucher(null);
            setIsModalEditing(false);
            setUpdateError(null);
            setRcGlaContraCode(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          {activeVoucher && (
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface shadow-2xl">
              <div className="flex flex-col border border-black bg-white">
                <div className="flex flex-col border-b border-black px-4 py-2 text-center text-[12px] font-semibold tracking-wide text-neutral-800">
                  <span>Republic of the Philippines</span>
                  <span className="text-lg uppercase">PROVINCE OF AGUSAN DEL NORTE</span>
                  <span>Capitol, Butuan City</span>
                </div>
                <div className="flex items-center justify-between border-b border-black px-4 py-3">
                  <div>
                    <h3 className="text-2xl font-bold text-neutral-900">Disbursement Voucher</h3>
                  </div>
                  <div className="text-right text-[12px] font-semibold">
                    No. <span className="font-bold">{formatDisplayId(activeVoucher.dv_no)}</span>
                  </div>
                </div>
                <div className="border border-black text-[11px]">
                  <div className="grid grid-cols-[150px_1fr_1fr_1fr] border-b border-black">
                    <div className="border-r border-black px-4 py-2 text-[10px] uppercase">
                      <div className="text-[10px] uppercase">Mode of Payment</div>
                      {isModalEditing ? (
                        <select
                          className="mt-2 w-full rounded border border-border bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-900"
                          value={editMode}
                          onChange={(event) => setEditMode(event.target.value as PaymentMode)}
                        >
                          {paymentModeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm font-semibold uppercase text-foreground">{voucherMode}</div>
                      )}
                    </div>
                    {paymentModeOptions.map((option) => (
                      <div key={option.value} className="border-r border-black px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-3 rounded-sm border border-black ${
                              voucherMode === option.value ? "bg-neutral-900" : ""
                            }`}
                          />
                          <span className="text-[10px] uppercase">{option.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-[180px_1fr_1fr] border-b border-black">
                    <div className="border-r border-black px-4 py-2">
                      <p className="text-[10px] uppercase text-neutral-600">Payee</p>
                      <p className="text-sm font-semibold text-neutral-900">{selectedSupplier?.description ?? "—"}</p>
                    </div>
                    <div className="border-r border-black px-4 py-2">
                      <p className="text-[10px] uppercase text-neutral-600">TIN / Employee No.</p>
                      <p className="text-sm text-neutral-900">{selectedSupplier?.tin ?? "—"}</p>
                    </div>
                    <div className="px-4 py-2">
                      <p className="text-[10px] uppercase text-neutral-600">Obligation Request No.</p>
                      <p className="text-sm font-semibold text-neutral-900">{selectedPO?.po_no ?? "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-b border-black text-[11px]">
                    <div className="border-r border-black px-4 py-2">
                      <p className="text-[10px] uppercase text-neutral-600">Address</p>
                      <p className="text-sm text-neutral-900">{selectedSupplier?.address ?? "—"}</p>
                    </div>
                    <div className="px-4 py-2 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 text-center">Responsibility Center</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase text-neutral-600">Office/Unit/Project</p>
                          <p className="text-sm text-neutral-900">{selectedFacility?.description ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-neutral-600">Code</p>
                          <p className="text-sm text-neutral-900">{selectedFacility?.rc_code ?? "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1.5fr_1fr] px-4 py-3 text-[12px]">
                    <div className="border-r border-black pr-4 flex flex-col gap-3">
                      <p className="text-[10px] uppercase text-neutral-600 text-center font-bold">Explanation</p>
                      {isModalEditing ? (
                        <textarea
                          className="min-h-[140px] w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-neutral-900 focus:border-success focus:outline-none"
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      ) : (
                        <div className="min-h-[140px]  p-3 text-sm">
                          <p className="font-semibold text-neutral-900">{activeVoucher.desc || "—"}</p>
                        </div>
                      )}
                      {selectedFacility?.rc_code ? (
                        <div className="mt-2 rounded-lg bg-success/10 px-3 py-2 text-center text-sm font-bold uppercase text-success">
                          {rcGlaContraCode
                            ? `${selectedFacility.rc_code}-${rcGlaContraCode}`
                            : selectedFacility.rc_code}
                        </div>
                      ) : (
                        <p className="mt-2 text-center text-[10px] text-neutral-500">—</p>
                      )}
                    </div>
                    <div className="pl-4 text-right flex flex-col gap-3">
                      <p className="text-[10px] uppercase text-neutral-600 text-center font-bold">Amount</p>
                      {isModalEditing ? (
                        isPurchaseOrderVoucher ? (
                          <div>
                            <p className="text-xl font-semibold text-neutral-900">
                              {formatCurrency(activeVoucher.amount)}
                            </p>
                            <p className="text-xs uppercase tracking-widest text-neutral-600">
                              Locked by purchase order
                            </p>
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="rounded-md border border-border bg-background px-3 py-2 text-xl font-semibold text-neutral-900 focus:border-success focus:outline-none"
                            value={editAmount}
                            onChange={(event) => setEditAmount(event.target.value)}
                          />
                        )
                      ) : (
                        <p className="text-xl font-semibold text-neutral-900">
                          {formatCurrency(activeVoucher.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                  {isModalEditing && (
                    <div className="border-t border-black px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-widest text-success">Edit mode</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-sm font-semibold text-neutral-600"
                            onClick={() => activeVoucher && openVoucherModal(activeVoucher, false)}
                          >
                            Cancel
                          </button>
                          <PrimaryButton onClick={handleUpdateVoucher} disabled={isUpdateSaving}>
                            {isUpdateSaving ? "Saving..." : "Save changes"}
                          </PrimaryButton>
                        </div>
                      </div>
                      {updateError && <p className="pt-2 text-xs text-danger">{updateError}</p>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 border-b border-black px-4 py-4 text-[11px] uppercase">
                  <div className="border-r border-black pr-4">
                    <p className="font-semibold">Certified</p>
                    <p className="text-[10px] text-neutral-600">Allotment obligated for the purpose as indicated above</p>
                    <p className="mt-4 text-[10px]">Signature: ____________________</p>
                    <p className="text-[10px] font-semibold">JOCELYN D. ITIM-JUPITER</p>
                    <p className="text-[10px] text-neutral-500">Provincial Accountant</p>
                  </div>
                  <div className="pl-4">
                    <p className="font-semibold">Certified</p>
                    <p className="text-[10px] text-neutral-600">Funds Available</p>
                    <p className="mt-4 text-[10px]">Signature: ____________________</p>
                    <p className="text-[10px] font-semibold">MA. CECILE A. OKUT</p>
                    <p className="text-[10px] text-neutral-500">Acting Prov’l Treasurer</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 px-4 py-4 text-[11px] uppercase">
                  <div className="border-r border-black pr-4">
                    <p className="font-semibold">Approved for payment</p>
                    <p className="mt-4 text-[10px]">Signature: ____________________</p>
                    <p className="text-[10px] font-semibold">MA. ANGELICA ROSEDELL M. AMANTE</p>
                    <p className="text-[10px] text-neutral-500">Provincial Governor</p>
                  </div>
                  <div className="pl-4">
                    <p className="font-semibold">Received payment</p>
                    <p className="text-[10px]">Check No.: ______</p>
                    <p className="text-[10px]">Bank Name: ______</p>
                    <p className="text-[10px]">Date: ______</p>
                    <p className="mt-4 text-[10px]">Signature: ____________________</p>
                    <p className="text-[10px] font-semibold">OR/Other Docu: ______</p>
                    <p className="text-[10px]">JEV No.: ______</p>
                  </div>
                </div>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
