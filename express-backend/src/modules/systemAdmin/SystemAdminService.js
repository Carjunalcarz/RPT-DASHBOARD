const path = require('path');
const fs = require('fs');

const {
  DEFAULT_ROLES,
  SYSTEM_ADMIN_MODULES,
  RPTAS_MODULES,
} = require('../../../prisma/system-admin/catalog');
const {
  splitSqlStatementsSmart,
  validateSchemaName,
} = require('../rptas/database/startupMigrations');
const { runSeed } = require('../../../prisma/seed.systemAdmin');

const REQUIRED_TABLES = [
  'pending_users', 'roles', 'modules', 'facilities',
  'user_roles',    'role_permissions', 'user_facilities',
];

const REQUIRED_INDEX = 'modules_route_path_key';
const REQUIRED_RPC   = 'get_current_user_super_admin';

// Columns that MUST be uuid for the FK graph to wire up correctly. Each entry
// is (table, column, expectedUdtType).
const EXPECTED_COLUMN_TYPES = [
  ['pending_users',    'id',            'uuid'],
  ['roles',            'id',            'uuid'],
  ['modules',          'id',            'uuid'],
  ['facilities',       'id',            'uuid'],
  ['user_roles',       'id',            'uuid'],
  ['user_roles',       'user_id',       'uuid'],
  ['user_roles',       'role_id',       'uuid'],
  ['role_permissions', 'id',            'uuid'],
  ['role_permissions', 'role_id',       'uuid'],
  ['role_permissions', 'module_id',     'uuid'],
  ['user_facilities',  'id',            'uuid'],
  ['user_facilities',  'user_id',       'uuid'],
  ['user_facilities',  'facilities_id', 'uuid'],
];

// Drop order — children first so the dependency FKs are removed before the
// parents. Used by forceReset and is safe to run with `CASCADE` regardless.
const DROP_ORDER = [
  'user_facilities',
  'role_permissions',
  'user_roles',
  'pending_users',
  'modules',
  'facilities',
  'roles',
];

const SQL_FILE = path.resolve(
  __dirname, '..', '..', 'modules', 'rptas', 'database',
  'supabase_system_admin_rbac.sql'
);

// Schemas we never let an admin pick — Postgres internals + Supabase reserved.
const RESERVED_SCHEMAS = new Set([
  'pg_catalog', 'pg_toast', 'information_schema',
  'auth', 'storage', 'graphql', 'graphql_public', 'realtime',
  'extensions', 'pgsodium', 'pgsodium_masks', 'vault', 'supabase_functions',
]);

class SystemAdminService {
  constructor({ supabasePrisma, logger }) {
    this.prisma = supabasePrisma;
    this.logger = logger;
  }

  // ---------------- schema helpers ----------------

  /**
   * The schema the backend itself is configured to read from.
   * Source of truth for runtime — env-driven.
   */
  get configuredSchema() {
    return validateSchemaName(process.env.SYSTEM_ADMIN_SCHEMA || 'public');
  }

  resolveSchema(schemaIn) {
    return validateSchemaName(schemaIn || this.configuredSchema);
  }

  // ---------------- connection info ----------------

  /**
   * Where the backend's Prisma client is actually connected. Surfaces the
   * host/port/database/role/version so the UI can confirm the backend is
   * pointing at the same database the user expects (e.g. the Supabase
   * project shown in the Supabase dashboard).
   *
   * Also includes a redacted form of SUPABASE_DB_URL (no credentials) so the
   * user can see the configured URL at a glance.
   */
  async getDatabaseInfo() {
    let live = null;
    try {
      const rows = await this.prisma.$queryRawUnsafe(`
        SELECT
          inet_server_addr()::text             AS host,
          inet_server_port()::int              AS port,
          current_database()                   AS database,
          current_user                         AS role,
          current_schema()                     AS current_schema,
          regexp_replace(version(), ' on .*', '') AS version
      `);
      if (rows && rows[0]) live = rows[0];
    } catch (err) {
      this.logger?.warn(`getDatabaseInfo: probe failed: ${err.message}`);
    }

    let configuredUrl = null;
    const raw = process.env.SUPABASE_DB_URL;
    if (raw) {
      try {
        const u = new URL(raw);
        const userPart = u.username ? `${u.username}:****@` : '';
        const search = u.searchParams.toString();
        configuredUrl = `${u.protocol}//${userPart}${u.host}${u.pathname}${search ? '?' + search : ''}`;
      } catch {
        configuredUrl = '(unparseable)';
      }
    }

    return {
      live,
      configuredUrl,
      // Heuristic — any host inside supabase.co / supabase.net / supabase.com
      // (incl. pooler.supabase.com and db.<ref>.supabase.co) is treated as
      // Supabase-managed for the "is this where my dashboard reads from?" check.
      isLikelySupabaseManaged:
        !!live?.host &&
        /(^|\.)supabase\.(co|com|net)$/.test(live.host),
    };
  }

