const { supabasePrisma } = require('./src/database/prisma');

async function main() {
  const queries = {
    properties: `select count(*)::int as c from public.properties`,
    property_tdn_history: `select count(*)::int as c from public.property_tdn_history`,
    property_tdn_current_rows: `select count(*)::int as c from public.property_tdn_history where is_current = true`,
    property_owner_history: `select count(*)::int as c from public.property_owner_history`,
    property_owner_current_rows: `select count(*)::int as c from public.property_owner_history where is_current = true`,
    manual_review_queue: `select count(*)::int as c from public.manual_review_queue`,
    v_properties_current: `select count(*)::int as c from public.v_properties_current`,
  };

  const out = {};
  for (const [key, sql] of Object.entries(queries)) {
    const res = await supabasePrisma.$queryRawUnsafe(sql);
    out[key] = res?.[0]?.c ?? null;
  }
  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await supabasePrisma.$disconnect();
  });
