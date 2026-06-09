/**
 * System-administration seed — idempotent, schema-flexible.
 *
 * Uses raw SQL throughout (no typed Prisma client) so it works against any
 * schema and doesn't break when the Prisma client falls out of sync with the
 * schema.prisma file. The schema name is injected as a quoted identifier;
 * value parameters are passed via placeholders.
 *
 * Two entry points:
 *
 *   - CLI:        `node prisma/seed.systemAdmin.js [--dry-run] [--schema=public]`
 *     Spins up its own PrismaClient (just used as a thin SQL executor).
 *
 *   - In-process: `const { runSeed } = require('./seed.systemAdmin');
 *                  await runSeed({ prisma, schema: 'lgu_admin', dryRun: false });`
 *     SystemAdminService.runSetup() uses this path with the global Prisma
 *     client and the user-chosen schema.
 *
 * Upserts:
 *   1. Default roles (super_admin / admin / user)  keyed by role_code.
 *   2. System-admin modules (Module Management, …) keyed by route_path.
 *   3. role_permissions assigning the default roles full CRUD on their
 *      mapped modules.
 *
 * Does NOT touch:
 *   - Roles or modules not in the catalog (custom rows survive).
 *   - user_roles assignments (granting super_admin to a real user is a
 *     separate step).
 */

const {
  DEFAULT_ROLES,
  SYSTEM_ADMIN_MODULES,
  DEFAULT_ROLE_MODULE_ACCESS,
} = require('./system-admin/catalog');

// Postgres identifier quoter — for the schema name. The schema is also
// validated upstream (validateSchemaName) to a strict regex; the quoting here
// is belt-and-suspenders.
function qIdent(name) {
  if (typeof name !== 'string') throw new Error('identifier must be a string');
  return '"' + name.replace(/"/g, '""') + '"';
}

function makeLogger(buffer) {
  return (...m) => {
    const line = `[sysadmin-seed] ${m.join(' ')}`;
    if (buffer) buffer.push(line);
    console.log(line);
  };
}

async function upsertRoles(prisma, schema, log, dryRun) {
  const S = qIdent(schema);
  log(`Upserting ${DEFAULT_ROLES.length} default role(s) into ${S}.roles ...`);
  for (const r of DEFAULT_ROLES) {
    if (dryRun) { log(`  would upsert role ${r.roleCode}`); continue; }
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM ${S}.roles WHERE role_code = $1 LIMIT 1`,
      r.roleCode
    );
    if (existing && existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE ${S}.roles SET role_name = $1 WHERE id = $2::uuid`,
        r.roleName, existing[0].id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO ${S}.roles (role_code, role_name) VALUES ($1, $2)`,
        r.roleCode, r.roleName
      );
    }
  }
}

async function upsertModules(prisma, schema, log, dryRun) {
  const S = qIdent(schema);
  log(`Upserting ${SYSTEM_ADMIN_MODULES.length} system-admin module(s) into ${S}.modules ...`);
  for (const m of SYSTEM_ADMIN_MODULES) {
    if (dryRun) { log(`  would upsert module ${m.routePath}`); continue; }
    // Relies on the modules_route_path_key unique index.
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO ${S}.modules
          (module_name, route_path, icons, file_path, category, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (route_path) DO UPDATE
          SET module_name = EXCLUDED.module_name,
              icons       = EXCLUDED.icons,
              file_path   = EXCLUDED.file_path,
              category    = EXCLUDED.category,
              is_active   = EXCLUDED.is_active
      `,
      m.moduleName,
      m.routePath,
      m.icons ?? null,
      m.filePath ?? null,
      m.category ?? null,
      m.isActive ?? true
    );
  }
}