  // ---------------- list / create schemas ----------------

  async listSchemas() {
    const rows = await this.prisma.$queryRawUnsafe(`
      SELECT n.nspname AS name
        FROM pg_namespace n
       WHERE n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\'
         AND n.nspname NOT IN (${[...RESERVED_SCHEMAS].map((_, i) => `$${i + 1}`).join(', ')})
       ORDER BY n.nspname ASC
    `, ...RESERVED_SCHEMAS);

    const configured = this.configuredSchema;
    return (rows || []).map((r) => ({
      name: r.name,
      isConfigured: r.name === configured,
    }));
  }

  async createSchema(schemaIn) {
    const schema = this.resolveSchema(schemaIn);
    // EXECUTE format() so Postgres handles identifier quoting safely.
    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "${schema}"`
    );
    return { name: schema };
  }

  // ---------------- status ----------------

  async getSetupStatus(schemaIn) {
    const schema = this.resolveSchema(schemaIn);
    const configured = this.configuredSchema;

    const status = {
      schema,
      configuredSchema: configured,
      schemaMatchesConfig: schema === configured,
      connection: await this.getDatabaseInfo(),
      schemaExists: false,
      tables: REQUIRED_TABLES.map((name) => ({ name, exists: false })),
      rpcExists: false,
      uniqueIndexExists: false,
      typeIssues: [],
      schemaReady: false,
      counts: null,
      defaults: null,
      initialized: false,
    };

    // Schema existence
    try {
      const rows = await this.prisma.$queryRawUnsafe(
        `SELECT 1 AS ok FROM pg_namespace WHERE nspname = $1 LIMIT 1`,
        schema
      );
      status.schemaExists = (rows || []).length > 0;
    } catch (err) {
      this.logger?.warn(`getSetupStatus: schema probe failed: ${err.message}`);
    }

    if (!status.schemaExists) {
      return status;
    }

    // Tables
    try {
      const tableRows = await this.prisma.$queryRawUnsafe(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = $1
            AND table_name = ANY($2::text[])`,
        schema, REQUIRED_TABLES
      );
      const have = new Set((tableRows || []).map((r) => r.table_name));
      status.tables = REQUIRED_TABLES.map((name) => ({
        name, exists: have.has(name),
      }));
    } catch (err) {
      this.logger?.warn(`getSetupStatus: table probe failed: ${err.message}`);
    }

    // RPC (look in the chosen schema)
    try {
      const rpcRows = await this.prisma.$queryRawUnsafe(
        `SELECT 1 AS ok
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE p.proname = $1 AND n.nspname = $2
          LIMIT 1`,
        REQUIRED_RPC, schema
      );
      status.rpcExists = (rpcRows || []).length > 0;
    } catch (err) {
      this.logger?.warn(`getSetupStatus: rpc probe failed: ${err.message}`);
    }

    // Unique index
    try {
      const idxRows = await this.prisma.$queryRawUnsafe(
        `SELECT 1 AS ok FROM pg_indexes
          WHERE schemaname = $1 AND indexname = $2 LIMIT 1`,
        schema, REQUIRED_INDEX
      );
      status.uniqueIndexExists = (idxRows || []).length > 0;
    } catch (err) {
      this.logger?.warn(`getSetupStatus: index probe failed: ${err.message}`);
    }

    // Type-mismatch detection — catches legacy tables created with String/
    // text id columns by an older Prisma model. If any column has the wrong
    // udt_name, the foreign-key constraints will fail to build. Surface this
    // so the UI can offer a "Reset & reinitialize" action.
    status.typeIssues = [];
    if (status.tables.some((t) => t.exists)) {
      try {
        const colRows = await this.prisma.$queryRawUnsafe(
          `
            SELECT table_name, column_name, udt_name
              FROM information_schema.columns
             WHERE table_schema = $1
               AND table_name = ANY($2::text[])
          `,
          schema, REQUIRED_TABLES
        );
        const have = new Map(
          (colRows || []).map((r) => [`${r.table_name}.${r.column_name}`, r.udt_name])
        );
        for (const [tbl, col, expected] of EXPECTED_COLUMN_TYPES) {
          const actual = have.get(`${tbl}.${col}`);
          if (actual && actual !== expected) {
            status.typeIssues.push({ table: tbl, column: col, expected, actual });
          }
        }
      } catch (err) {
        this.logger?.warn(`getSetupStatus: type probe failed: ${err.message}`);
      }
    }

    status.schemaReady =
      status.tables.every((t) => t.exists) &&
      status.rpcExists &&
      status.uniqueIndexExists &&
      status.typeIssues.length === 0;

    // Data probe (schema-scoped — use raw SQL so we don't depend on the
    // Prisma client's default schema binding).
    if (status.schemaReady) {
      try {
        const [rolesRow, modulesRow, permsRow] = await Promise.all([
          this.prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "${schema}".roles`),
          this.prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "${schema}".modules`),
          this.prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM "${schema}".role_permissions`),
        ]);
        const presentRoles = await this.prisma.$queryRawUnsafe(
          `SELECT role_code FROM "${schema}".roles`
        );
        const presentModules = await this.prisma.$queryRawUnsafe(
          `SELECT route_path FROM "${schema}".modules`
        );

        const presentRoleCodes = new Set((presentRoles || []).map((r) => r.role_code));
        const presentRoutes    = new Set((presentModules || []).map((m) => m.route_path));

        const missingRoles = DEFAULT_ROLES
          .filter((r) => !presentRoleCodes.has(r.roleCode))
          .map((r) => r.roleCode);
        const missingModules = SYSTEM_ADMIN_MODULES
          .filter((m) => !presentRoutes.has(m.routePath))
          .map((m) => m.routePath);

        status.counts = {
          roles: rolesRow?.[0]?.c ?? 0,
          modules: modulesRow?.[0]?.c ?? 0,
          rolePermissions: permsRow?.[0]?.c ?? 0,
        };
        status.defaults = {
          requiredRoles:   DEFAULT_ROLES.map((r) => r.roleCode),
          requiredModules: SYSTEM_ADMIN_MODULES.map((m) => m.routePath),
          missingRoles,
          missingModules,
          allDefaultsPresent:
            missingRoles.length === 0 && missingModules.length === 0,
        };
      } catch (err) {
        this.logger?.warn(`getSetupStatus: data probe failed: ${err.message}`);
        status.defaults = {
          requiredRoles:   DEFAULT_ROLES.map((r) => r.roleCode),
          requiredModules: SYSTEM_ADMIN_MODULES.map((m) => m.routePath),
          missingRoles:    DEFAULT_ROLES.map((r) => r.roleCode),
          missingModules:  SYSTEM_ADMIN_MODULES.map((m) => m.routePath),
          allDefaultsPresent: false,
        };
      }
    }

    status.initialized =
      status.schemaReady &&
      status.defaults !== null &&
      status.defaults.allDefaultsPresent;

    return status;
  }

  /**
   * One-shot bulk upsert of every RPTAS page as a row in the configured
   * schema's `modules` table. Idempotent — uses route_path as the natural
   * key, so re-running this just refreshes module_name / icons / category /
   * file_path / is_active for any rows that already exist.
   *
   * Returns counts so the UI can show what happened.
   */
  async seedRptasModules({ dryRun = false } = {}) {
    const logs = [];
    const append = (line) => { logs.push(line); this.logger?.info(line); };

    append(`seedRptasModules mode=${dryRun ? 'DRY_RUN' : 'WRITE'} count=${RPTAS_MODULES.length}`);

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        catalog: RPTAS_MODULES,
        logs,
      };
    }

    // Batched implementation — one findMany to discover existing rows,
    // then a single createMany for new ones + parallel update calls for
    // existing. Avoids 18 sequential round-trips.
    let created = 0;
    let updated = 0;
    const skipped = [];

    let existing = [];
    try {
      existing = await this.prisma.module.findMany({
        where: { routePath: { in: RPTAS_MODULES.map((m) => m.routePath) } },
        select: { id: true, routePath: true },
      });
    } catch (err) {
      append(`!! existence probe failed: ${err.message}`);
      throw err;
    }
    const existingByPath = new Map(existing.map((e) => [e.routePath, e.id]));

    const toCreate = RPTAS_MODULES.filter(
      (m) => !existingByPath.has(m.routePath),
    );
    const toUpdate = RPTAS_MODULES.filter((m) =>
      existingByPath.has(m.routePath),
    );

    if (toCreate.length > 0) {
      try {
        const result = await this.prisma.module.createMany({
          data: toCreate.map((m) => ({
            moduleName: m.moduleName,
            routePath: m.routePath,
            icons: m.icons ?? null,
            filePath: m.filePath ?? null,
            category: m.category ?? null,
            isActive: m.isActive ?? true,
          })),
          skipDuplicates: true,
        });
        created = result.count;
      } catch (err) {
        append(`!! createMany failed: ${err.message}`);
        toCreate.forEach((m) =>
          skipped.push({ routePath: m.routePath, reason: err.message }),
        );
      }
    }

    if (toUpdate.length > 0) {
      const results = await Promise.allSettled(
        toUpdate.map((m) =>
          this.prisma.module.update({
            where: { id: existingByPath.get(m.routePath) },
            data: {
              moduleName: m.moduleName,
              icons: m.icons ?? null,
              filePath: m.filePath ?? null,
              category: m.category ?? null,
              isActive: m.isActive ?? true,
            },
          }),
        ),
      );
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          updated++;
        } else {
          skipped.push({
            routePath: toUpdate[i].routePath,
            reason: r.reason?.message || String(r.reason),
          });
        }
      });
    }

    append(`done. created=${created} updated=${updated} skipped=${skipped.length}`);
    return {
      ok: true,
      dryRun: false,
      created,
      updated,
      skipped,
      total: RPTAS_MODULES.length,
      logs,
    };
  }

  // ---------------- run setup ----------------

  /**
   * Applies the RBAC SQL migration (with __SCHEMA__ substituted) and seeds
   * defaults into the chosen schema. Idempotent.
   *
   * Options:
   *   - dryRun:     no writes; just parses + logs.
   *   - forceReset: BEFORE running the migration, DROP all RBAC tables in
   *                 the target schema. Use this to recover from a previous
   *                 partial init that left tables with wrong column types
   *                 (e.g. id columns created as text by an older Prisma
   *                 model, blocking the foreign-key constraints). DESTRUCTIVE
   *                 — any data in those tables is lost.
   */
  async runSetup({
    schema: schemaIn,
    dryRun = false,
    forceReset = false,
  } = {}) {
    const schema = this.resolveSchema(schemaIn);
    const logs = [];
    const append = (line) => { logs.push(line); this.logger?.info(line); };

    append(`runSetup schema=${schema} mode=${dryRun ? 'DRY_RUN' : 'WRITE'} forceReset=${forceReset}`);

    // Step 1: ensure schema exists (cheap, idempotent)
    if (!dryRun) {
      await this.prisma.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${schema}"`
      );
      append(`schema "${schema}" ensured`);
    } else {
      append(`schema "${schema}" would be ensured`);
    }

    // Step 1b: optional destructive reset — drops the existing RBAC tables
    // in dependency order. CASCADE catches anything else hanging off them.
    if (forceReset) {
      if (dryRun) {
        append(`DRY RUN: would DROP TABLE in "${schema}": ${DROP_ORDER.join(', ')}`);
      } else {
        for (const tbl of DROP_ORDER) {
          try {
            await this.prisma.$executeRawUnsafe(
              `DROP TABLE IF EXISTS "${schema}"."${tbl}" CASCADE`
            );
            append(`dropped "${schema}"."${tbl}"`);
          } catch (err) {
            // Don't let one bad drop stop the rest — the migration will
            // surface any leftover problem.
            append(`drop "${schema}"."${tbl}" failed: ${err.message}`);
          }
        }
        // Drop the RPC too — its body references roles/user_roles by name,
        // so it'll be invalidated when those tables are recreated. Easier to
        // drop + let the migration rebuild it.
        try {
          await this.prisma.$executeRawUnsafe(
            `DROP FUNCTION IF EXISTS "${schema}".get_current_user_super_admin() CASCADE`
          );
          append(`dropped function "${schema}".get_current_user_super_admin`);
        } catch (err) {
          append(`drop function failed: ${err.message}`);
        }
      }
    }

    // Step 2: SQL migration
    if (!fs.existsSync(SQL_FILE)) {
      throw new Error(`SQL migration file missing at ${SQL_FILE}`);
    }
    let sql = fs.readFileSync(SQL_FILE, 'utf8');
    sql = sql.split('__SCHEMA__').join(schema);
    const statements = splitSqlStatementsSmart(sql);
    append(`SQL: ${statements.length} statement(s) parsed`);

    if (!dryRun) {
      for (let i = 0; i < statements.length; i++) {
        try {
          await this.prisma.$executeRawUnsafe(statements[i]);
        } catch (err) {
          const head = statements[i].slice(0, 100).replace(/\s+/g, ' ');
          append(`SQL step ${i + 1}/${statements.length} FAILED: ${head}... -> ${err.message}`);
          throw err;
        }
      }
      append(`SQL: ${statements.length} statement(s) executed`);
    } else {
      append('SQL: dry-run, skipping execution');
    }

    // Step 3: seed via raw SQL. The seed quotes the schema as an identifier
    // and uses placeholders for values; no Prisma model dependency, so the
    // generated Prisma client doesn't need to be regenerated when schema
    // fields change. The global Prisma client is just a SQL executor here.
    const seedResult = await runSeed({
      prisma: this.prisma,
      schema,
      dryRun,
      captureLogs: true,
    });
    seedResult.logs.forEach(append);

    const status = await this.getSetupStatus(schema);
    return { ok: true, schema, dryRun, logs, status, counts: seedResult.counts };
  }
}

module.exports = SystemAdminService;
