import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Database,
  Cog,
  Loader2,
  ListChecks,
  RefreshCw,
  Layers,
  Plus,
  Server,
  RotateCcw,
  Sparkles,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  StatsRow,
  StatCard,
  PrimaryButton,
} from "@/components/ui";
import {
  getSetupStatus,
  runSetup,
  listSchemas,
  createSchema,
  seedRptasModules,
  type SetupStatus,
  type SchemaEntry,
  type SeedRptasResult,
} from "@/services/systemAdminBackendService";
import { useConfirm } from "@/hooks/useConfirm";
import { backendBaseUrl } from "@/services/apiClient";

interface CheckRowProps {
  ok: boolean;
  label: string;
  detail?: string;
}

const CheckRow = ({ ok, label, detail }: CheckRowProps) => (
  <div className="flex items-start gap-3 rounded-lg border border-border bg-surface/60 p-3">
    {ok ? (
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
    ) : (
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
    )}
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  </div>
);

function summarise(status: SetupStatus | null) {
  if (!status) return { ok: false, label: "Unknown" };
  if (!status.schemaExists) return { ok: false, label: "Schema missing" };
  if (status.typeIssues && status.typeIssues.length > 0) {
    return { ok: false, label: "Schema corrupt" };
  }
  if (status.initialized) return { ok: true, label: "Initialized" };
  if (!status.schemaReady) return { ok: false, label: "Tables missing" };
  return { ok: false, label: "Defaults missing" };
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message || e?.message || fallback;
}

