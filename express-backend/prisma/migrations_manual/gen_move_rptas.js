/**
 * Generator: builds a single transactional, idempotent SQL migration that
 * consolidates RPTAS transaction/data tables into the `rptas` schema.
 *
 * It reads the 5 live DB functions that hardcode `public.<moved table>` and
 * rewrites ONLY the moved-table references to `rptas.*` — function and type
 * references (e.g. public.sync_faas_to_reporting, public.tdn_change_reason)
 * are intentionally preserved.
 *
 * Output: move_rptas_data.sql (run it once in the Supabase SQL Editor).
 *
 *   node prisma/migrations_manual/gen_move_rptas.js
 */
const fs = require('fs');
const path = require('path');
const { supabasePrisma } = require('../../src/modules/rptas/database/prisma');

// Tables physically moved public -> rptas.
const MOVE = [
  'faas_records', 'properties', 'property_lineage', 'property_owner_history',
  'property_tdn_history', 'rpt_property', 'rpt_assessment', 'orders_of_payment',
  'oop_history', 'payors', 'owner', 'barangay', 'municipality', 'municipalities',
  'building_appraisals', 'building_market_values', 'building_types',
  'land_agricultural', 'land_classifications', 'land_market_values',
  'land_sub_classes', 'simple_land_market_values', 'setup_signatories',
  'setup_signatory_templates', 'treasury_payment_exports', 'manual_review_queue',
  'migration_logs', 'sidebar_items', 'sidebar_item_user_visibility',
];
// rptas copies that are empty orphans — dropped so the populated public copy can move.
const ORPHANS = ['barangay', 'municipality', 'owner'];
const FUNCS = [
  'owner_history_enforce_current', 'tdn_history_enforce_current',
  'trg_sync_faas_to_reporting', 'sync_faas_to_reporting', 'refresh_reporting_data',
];

// Replace public.<movedtable> -> rptas.<movedtable>. Longest names first +
// word boundary so `owner` never matches inside `property_owner_history`,
// `owner_change_reason` (type), or `owner_history_enforce_current` (function).
function repoint(def) {
  const names = [...MOVE].sort((a, b) => b.length - a.length).join('|');
  const re = new RegExp('public\\.(' + names + ')\\b', 'g');
  return def.replace(re, 'rptas.$1');
}

(async () => {
  const fnDefs = [];
  for (const f of FUNCS) {
    const r = await supabasePrisma.$queryRawUnsafe(
      "SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1 LIMIT 1",
      f,
    );
    if (!r[0]) throw new Error('function not found: ' + f);
    fnDefs.push({ name: f, def: repoint(r[0].def) });
  }
  await supabasePrisma.$disconnect();

  const movedArr = MOVE.map((t) => `'${t}'`).join(', ');

  const sql = `-- =====================================================================
-- Consolidate RPTAS transaction data into schema "rptas"
-- Run ONCE in the Supabase SQL Editor. Wrapped in a single transaction —
-- if anything fails, NOTHING is applied.
--
-- REVERSAL: move each table back with
--   ALTER TABLE rptas.<t> SET SCHEMA public;
-- and restore the 5 functions from your pre-migration backup.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS rptas;

-- 1) Drop the empty orphan rptas copies (verified 0 rows) so the populated
--    public.* tables can take their place. Aborts if any is unexpectedly
--    non-empty.
DO $mig$
DECLARE d text; n bigint;
BEGIN
  FOREACH d IN ARRAY ARRAY['${ORPHANS.join("','")}'] LOOP
    IF to_regclass('rptas.'||quote_ident(d)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM rptas.%I', d) INTO n;
      IF n = 0 THEN
        EXECUTE format('DROP TABLE rptas.%I CASCADE', d);
        RAISE NOTICE 'dropped empty orphan rptas.%', d;
      ELSE
        RAISE EXCEPTION 'rptas.% has % rows - not an empty orphan; aborting', d, n;
      END IF;
    END IF;
  END LOOP;
END $mig$;

-- 2) Move transaction/data tables public -> rptas (idempotent: skips any
--    table already moved or absent). Triggers, FKs, indexes move with them.
DO $mig$
DECLARE t text; tbls text[] := ARRAY[${movedArr}];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF to_regclass('public.'||quote_ident(t)) IS NOT NULL
       AND to_regclass('rptas.'||quote_ident(t)) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA rptas', t);
      RAISE NOTICE 'moved %', t;
    END IF;
  END LOOP;
END $mig$;

-- 3) Move the dependent view too.
DO $mig$
BEGIN
  IF to_regclass('public.v_properties_current') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_properties_current SET SCHEMA rptas';
    RAISE NOTICE 'moved view v_properties_current';
  END IF;
END $mig$;

-- 4) Rewrite the 5 functions: moved-table references repointed public.* -> rptas.*
--    (function/type references deliberately left in public).
${fnDefs.map((f) => `-- ----- ${f.name} -----\n${f.def};`).join('\n\n')}

COMMIT;
`;

  const out = path.join(__dirname, 'move_rptas_data.sql');
  fs.writeFileSync(out, sql, 'utf8');
  console.log('wrote ' + out + ' (' + sql.split('\n').length + ' lines)');
})().catch((e) => { console.error('ERR:', e.message); process.exit(1); });
