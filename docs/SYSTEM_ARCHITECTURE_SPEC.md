# System Architecture Specification: Data Entry vs. RPT Management

## 1. Overview & Separation of Concerns

This document defines the architectural separation between the **Data Entry Module** and the **RPT (Real Property Tax) Management Module**. The system is designed to distinguish clearly between the *capture* of new information and the *lifecycle management* of existing property records.

### Core Principle
*   **Data Entry Form**: Responsible exclusively for the **creation** and initial **capture** of new property records. It acts as the intake funnel.
*   **RPT Management Module**: Responsible for the **maintenance, revision, assessment, and taxation** of records over time. It handles the future-year operations and year-over-year data evolution.

---

## 2. Component Specifications

### 2.1. Data Entry Module (New Data Capture)

#### 2.1.1. Responsibilities
*   **Intake**: Provide a user interface for encoding physical Field Appraisal & Assessment Sheets (FAAS) into the system.
*   **Initial Validation**: Ensure data completeness and format validity at the point of entry.
*   **Draft Management**: Allow saving incomplete records as drafts before final submission.
*   **Submission**: Commit validated new records to the database for processing by the Management Module.

#### 2.1.2. Data Flow Boundaries
*   **Input**: User input via forms.
*   **Output**: Creates a new record in the `FAAS_RECORDS` (or equivalent staging/master) table with status `PENDING` or `FOR_REVIEW`.
*   **Constraint**: The Data Entry module **does not** perform tax calculations, historical adjustments, or future-year projections. It captures the *current* state of a property as observed.

#### 2.1.3. Integration Points
*   **API Endpoint**: `POST /api/faas/draft` (Save Draft), `POST /api/faas/submit` (Submit).
*   **Handoff**: Once a record is submitted and approved, ownership transfers to the RPT Management Module. The Data Entry form is no longer used for that specific record revision.

---

### 2.2. RPT Management Module (Lifecycle & Future-Year Management)

#### 2.2.1. Responsibilities
*   **Revisions & Updates**: Handle changes to property value, classification, or ownership (e.g., General Revisions, Subdivisions, Consolidations).
*   **Assessment**: Calculate assessed values and tax dues based on ordinances.
*   **Future-Year Handling**: Manage data roll-over for subsequent years (Year-over-Year data handling).
*   **Reporting**: Generate Tax Declarations, Notices of Assessment, and administrative reports.
*   **History**: Maintain the audit trail and version history of the TDN (Tax Declaration Number) and PIN.

#### 2.2.2. Data Flow Boundaries
*   **Input**: Approved records from the Data Entry module.
*   **Operations**: 
    *   **Revision**: Creates a *new version* of the record linked to the previous one (Parent-Child relationship).
    *   **Tax Calculation**: Applies formulas to the base data.
*   **Output**: Generated Reports, Tax Bills, Updated Masterlist.

#### 2.2.3. Year-over-Year Data Handling
*   **Rollover**: The module must support a "Year End Closing" process where active records are carried forward to the next fiscal year.
*   **Versioning**: Changes in a new year do not overwrite historical data. A new revision record is created for the new effective year.

---

## 3. Integration & Data Flow Diagram

```mermaid
graph LR
    User[User / Encoder] -->|Encodes New FAAS| Entry[Data Entry Form]
    Entry -->|Validates & Submits| DB_Stage[(Staging / Drafts)]
    
    DB_Stage -->|Approval Workflow| DB_Master[(Master RPT Database)]
    
    DB_Master -->|Read/Update| Mgmt[RPT Management Module]
    
    Mgmt -->|Revisions (New TDN)| DB_Master
    Mgmt -->|Assessment| Calc[Tax Calculator]
    Mgmt -->|Generates| Reports[Reports & Tax Decs]
    
    subgraph "Future Operations"
        Mgmt -->|Year-End Rollover| Future[Future Year Records]
    end
```

## 4. Technical Requirements

### 4.1. Data Validation
*   **Entry Module**:
    *   Required fields check (Owner, Location, PIN format).
    *   Duplicate TDN/PIN check against *active* records.
    *   Data type validation (Numeric values for areas/market values).
*   **Management Module**:
    *   Business logic validation (e.g., Assessed Value cannot exceed Market Value).
    *   Revision logic (New TDN must reference a valid Previous TDN).
    *   Ordinance compliance (Assessment levels must match the effective year's ordinance).

### 4.2. Storage Mechanisms
*   **Drafts**: Stored in a flexible schema (e.g., JSONB or nullable columns) to allow partial saves.
*   **Active Records**: Stored in strict relational tables (`RPTMAST`, `RPTASS`, etc.) with referential integrity.
*   **History**: Archived tables or temporal tables to track changes over time (Audit Trail).

### 4.3. Success Criteria

| Module | Metric | Success Standard |
| :--- | :--- | :--- |
| **Data Entry** | **Efficiency** | User can save a draft in < 2 seconds. |
| | **Integrity** | 0% duplicate TDNs allowed upon submission. |
| **RPT Management** | **Accuracy** | Tax calculations match ordinance formulas 100%. |
| | **Traceability** | All revisions have a clear parent-child lineage (Old TDN -> New TDN). |
| | **Performance** | Retrieval of a property's history (last 5 years) takes < 3 seconds. |

---

## 5. Workflow Summary

1.  **Capture**: User opens **Data Entry Form**. Enters property details. Saves Draft. Submits.
2.  **Review**: Approver reviews the submission. If approved, data moves to **Active Status**.
3.  **Manage**: 
    *   For corrections/updates: User uses **RPT Management Module** to initiate a "Revision".
    *   System generates a new TDN, links it to the old one, and locks the old record.
4.  **Annual Cycle**: 
    *   At year-end, the Management Module duplicates active records for the next year's tax roll (if applicable) or applies General Revision updates.

This architecture ensures that the "noise" of data entry does not corrupt the "signal" of the official tax registry, and that future-year planning does not interfere with current-year collections.