const SystemAdminSetup = () => {
  const [targetSchema, setTargetSchema] = useState<string>("");
  const [schemas, setSchemas] = useState<SchemaEntry[]>([]);
  const [configuredSchema, setConfiguredSchema] = useState<string>("public");

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  // Schema-creation form
  const [newSchemaName, setNewSchemaName] = useState<string>("");
  const [creatingSchema, setCreatingSchema] = useState(false);
  const [createSchemaError, setCreateSchemaError] = useState<string | null>(null);

  // RPTAS seed state
  const [seedingRptas, setSeedingRptas] = useState(false);
  const [lastRptasSeed, setLastRptasSeed] = useState<SeedRptasResult | null>(
    null,
  );
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Load schemas + status for whichever schema is currently selected.
  const loadAll = useCallback(
    async (schemaToInspect?: string) => {
      setLoading(true);
      setError(null);
      try {
        const list = await listSchemas();
        setSchemas(list.schemas);
        setConfiguredSchema(list.configured);

        // Pick the schema to inspect: explicit param > current selection >
        // configured schema (from backend env).
        const pick =
          schemaToInspect ||
          (targetSchema && list.schemas.some((s) => s.name === targetSchema)
            ? targetSchema
            : list.configured);
        setTargetSchema(pick);

        const s = await getSetupStatus(pick);
        setStatus(s);
      } catch (err) {
        setError(extractErrorMessage(err, "Failed to load setup status"));
      } finally {
        setLoading(false);
      }
    },
    [targetSchema]
  );

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSchemaChange = async (next: string) => {
    setTargetSchema(next);
    setError(null);
    setLastSuccess(null);
    try {
      setLoading(true);
      const s = await getSetupStatus(next);
      setStatus(s);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load status for that schema"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchema = async () => {
    const name = newSchemaName.trim();
    if (!name) {
      setCreateSchemaError("Enter a schema name first");
      return;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(name)) {
      setCreateSchemaError(
        "Use only letters, digits and underscores; max 63 chars."
      );
      return;
    }
    setCreatingSchema(true);
    setCreateSchemaError(null);
    try {
      await createSchema(name);
      setNewSchemaName("");
      await loadAll(name);
    } catch (err) {
      setCreateSchemaError(
        extractErrorMessage(err, "Failed to create schema")
      );
    } finally {
      setCreatingSchema(false);
    }
  };

  const doInitialize = async (forceReset: boolean) => {
    setRunning(true);
    setError(null);
    setLogs([]);
    setLastSuccess(null);
    try {
      const result = await runSetup({
        schema: targetSchema || undefined,
        dryRun: false,
        forceReset,
      });
      setLogs(result.logs || []);
      setStatus(result.status);
      try {
        const list = await listSchemas();
        setSchemas(list.schemas);
        setConfiguredSchema(list.configured);
      } catch {
        /* non-fatal */
      }
      setLastSuccess(
        result.status.initialized
          ? `Initialization complete for schema "${result.schema}"${
              forceReset ? " (after reset)" : ""
            }.`
          : `Init ran on schema "${result.schema}" but not all defaults are present — review logs.`
      );
    } catch (err) {
      setError(extractErrorMessage(err, "Initialization failed"));
    } finally {
      setRunning(false);
    }
  };

  const handleInitialize = () => doInitialize(false);

  const handleSeedRptas = async () => {
    const ok = await confirm({
      title: "Seed RPTAS modules?",
      message:
        "Bulk-upserts all RPTAS pages (FAAS, Treasury, Approvals, References, " +
        "etc.) into the modules table. Existing rows with matching " +
        "route_path are updated in place; nothing is deleted. " +
        "Safe to re-run.",
      variant: "default",
      confirmLabel: "Seed",
    });
    if (!ok) return;

    setSeedingRptas(true);
    try {
      const result = await seedRptasModules();
      setLastRptasSeed(result);
      const { created, updated, skipped } = result;
      if (skipped.length > 0) {
        toast.error(
          `Seeded with ${skipped.length} skipped — created ${created}, updated ${updated}. Check log.`,
        );
      } else {
        toast.success(
          `RPTAS modules seeded: ${created} new, ${updated} updated`,
        );
      }
      // Refresh the status so the modules-seeded card reflects new totals.
      await loadAll(targetSchema);
    } catch (err) {
      const msg = extractErrorMessage(err, "RPTAS seed failed");
      toast.error(msg);
    } finally {
      setSeedingRptas(false);
    }
  };

  const handleForceReset = async () => {
    const confirmed = window.confirm(
      `This will DROP every RBAC table in schema "${targetSchema}" ` +
        "(roles, modules, role_permissions, user_roles, pending_users, " +
        "facilities, user_facilities) and rebuild them from scratch. " +
        "Any data in those tables is permanently lost.\n\n" +
        "Continue?"
    );
    if (!confirmed) return;
    await doInitialize(true);
  };

  const summary = summarise(status);
  const tablesOk = status?.tables.every((t) => t.exists) ?? false;
  const totalTables = status?.tables.length ?? 0;
  const presentTables = status?.tables.filter((t) => t.exists).length ?? 0;

  const tableDetail = useMemo(() => {
    if (!status) return "";
    const missing = status.tables.filter((t) => !t.exists).map((t) => t.name);
    if (missing.length === 0) return "All required tables present";
    return `Missing: ${missing.join(", ")}`;
  }, [status]);

  const schemaMismatch =
    status !== null && !status.schemaMatchesConfig && status.initialized;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="System Admin Setup"
        subtitle="Monitor and initialize the RBAC schema, RPC, indexes and default catalog."
        icon={<Wrench className="h-6 w-6" />}
      />

      {/* Top-line status */}
      <div
        className={`flex items-start gap-4 rounded-xl border p-5 ${
          summary.ok
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-amber-500/40 bg-amber-500/5"
        }`}
      >
        {summary.ok ? (
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-8 w-8 shrink-0 text-amber-500" />
        )}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">
            {summary.ok
              ? `Schema "${status?.schema}" is initialized`
              : `Initialization required for schema "${status?.schema ?? targetSchema}"`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {summary.ok
              ? "All required tables, the RPC, the modules unique index, and the default catalog are present."
              : "Pick a target schema below and click Initialize. The migration is idempotent and safe to re-run."}
          </p>
          <p className="mt-2 text-xs text-muted">
            Backend: <code className="rounded bg-border/50 px-1.5 py-0.5">{backendBaseUrl()}</code>
            {" · "}
            Configured schema (env): <code className="rounded bg-border/50 px-1.5 py-0.5">{configuredSchema}</code>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PrimaryButton
            onClick={handleInitialize}
            disabled={running || loading || summary.ok || !targetSchema}
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing…
              </>
            ) : summary.ok ? (
              "Already initialized"
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Initialize Now
              </>
            )}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => loadAll(targetSchema)}
            disabled={loading || running}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:bg-border/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Backend connection — what database the backend ACTUALLY wrote to.
          Without this, it's easy to think "init said it worked" while the
          Supabase dashboard shows nothing — because the backend was talking
          to a different Postgres than the one your dashboard is for. */}
      {status?.connection && (
        <section className="rounded-xl border border-border bg-surface/50 p-5">
          <header className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted" />
              <h3 className="text-sm font-semibold text-foreground">
                Backend is connected to
              </h3>
            </div>
            {status.connection.live?.host && !status.connection.isLikelySupabaseManaged && (
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                Not a Supabase-managed host
              </span>
            )}
          </header>
          {status.connection.live ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted">Host</dt>
                <dd className="font-mono text-foreground">
                  {status.connection.live.host ?? "—"}
                  {status.connection.live.port ? `:${status.connection.live.port}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Database</dt>
                <dd className="font-mono text-foreground">
                  {status.connection.live.database ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Role</dt>
                <dd className="font-mono text-foreground">
                  {status.connection.live.role ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Server</dt>
                <dd className="font-mono text-foreground truncate" title={status.connection.live.version ?? ""}>
                  {status.connection.live.version ?? "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted">Connection probe failed.</p>
          )}
          {status.connection.configuredUrl && (
            <p className="mt-3 break-all text-[11px] text-muted">
              SUPABASE_DB_URL:{" "}
              <code className="rounded bg-border/30 px-1.5 py-0.5">
                {status.connection.configuredUrl}
              </code>
            </p>
          )}
          {status.connection.live?.host &&
            !status.connection.isLikelySupabaseManaged && (
              <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                This doesn't look like a Supabase-managed host
                (<code>*.supabase.co</code>). If your Supabase dashboard isn't
                showing the schema after init, it's almost certainly because
                the backend is connected to a different database. Verify
                <code className="mx-1 rounded bg-amber-500/20 px-1 py-0.5">
                  SUPABASE_DB_URL
                </code>
                in <code>express-backend/.env</code> points at the same
                project as your dashboard.
              </p>
            )}
        </section>
      )}

      {/* Env mismatch warning */}
      {schemaMismatch && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1 space-y-1">
            <p>
              Schema <code>{status?.schema}</code> is initialized, but the
              backend is configured to read from <code>{configuredSchema}</code>.
            </p>
            <p className="text-xs">
              To make the backend use the new schema, set
              <code className="mx-1 rounded bg-amber-500/20 px-1.5 py-0.5">SYSTEM_ADMIN_SCHEMA={status?.schema}</code>
              in <code>express-backend/.env</code> and restart the backend.
              Also set
              <code className="mx-1 rounded bg-amber-500/20 px-1.5 py-0.5">VITE_SYSTEM_ADMIN_SCHEMA={status?.schema}</code>
              in <code>LocalGovernmentUnit/.env</code> and restart Vite so the
              frontend reads from the right place.
            </p>
          </div>
        </div>
      )}

      {/* Type-mismatch / corrupt schema banner. Shown when existing tables
          have incompatible column types (e.g. id is text instead of uuid)
          which blocks the FK constraints. Offer an explicit destructive
          reset path. */}
      {status && status.typeIssues && status.typeIssues.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/50 bg-red-500/10 p-5"
        >
          <header className="mb-2 flex items-start gap-3">
            <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-700 dark:text-red-300">
                Schema corrupt — column types don't match the migration
              </h3>
              <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/90">
                Existing tables in schema <code>{status.schema}</code> were
                created with incompatible column types (likely left over from
                an older Prisma model). The foreign-key constraints can't be
                built on top of them, so a normal Initialize will fail.
              </p>
            </div>
          </header>

          <details className="mb-3 text-xs text-red-700/80 dark:text-red-300/80">
            <summary className="cursor-pointer">
              View mismatches ({status.typeIssues.length})
            </summary>
            <ul className="mt-2 space-y-0.5 font-mono">
              {status.typeIssues.map((iss, i) => (
                <li key={i}>
                  {status.schema}.{iss.table}.{iss.column}:{" "}
                  expected <code className="text-emerald-700 dark:text-emerald-400">{iss.expected}</code>,{" "}
                  actual <code className="text-red-700 dark:text-red-400">{iss.actual}</code>
                </li>
              ))}
            </ul>
          </details>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
            <p className="text-xs text-red-700/90 dark:text-red-300/90">
              <strong>Destructive recovery:</strong> drop all RBAC tables in
              this schema and rebuild them. Any data in those tables is lost.
            </p>
            <button
              type="button"
              onClick={handleForceReset}
              disabled={running || loading}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-red-500 bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Reset & Reinitialize
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}
      {lastSuccess && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{lastSuccess}</span>
        </div>
      )}

      {/* Schema picker */}
      <section className="rounded-xl border border-border bg-surface/50 p-5">
        <header className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-foreground">Target schema</h3>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Pick an existing schema
            </label>
            <select
              value={targetSchema}
              onChange={(e) => handleSchemaChange(e.target.value)}
              disabled={loading || running}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:outline-none"
            >
              {schemas.length === 0 && (
                <option value="">No schemas detected</option>
              )}
              {schemas.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.isConfigured ? "  (env)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Switching here re-checks status for that schema. The backend's
              runtime schema is still controlled by{" "}
              <code>SYSTEM_ADMIN_SCHEMA</code>.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Create a new schema
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                placeholder="e.g. lgu_admin"
                disabled={creatingSchema}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-success focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreateSchema}
                disabled={creatingSchema || !newSchemaName.trim()}
                className="flex items-center gap-1.5 rounded-md border border-success bg-success px-3 py-2 text-xs font-medium text-white hover:bg-success/90 disabled:opacity-50"
              >
                {creatingSchema ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Create
              </button>
            </div>
            {createSchemaError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {createSchemaError}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              Creates an empty schema. You still need to click Initialize Now
              to build the RBAC tables inside it.
            </p>
          </div>
        </div>
      </section>

      {/* Bulk seed — RPTAS modules */}
      <section className="rounded-xl border border-border bg-surface/50 p-5">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-foreground">
              Bulk seed
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSeedRptas}
            disabled={seedingRptas || loading || running}
            className="flex items-center gap-1.5 rounded-md border border-success bg-success px-3 py-2 text-xs font-medium text-white hover:bg-success/90 disabled:opacity-50"
          >
            {seedingRptas ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Package className="h-3.5 w-3.5" />
            )}
            Seed RPTAS Modules
          </button>
        </header>

        <p className="text-xs text-muted">
          One-click bulk upsert of every RPTAS page (FAAS, Property Tracking,
          Treasury OOP &amp; Payors, Approvals, References, etc.) into the
          modules table for the currently configured schema (
          <code className="rounded bg-border/30 px-1.5 py-0.5">
            {configuredSchema}
          </code>
          ). After seeding, the modules appear in Module Management and
          (after assigning to roles) in the dashboard dock.
        </p>

        {lastRptasSeed && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-border bg-background/40 px-3 py-2">
              <div className="text-muted">Created</div>
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {lastRptasSeed.created}
              </div>
            </div>
            <div className="rounded-md border border-border bg-background/40 px-3 py-2">
              <div className="text-muted">Updated</div>
              <div className="text-lg font-semibold text-sky-600 dark:text-sky-400">
                {lastRptasSeed.updated}
              </div>
            </div>
            <div className="rounded-md border border-border bg-background/40 px-3 py-2">
              <div className="text-muted">Skipped</div>
              <div
                className={`text-lg font-semibold ${
                  lastRptasSeed.skipped.length > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted"
                }`}
              >
                {lastRptasSeed.skipped.length}
              </div>
            </div>
            {lastRptasSeed.skipped.length > 0 && (
              <details className="col-span-3 mt-1 text-xs text-amber-700 dark:text-amber-300">
                <summary className="cursor-pointer">
                  Skipped details ({lastRptasSeed.skipped.length})
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {lastRptasSeed.skipped.map((s, i) => (
                    <li key={i} className="font-mono">
                      {s.routePath}: {s.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Stats row */}
      <StatsRow>
        <StatCard
          label="Status"
          value={summary.label}
          color={summary.ok ? "success" : "warning"}
        />
        <StatCard
          label="Tables present"
          value={`${presentTables} / ${totalTables}`}
          color={tablesOk ? "success" : "warning"}
        />
        <StatCard
          label="Roles seeded"
          value={status?.counts ? String(status.counts.roles) : "—"}
        />
        <StatCard
          label="Modules seeded"
          value={status?.counts ? String(status.counts.modules) : "—"}
        />
      </StatsRow>

      {/* Schema checks */}
      <section className="rounded-xl border border-border bg-surface/50 p-5">
        <header className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-foreground">Schema</h3>
        </header>
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckRow
            ok={status?.schemaExists ?? false}
            label={`Schema "${status?.schema ?? targetSchema}" exists`}
            detail={
              status?.schemaExists
                ? "Database namespace is present"
                : "Will be created when you click Initialize"
            }
          />
          <CheckRow
            ok={tablesOk}
            label={`Tables (${presentTables}/${totalTables})`}
            detail={tableDetail}
          />
          <CheckRow
            ok={status?.rpcExists ?? false}
            label="RPC get_current_user_super_admin"
            detail="Used by the frontend to detect super-admin status"
          />
          <CheckRow
            ok={status?.uniqueIndexExists ?? false}
            label="Unique index modules_route_path_key"
            detail="Required by the module seed's ON CONFLICT"
          />
        </div>

        {status && status.schemaExists && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer">Per-table detail</summary>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {status.tables.map((t) => (
                <li key={t.name} className="flex items-center gap-1.5">
                  {t.exists ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <code>{status.schema}.{t.name}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Default catalog checks */}
      <section className="rounded-xl border border-border bg-surface/50 p-5">
        <header className="mb-4 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-semibold text-foreground">
            Default Catalog
          </h3>
        </header>
        {!status?.schemaReady ? (
          <p className="text-sm text-muted">
            Catalog cannot be checked until the schema and tables are in place.
          </p>
        ) : status.defaults ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckRow
              ok={status.defaults.missingRoles.length === 0}
              label={`Default roles (${
                status.defaults.requiredRoles.length -
                status.defaults.missingRoles.length
              } / ${status.defaults.requiredRoles.length})`}
              detail={
                status.defaults.missingRoles.length === 0
                  ? `Present: ${status.defaults.requiredRoles.join(", ")}`
                  : `Missing: ${status.defaults.missingRoles.join(", ")}`
              }
            />
            <CheckRow
              ok={status.defaults.missingModules.length === 0}
              label={`Default system-admin modules (${
                status.defaults.requiredModules.length -
                status.defaults.missingModules.length
              } / ${status.defaults.requiredModules.length})`}
              detail={
                status.defaults.missingModules.length === 0
                  ? "All system-admin modules present"
                  : `Missing: ${status.defaults.missingModules.join(", ")}`
              }
            />
          </div>
        ) : null}
      </section>

      {/* Run log */}
      {logs.length > 0 && (
        <section className="rounded-xl border border-border bg-surface/50 p-5">
          <header className="mb-3 flex items-center gap-2">
            <Cog className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-foreground">Last run</h3>
          </header>
          <pre className="max-h-72 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted">
            {logs.join("\n")}
          </pre>
        </section>
      )}

      {/* Custom confirm dialog */}
      {confirmDialog}
    </div>
  );
};

export default SystemAdminSetup;
