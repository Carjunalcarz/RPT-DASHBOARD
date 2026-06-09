# RPTAS Data Pipeline — MSSQL Migration → Approval → Order of Payment

This document traces a property record end-to-end through the Real Property Tax
Assessment System (RPTAS): from the legacy **MSSQL** source, through the two-tier
**FAAS approval** workflow, into the **reporting** tables, and finally to a
**Treasury Order of Payment (OOP)** and receipt.

> **Schema note.** RPTAS transaction data lives in the Supabase/PostgreSQL
> `rptas` schema. RBAC lives in `admin_setup`; identity/system tables in
> `public`. Two "crucial" tables carry a `dbo_` name prefix:
> `rptas.dbo_faas_records` and `rptas.dbo_properties`. The legacy SQL Server
> database `RPTAS_AGUSAN` (schema `dbo`) is **read-only** — RPTAS never writes
> back to it.

```
┌─────────────┐   read    ┌──────────────────┐  approve  ┌──────────────────┐   pay    ┌───────────────────────┐
│   MSSQL     │ ───────▶  │  FAAS draft      │ ───────▶  │  Reporting tables │ ──────▶ │  Order of Payment      │
│ RPTAS_AGUSAN│  migrate  │ dbo_faas_records │  trigger  │  rpt_property /   │   OOP   │  orders_of_payment +   │
│  (dbo, R/O) │           │  (status flow)   │   sync    │  rpt_assessment   │         │  treasury exports      │
└─────────────┘           └──────────────────┘           └──────────────────┘         └───────────────────────┘
   STAGE 1                      STAGE 2a                      STAGE 2b                        STAGE 3
```

---

## Stage 1 — Migrate from MSSQL into a FAAS draft

**Goal:** select legacy property records from MSSQL and stage them as editable
FAAS draft records in Supabase.

### Source (read-only MSSQL)
- Connection pool: [mssql.js](../express-backend/src/modules/rptas/database/mssql.js) (env: `MSSQL_*`), DB `RPTAS_AGUSAN`.
- Master read: `PropertyService.getAgusanMigrationData()` joins `dbo.RPTMAST`
  (master), `dbo.BARANGAY`, `dbo.Rptowner`, `dbo.SIGNATORY`, `dbo.MASTEXTN`,
  `dbo.RPT_TREE`. Assessment reads come from `dbo.RPT_ASS`
  ([AssessmentService.js](../express-backend/src/modules/rptas/assessment/AssessmentService.js)).
- Read endpoints (legacy alias paths): `GET /api/rptmast/RPTAS_AGUSAN`,
  `GET /api/rptmast/mastextn/:tdn`, `GET /api/rptmast/distinct/tax-beg-years`.

### Migration cart (frontend staging)
- [MigrationCartContext.tsx](../LocalGovernmentUnit/src/modules/rptas/context/MigrationCartContext.tsx) —
  selected properties persisted in `localStorage` (`rpt_migration_cart`).
- [MigrationCartPage.tsx](../LocalGovernmentUnit/src/modules/rptas/domains/migration/MigrationCartPage.tsx) —
  review cart, check which TDNs already exist in Supabase, choose a migration
  type (e.g. *General Revision*), then **Execute Bulk Migration**.

### Write (Supabase)
- Service: [FaasService.js](../express-backend/src/modules/rptas/faas/FaasService.js)
  (`saveDraft`, `bulkMigrate`) and the legacy
  [services/faasService.js](../express-backend/src/modules/rptas/services/faasService.js).
- Target table: **`rptas.dbo_faas_records`** — one row per FAAS record:
  - `id` (uuid), `tdn`, `status`, `data` (JSONB snapshot of the full MSSQL
    record + edits: `assessments[]`, `buildings[]`, `trees[]`, signatory fields),
    `created_by`, `created_at`, `updated_at`.
  - Single create → `status = 'draft'`; bulk migrate → `status = 'pending-municipal'`.
- Dedup guards: PIN immutability on revisions, duplicate-TDN check in
  `dbo_faas_records`, and an MSSQL `RPTMAST` duplicate check.
- Tracking: `rptas.migration_logs` (source TDN → target FAAS id) and
  `public."AuditLog"` (`CREATE_DRAFT` / `UPDATE_DRAFT` / `BULK_MIGRATE`).

