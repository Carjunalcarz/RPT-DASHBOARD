import { apiClient } from "./apiClient";

/**
 * Client for /api/v1/system-admin/* — the bootstrap monitor.
 *
 * Both setup endpoints require either:
 *   - a service request (x-api-key matching backend's API_ACCESS_KEY), or
 *   - a Supabase JWT whose user holds the super_admin role.
 *
 * The first-run path is x-api-key only, because no super_admin can possibly
 * exist before the schema is initialized.
 */

export interface SetupTableStatus {
  name: string;
  exists: boolean;
}

export interface SetupDefaults {
  requiredRoles: string[];
  requiredModules: string[];
  missingRoles: string[];
  missingModules: string[];
  allDefaultsPresent: boolean;
}

export interface SetupCounts {
  roles: number;
  modules: number;
  rolePermissions: number;
}

export interface ConnectionInfo {
  live: {
    host: string | null;
    port: number | null;
    database: string | null;
    role: string | null;
    current_schema: string | null;
    version: string | null;
  } | null;
  configuredUrl: string | null;
  isLikelySupabaseManaged: boolean;
}

export interface TypeIssue {
  table: string;
  column: string;
  expected: string;
  actual: string;
}

export interface SetupStatus {
  schema: string;
  configuredSchema: string;
  schemaMatchesConfig: boolean;
  connection: ConnectionInfo;
  schemaExists: boolean;
  tables: SetupTableStatus[];
  rpcExists: boolean;
  uniqueIndexExists: boolean;
  typeIssues: TypeIssue[];
  schemaReady: boolean;
  counts: SetupCounts | null;
  defaults: SetupDefaults | null;
  initialized: boolean;
}

export interface SetupRunResult {
  ok: boolean;
  schema: string;
  dryRun: boolean;
  logs: string[];
  status: SetupStatus;
  counts: SetupCounts | null;
}

export interface SchemaEntry {
  name: string;
  isConfigured: boolean;
}

export interface SchemaList {
  schemas: SchemaEntry[];
  configured: string;
}

interface Envelope<T> {
  status: "success";
  data: T;
}

const BASE = "/api/v1/system-admin";

function unwrap<T>(p: Promise<{ data: Envelope<T> }>): Promise<T> {
  return p.then((res) => res.data.data);
}

// ---------- setup ----------

export function getSetupStatus(schema?: string): Promise<SetupStatus> {
  return unwrap(
    apiClient.get<Envelope<SetupStatus>>(`${BASE}/setup/status`, {
      params: schema ? { schema } : {},
    })
  );
}

export function runSetup(
  options: { schema?: string; dryRun?: boolean; forceReset?: boolean } = {}
): Promise<SetupRunResult> {
  return unwrap(
    apiClient.post<Envelope<SetupRunResult>>(`${BASE}/setup/init`, {
      schema: options.schema,
      dryRun: !!options.dryRun,
      forceReset: !!options.forceReset,
    })
  );
}

// ---------- schemas ----------

export function listSchemas(): Promise<SchemaList> {
  return unwrap(apiClient.get<Envelope<SchemaList>>(`${BASE}/schemas`));
}

export function createSchema(name: string): Promise<{ name: string }> {
  return unwrap(
    apiClient.post<Envelope<{ name: string }>>(`${BASE}/schemas`, { name })
  );
}

// ---------- bulk-seed RPTAS modules ----------

export interface SeedRptasResult {
  ok: boolean;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: Array<{ routePath: string; reason: string }>;
  total: number;
  logs: string[];
}

export function seedRptasModules(
  options: { dryRun?: boolean } = {},
): Promise<SeedRptasResult> {
  return unwrap(
    apiClient.post<Envelope<SeedRptasResult>>(`${BASE}/setup/seed-rptas`, {
      dryRun: !!options.dryRun,
    }),
  );
}