async function syncRolePermissions(prisma, schema, log, dryRun) {
  const S = qIdent(schema);
  log(`Syncing default role -> module CRUD in ${S} ...`);

  const allRoles = await prisma.$queryRawUnsafe(
    `SELECT id, role_code FROM ${S}.roles`
  );
  const rolesByCode = new Map(allRoles.map((r) => [r.role_code, r]));

  const wantedRoutes = SYSTEM_ADMIN_MODULES.map((m) => m.routePath);
  const sysModules = await prisma.$queryRawUnsafe(
    `SELECT id, route_path FROM ${S}.modules WHERE route_path = ANY($1::text[])`,
    wantedRoutes
  );
  const modulesByRoute = new Map(sysModules.map((m) => [m.route_path, m]));
  const sysModuleIds = sysModules.map((m) => m.id);

  for (const mapping of DEFAULT_ROLE_MODULE_ACCESS) {
    const role = rolesByCode.get(mapping.roleCode);
    if (!role) {
      log(`  !! role ${mapping.roleCode} missing after upsert — skipping`);
      continue;
    }
    const targetModuleIds = mapping.routes.includes('*')
      ? sysModuleIds
      : mapping.routes.map((rp) => modulesByRoute.get(rp)?.id).filter(Boolean);

    if (dryRun) {
      log(`  would grant ${mapping.roleCode}: ${targetModuleIds.length} module(s)`);
      continue;
    }

    for (const moduleId of targetModuleIds) {
      // unique_role_module enforces (role_id, module_id) — use ON CONFLICT.
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ${S}.role_permissions
            (role_id, module_id, can_select, can_insert, can_update, can_delete)
          VALUES ($1::uuid, $2::uuid, true, true, true, true)
          ON CONFLICT (role_id, module_id) DO UPDATE
            SET can_select = true,
                can_insert = true,
                can_update = true,
                can_delete = true
        `,
        role.id, moduleId
      );
    }
    log(`  ${mapping.roleCode.padEnd(12)} -> ${targetModuleIds.length} module(s)`);
  }
}

async function summary(prisma, schema, log) {
  const S = qIdent(schema);
  const [rolesRow, modulesRow, permsRow] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM ${S}.roles`),
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM ${S}.modules`),
    prisma.$queryRawUnsafe(`SELECT count(*)::int AS c FROM ${S}.role_permissions`),
  ]);
  const counts = {
    roles: rolesRow?.[0]?.c ?? 0,
    modules: modulesRow?.[0]?.c ?? 0,
    rolePermissions: permsRow?.[0]?.c ?? 0,
  };
  log(`Done. roles=${counts.roles} modules=${counts.modules} role_permissions=${counts.rolePermissions}`);
  return counts;
}

/**
 * Programmatic entry — call from any module that already holds a PrismaClient.
 * Returns { logs: string[], counts: {roles, modules, rolePermissions} }.
 */
async function runSeed({
  prisma,
  schema = 'public',
  dryRun = false,
  captureLogs = true,
} = {}) {
  if (!prisma) throw new Error('runSeed requires a prisma client');
  if (typeof schema !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(schema)) {
    throw new Error(`runSeed: invalid schema name ${JSON.stringify(schema)}`);
  }

  const buffer = captureLogs ? [] : null;
  const log = makeLogger(buffer);

  log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'} | schema=${schema}`);
  await upsertRoles(prisma, schema, log, dryRun);
  await upsertModules(prisma, schema, log, dryRun);
  await syncRolePermissions(prisma, schema, log, dryRun);
  const counts = dryRun ? null : await summary(prisma, schema, log);

  return { logs: buffer || [], counts };
}

// CLI entry
async function main() {
  const { PrismaClient } = require('../src/generated/supabase-client-v6');
  const prisma = new PrismaClient();
  const dryRun = process.argv.includes('--dry-run');
  const schemaArg = process.argv.find((a) => a.startsWith('--schema='));
  const schema = schemaArg
    ? schemaArg.slice('--schema='.length)
    : (process.env.SYSTEM_ADMIN_SCHEMA || 'public');

  try {
    await runSeed({ prisma, schema, dryRun, captureLogs: false });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runSeed, main };
