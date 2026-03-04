# Real Property Tax Dashboard (RPT-DASHBOARD)

## Architecture Constraints

### MSSQL Database (Legacy System)
**CRITICAL: Read-Only Data Source**

The MSSQL database (`RPTAS_AGUSAN` or similar) serves **exclusively** as a read-only source for data migration and historical reference.

*   **No Modifications:** Under no circumstances should the application or any migration script attempt to modify, update, insert, or delete data in the MSSQL database.
*   **No Schema Changes:** Do not alter tables, stored procedures, or views in the MSSQL environment.
*   **Procedural T-SQL Constraints:** The legacy system relies on procedural-style T-SQL transactions managed within its own environment. External modifications will break data integrity and transactional consistency.
*   **Extraction Policy:** All data extraction must be:
    *   **Non-intrusive:** Use read-only credentials where possible.
    *   **Transactional Consistency:** Ensure data is extracted in a consistent state without locking tables for extended periods.
*   **Migration Flow:** Data flows strictly **FROM** MSSQL **TO** the target system (Supabase/PostgreSQL).

### Target System (Supabase/PostgreSQL)
All new data entry, edits, and application state management (e.g., FAAS drafts, user management, audit logs) must occur in the Supabase PostgreSQL database.