**Flow:** `Properties UI → GET /api/rptmast/... → add to cart → POST /api/v1/faas/bulk-migrate → INSERT rptas.dbo_faas_records (+ migration_logs, AuditLog)`

---

## Stage 2a — FAAS approval workflow (two-tier)

**Goal:** route a draft through municipal then provincial assessor approval.

### Status lifecycle
```
draft ──submit──▶ pending-municipal ──municipal approve──▶ pending-provincial ──provincial approve──▶ approved
                        │                                          │
                        └── reject ─▶ rejected-municipal           └── reject ─▶ rejected-provincial
        (also: for-review, cancelled)
```

### Endpoints & services
- `PUT /api/v1/faas/:id/status` — single transition (`updateStatus`).
- `POST /api/v1/faas/batch-status` — bulk transition (`batchUpdateStatus`), used
  by the "Bulk Action" approvals. Implemented in
  [services/faasService.js](../express-backend/src/modules/rptas/services/faasService.js)
  and [faas/FaasService.js](../express-backend/src/modules/rptas/faas/FaasService.js).
- Each transition merges approver metadata into `data` JSONB:
  - → `pending-provincial` (municipal): `municipal_approver`, `municipal_approval_date`, `Rec_Approval`, `Rec_ApprovalPos`.
  - → `approved` (provincial): `provincial_approver`, `provincial_approval_date`, `Approved`, `ApprovedPos`, `SGD_APPROVED`.
- Every change is written to `public."AuditLog"`.

### UI & signatories
- Pages: `MunicipalApprovals.tsx`, `ProvincialApprovals.tsx`, `PropertyApproval.tsx`
  under [domains/approvals/pages](../LocalGovernmentUnit/src/modules/rptas/domains/approvals/pages/).
- Approver names/positions come from **Signatory Setup**
  (`rptas.setup_signatories`, `rptas.setup_signatory_templates`), filtered by
  department ("Municipal Assessor Office" / "Provincial Assessor Office").

---

## Stage 2b — Reporting sync (automatic, on approval)

When a FAAS record becomes `approved`, a PostgreSQL trigger projects it into the
reporting/master tables. Defined in
[reporting_setup.sql](../express-backend/src/modules/rptas/database/reporting_setup.sql)
(re-applied on every backend startup by
[startup.js](../express-backend/src/scripts/startup.js)).

```
UPDATE rptas.dbo_faas_records SET status='approved'
        │
        ▼  AFTER INSERT/UPDATE/DELETE trigger
trg_faas_records_reporting_sync  ──▶  rptas.trg_sync_faas_to_reporting()
        │   (fires only when status is/was 'approved')
        ▼
rptas.sync_faas_to_reporting(faas_id)
```

`sync_faas_to_reporting` (skips & deletes from `rpt_property` if the record is no
longer approved):

1. **Match or create the master property** using a confidence hierarchy:
   PIN → old TDN → new TDN → lot/block → ARP → owner-name trigram similarity
   (`similarity() ≥ 0.60`). Ambiguous matches go to **`rptas.manual_review_queue`**.
2. **Writes/updates:**
   - `rptas.dbo_properties` — master property (PIN, ARP, lot/block, current TDN/owner pointers, `last_source_record_id`).
   - `rptas.property_tdn_history` / `rptas.property_owner_history` — current + historical chains (enforce-current triggers deactivate prior rows). Columns use the `rptas.tdn_change_reason` / `rptas.owner_change_reason` enums.
   - `rptas.rpt_property` — reporting snapshot (`source_record_id` → FAAS id, `master_property_id` → `dbo_properties`).
   - `rptas.rpt_assessment` — assessment lines, rebuilt from `data->'assessments'`.
   - Dimension upserts: `rptas.owner`, `rptas.municipality`, `rptas.barangay`.

`rpt_property` carries a `payment_status` (`unpaid` / `pending` / `paid`) that
Stage 3 drives.

---

## Stage 3 — Order of Payment (Treasury)

**Goal:** bill the approved properties, collect payment, and export the record.

### Data model
- `rptas.orders_of_payment` — `id`, `order_number` (`OOP-YYYYMMDD-XXXXXX`),
  `amount`, `description`, `property_ids` (JSONB array), `status`
  (`pending`/`paid`/`cancelled`), timestamps.
