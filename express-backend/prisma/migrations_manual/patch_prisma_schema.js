/**
 * Repoint the Prisma supabase schema so the moved tables map to `rptas`.
 *   - add "rptas" to datasource `schemas`
 *   - for every model whose table (@@map, else model name) is in MOVE and
 *     currently @@schema("public"), switch it to @@schema("rptas")
 * Models NOT in MOVE (users, AuditLog, Item, TestTask, idempotency_keys, and
 * the admin_setup RBAC models) are left untouched.
 *
 *   node prisma/migrations_manual/patch_prisma_schema.js
 */
const fs = require('fs');
const path = require('path');

const MOVE = new Set([
  'faas_records', 'properties', 'property_lineage', 'property_owner_history',
  'property_tdn_history', 'rpt_property', 'rpt_assessment', 'orders_of_payment',
  'oop_history', 'payors', 'owner', 'barangay', 'municipality', 'municipalities',
  'building_appraisals', 'building_market_values', 'building_types',
  'land_agricultural', 'land_classifications', 'land_market_values',
  'land_sub_classes', 'simple_land_market_values', 'setup_signatories',
  'setup_signatory_templates', 'treasury_payment_exports', 'manual_review_queue',
  'migration_logs', 'sidebar_items', 'sidebar_item_user_visibility',
]);

const file = path.join(__dirname, '..', 'schema.supabase.prisma');
let src = fs.readFileSync(file, 'utf8');

// 1) datasource schemas list — add "rptas" if absent.
src = src.replace(/schemas\s*=\s*\[([^\]]*)\]/, (m, inner) => {
  if (/"rptas"/.test(inner)) return m;
  const trimmed = inner.trim().replace(/,\s*$/, '');
  return `schemas   = [${trimmed}, "rptas"]`;
});

// 2) per-model @@schema flip.
const changed = [];
src = src.replace(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g, (block, name, body) => {
  const mapMatch = body.match(/@@map\("([^"]+)"\)/);
  const table = mapMatch ? mapMatch[1] : name;
  if (!MOVE.has(table)) return block;
  if (!/@@schema\("public"\)/.test(body)) return block;
  changed.push(table);
  const newBody = body.replace(/@@schema\("public"\)/, '@@schema("rptas")');
  return `model ${name} {${newBody}\n}`;
});

fs.writeFileSync(file, src, 'utf8');
console.log('models flipped to rptas (' + changed.length + '): ' + changed.sort().join(', '));
const schemasLine = (src.match(/schemas\s*=\s*\[[^\]]*\]/) || ['(?)'])[0];
console.log('datasource ' + schemasLine);
