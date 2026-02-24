# Real Property Data Entry Specification

## 1. Overview
This specification details the implementation of a comprehensive Real Property Data Entry form based on the provided SQL query schema. The system will provide a responsive web interface for creating and updating real property records, supporting complex validation, real-time calculations, and audit logging.

## 2. Architecture

### Frontend (React/TypeScript)
- **Component**: `RptDataEntryForm`
- **State Management**: Local component state (React `useState`, `useEffect`) for form data, validation errors, and reference data.
- **Validation**: Client-side validation using Zod (required fields, PIN format, numeric constraints).
- **Calculations**: `useEffect` hooks to trigger real-time updates for Area (Hectares <-> SQM) and Assessed Value (`Market Value * (Ass_Level/100)`).

### Backend (Node.js/Express)
- **Service**: `RptDataEntryService`
  - Uses `node-mssql` connection pool directly to interact with `RPTAS_AGUSAN_E` database.
  - Handles complex transactions (`BEGIN TRAN`, `MERGE`, `COMMIT`).
- **Controller**: `RptDataEntryController`
  - Validates request body.
  - Handles API responses and errors.
- **Routes**: `/api/v1/rpt-entry`
  - `GET /:tdn` - Load record.
  - `POST /` - Save (Upsert) record.
  - `GET /references` - Load lookup tables (City, Barangay, Kind, etc.).

### Database (MSSQL)
- **Source/Target Tables**: 
  - `RPTAS_AGUSAN.dbo.RPTMAST` (Main Record)
  - `RPTAS_AGUSAN.dbo.rptOWNER` (Owner Info)
  - `RPTAS_AGUSAN.dbo.RPT_ASS` (Assessment Info)
  - `RPTAS_AGUSAN.dbo.CITY` (Reference)
  - `RPTAS_AGUSAN.dbo.BARANGAY` (Reference)
- **Audit Table**: `RPT_AUDIT_LOG` (New table).

## 3. Data Dictionary & Field Mapping

| UI Label | DB Column | Table | Type | UI Control | Validation / Logic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TDN | `TDN` | RPTMAST | VARCHAR | Text (Read-Only) | Auto-filled. Primary Key. |
| PIN | `PIN` | RPTMAST | VARCHAR | Masked Input | Pattern: `99-99-999-999-99`. Unique check. |
| City | `CITY` (Code) / `DESCRIPTION` | CITY | VARCHAR | Dropdown | Populated from `CITY` table. Saves `m.CODE` to `r.CITY`. |
| Barangay | `BCODE` (Code) / `DESCRIPTION` | BARANGAY | VARCHAR | Dropdown | Populated from `BARANGAY` table. Filtered by City. Saves `b.CODE` to `r.BCODE`. |
| Owner Name | `Name` | rptOWNER | VARCHAR | Text + Autocomplete | Saves to `rptOWNER`. |
| Kind | `KIND` | RPT_ASS | VARCHAR | Combo Box | From Reference. "Add New" supported. |
| Classification | `classification` | RPT_ASS | VARCHAR | Combo Box | From Reference. "Add New" supported. |
| Sub Class | `SUB_CLASS` | RPT_ASS | VARCHAR | Combo Box | From Reference. "Add New" supported. |
| Ass. Level | `ASS_LEVEL` | RPT_ASS | DECIMAL | Numeric Input | 0-999. Triggers Ass_Value calc. |
| Tax Status | `TAXABILITY` | RPT_ASS | BIT | Radio Group | Taxable (1), Exempt (0). |
| Area | `Area` | RPT_ASS | DECIMAL | Numeric Input | > 0. Converts H <-> SQM based on Measurement. |
| Measurement | `IF_DEFAULT` | RPT_ASS | BIT | Radio Group | Hectares (1), SQM (0). |
| Market Value | `Market_val` | RPT_ASS | MONEY | Currency Input | Triggers Ass_Value calc. |
| Assessed Value | `Ass_value` | RPT_ASS | MONEY | Currency Input | Computed: `Market_Val * (Ass_Level/100)`. |
| Tax Year | `Tax_beg_yr` | RPTMAST | VARCHAR | Year Picker | 2020-2030. |
| Trans Code | `trans_cd` | RPTMAST | VARCHAR | Combo Box | GR, TP, RS, EX. |

## 4. API Endpoints

### 1. Get Reference Data
- **Endpoint**: `GET /api/v1/rpt-entry/references`
- **Response**: `{ cities: [], barangays: [], kinds: [], classes: [], subClasses: [] }`

### 2. Load Record
- **Endpoint**: `GET /api/v1/rpt-entry/:tdn`
- **Query**: Executes the provided SQL JOIN query filtered by TDN.
- **Response**: Single JSON object matching the SELECT columns.

### 3. Save Record (Upsert)
- **Endpoint**: `POST /api/v1/rpt-entry`
- **Body**: `{ tdn, pin, cityCode, bCode, ownerName, kind, classification, subClass, assLevel, taxability, area, measurement, marketVal, assValue, taxBegYr, transCd }`
- **Logic**:
  - **Transaction**:
    1.  **RPTMAST**: Update/Insert `TDN`, `PIN`, `CITY` (code), `BCODE` (code), `Tax_beg_yr`, `trans_cd`.
    2.  **rptOWNER**: Check if `owner_no` exists for `TDN`. If not, generate/find. Update `Name`.
    3.  **RPT_ASS**: Update/Insert `TDN`, `KIND`, `ASS_LEVEL`, `TAXABILITY`, `classification`, `SUB_CLASS`, `Area`, `IF_DEFAULT`, `Market_val`, `Ass_value`.
    4.  **RPT_AUDIT_LOG**: Insert log entry.

## 5. Security & Audit
- **Role-Based Access**: `DataEntry`, `Assessor` (Edit); `Viewer` (Read-only).
- **Audit**: Log `TDN`, `Action`, `User`, `Timestamp`, `Changes`.

## 6. Deliverables
- Backend Service & Controller.
- Frontend React Component.
- SQL Migration for Audit Log.
