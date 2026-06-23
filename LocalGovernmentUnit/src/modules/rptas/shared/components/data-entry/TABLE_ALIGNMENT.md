- **Goal**
  - Make the FAAS records table in `shared/components/data-entry` follow the same table architecture used by `domains/RPT-management` (server-side filtering + pagination + consistent field normalization).

- **What Was Aligned**
  - **SWR key pattern:** Uses a stable key prefix `['faas-records', ...]` to match the RPT-management pattern and prevent cache collisions across views.
  - **Dual backend response support:** Handles both shapes:
    - Supabase FAAS list (`{ data, pagination }`) via `listFaasRecords`
    - MSSQL RPTMAST list (`{ success, data, pagination }`) via `getRptMastDataDirect`
  - **Field normalization:** ARP is displayed as the current TDN; PIN is normalized via `cleanPin`.
  - **Status display parity:** Adds the same status date suffix behavior (e.g., `approved • <date>`) when date fields are available.
  - **Stable row IDs:** Uses stable IDs derived from `TDN` and `PIN` in MSSQL mode so selection/migration checkbox state doesn’t “jump” between renders.

- **Intentional Differences**
  - **Migration selection column:** `data-entry` includes a leading checkbox column for migration cart selection; `RPT-management` does not.
  - **Selected-row highlight:** `data-entry` keeps the emerald selection styling requested for migration workflows.