- `rptas.oop_history` — audit trail (`created` / `paid` / `cancelled` / `etl_exported`), with a `payload` snapshot (payer, rates, totals, selected assessments).
- `rptas.payors` — payor registry (name, address, ID type/number, contact); used for lookup/search, linked to an OOP by **name in the description** (not an FK).
- `rptas.treasury_payment_exports` — ETL output, one row per paid property (PIN, TDN, owner, location, summed market/assessed value).

### Endpoints (treasury module)
- `POST /api/v2/oop` create · `PATCH /api/v2/oop/:id` update · `POST /api/v2/oop/:id/cancel`
  · `POST /api/v2/oop/:id/pay` mark paid · `GET /api/v2/oop/pending` · `GET /api/v2/oop/:id/history`.
- Payors: `GET /api/v2/payors/search`, `POST /api/v2/payors`, `POST /api/v2/payors/bulk`.
- Services: [OopService.js](../express-backend/src/modules/treasury/oop/OopService.js),
  [PayorService.js](../express-backend/src/modules/treasury/payors/PayorService.js),
  [treasuryEtlService.js](../express-backend/src/services/treasuryEtlService.js).

### Flow
1. **Create OOP** — [OrderOfPaymentPage.tsx](../LocalGovernmentUnit/src/modules/rptas/domains/treasury/domains/oop/pages/OrderOfPaymentPage.tsx):
   pick **unpaid** properties from `rpt_property`, select a payor, set rates
   (tax %, penalty %, per-record fee, other fees), preview, confirm.
   → `INSERT orders_of_payment (status='pending')`, `rpt_property.payment_status → 'pending'`, `oop_history: created`.
2. **Confirm payment** — [TreasuryConfirmPage.tsx](../LocalGovernmentUnit/src/modules/rptas/domains/treasury/domains/payments/pages/TreasuryConfirmPage.tsx)
   (treasury officer / admin only): review pending OOP, choose payment method,
   **Approve Payment** → `markPaid()`:
   - `treasuryEtlService.exportPaidOrder()` upserts `treasury_payment_exports` (joining `rpt_property` + `owner` + summed `rpt_assessment`).
   - `rpt_property.payment_status → 'paid'`, `orders_of_payment.status → 'paid'`, `oop_history: etl_exported, paid`.
3. **Receipt** — printable official receipt rendered from the `oop_history` snapshot.

```
rpt_property(payment_status='unpaid')
      │  create OOP
      ▼
orders_of_payment(status='pending')  +  rpt_property('pending')
      │  treasury approves → markPaid()
      ▼
treasury_payment_exports (per property)  +  orders_of_payment('paid')  +  rpt_property('paid')
      │
      ▼  printable receipt (from oop_history.payload)
```

---

## Table reference

| Schema | Table | Stage | Role |
|---|---|---|---|
| `dbo` (MSSQL) | `RPTMAST`, `RPT_ASS`, `MASTEXTN`, `RPT_TREE`, `Rptowner`, `SIGNATORY` | 1 | Legacy source (read-only) |
| `rptas` | `dbo_faas_records` | 1–2 | FAAS records + status lifecycle |
| `rptas` | `migration_logs` | 1 | MSSQL→Supabase migration tracking |
| `rptas` | `setup_signatories`, `setup_signatory_templates` | 2a | Approver signatories |
| `rptas` | `dbo_properties` | 2b | Master property (single source of truth) |
| `rptas` | `property_tdn_history`, `property_owner_history` | 2b | Current + historical TDN/owner chains |
| `rptas` | `rpt_property`, `rpt_assessment` | 2b–3 | Reporting snapshot + assessment lines |
| `rptas` | `manual_review_queue` | 2b | Ambiguous property matches for human review |
| `rptas` | `owner`, `municipality`, `barangay` | 2b | Dimension tables |
| `rptas` | `orders_of_payment`, `oop_history` | 3 | Treasury OOP + audit |
| `rptas` | `payors` | 3 | Payor registry |
| `rptas` | `treasury_payment_exports` | 3 | ETL output for paid orders |
| `public` | `AuditLog` | all | Cross-cutting audit trail |

## Key enums (in `rptas`)
- `property_status`: `active`, `archived`, `split`, `merged`
- `tdn_change_reason`: `new`, `general_revision`, `correction`, `split`, `merge`, `other`
- `owner_change_reason`: `new`, `transfer`, `inheritance`, `correction`, `other`
