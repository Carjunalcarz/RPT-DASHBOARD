import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.resolve(process.cwd(), ".env");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const envData = fs.readFileSync(filePath, "utf8");
  envData.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (key && value !== undefined && process.env[key] === undefined) {
      process.env[key] = value.replace(/^"|"$/g, "");
    }
  });
}

loadEnv(envFile);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY in LocalGovernmentUnit/.env or the environment.",
  );
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Warning: Using anon key for seeding. This may fail for RLS-protected tables. Add SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY to run this script successfully.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const modules = [
  {
    module_name: "User Activation",
    route_path: "/admin/activation",
    file_path: "modules/system-admin/pages/UserActivation",
    category: "SYSTEM ADMIN",
    icons: "UserCheck",
    is_active: true,
  },
  {
    module_name: "Role Management",
    route_path: "/admin/roles",
    file_path: "modules/system-admin/pages/RoleManagement",
    category: "SYSTEM ADMIN",
    icons: "Shield",
    is_active: true,
  },
  {
    module_name: "User Management",
    route_path: "/admin/users",
    file_path: "modules/system-admin/pages/UserManagement",
    category: "SYSTEM ADMIN",
    icons: "Users",
    is_active: true,
  },
  {
    module_name: "Module Management",
    route_path: "/admin/modules",
    file_path: "modules/system-admin/pages/ModuleManagement",
    category: "SYSTEM ADMIN",
    icons: "LayoutGrid",
    is_active: true,
  },
  {
    module_name: "Facilities Management",
    route_path: "/admin/facilities",
    file_path: "modules/system-admin/pages/FacilitiesManagement",
    category: "SYSTEM ADMIN",
    icons: "Building",
    is_active: true,
  },
  // RPTAS feature pages — previously hardcoded in Dashboard baseApps, now
  // RBAC-driven. file_path must match a componentRegistry key in Dashboard.tsx
  // so the dynamic-app mapping resolves the lazy component. category/icons
  // mirror the original hardcoded entries so super-admin UX is unchanged.
  {
    module_name: "Property Approval",
    route_path: "/rptas/property-approval",
    file_path: "modules/rptas/domains/approvals/pages/PropertyApproval",
    category: "HIDDEN",
    icons: "FileText",
    is_active: true,
  },
  {
    module_name: "Property Tracking",
    route_path: "/rptas/property-tracking",
    file_path: "modules/rptas/domains/tracking/pages/PropertyTrackingPage",
    category: "RPTAS",
    icons: "List",
    is_active: true,
  },
  {
    module_name: "Signatory Setup",
    route_path: "/rptas/setup-signatories",
    file_path: "modules/rptas/domains/RPT-management/pages/SignatorySetupPage",
    category: "HIDDEN",
    icons: "Users",
    is_active: true,
  },
  {
    module_name: "Building Unit Cost Sets",
    route_path: "/rptas/references/building-unit-cost-sets",
    file_path: "modules/rptas/domains/references/pages/BuildingUnitCostSetManagementPage",
    category: "REFERENCES",
    icons: "Layers",
    is_active: true,
  },
];

async function seedModules() {
  console.log("Seeding module metadata into Supabase...");

  const { data, error } = await supabase
    .from("modules")
    .upsert(modules, { onConflict: ["route_path"] });

  if (error) {
    console.error("Failed to seed modules:", error.message || error);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data?.length ?? modules.length} module records.`);
  process.exit(0);
}

seedModules().catch((err) => {
  console.error("Unexpected error seeding modules:", err instanceof Error ? err.message : err);
  process.exit(1);
});
