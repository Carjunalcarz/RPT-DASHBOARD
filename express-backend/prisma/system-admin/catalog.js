/**
 * System-administration seed catalog.
 *
 * Defines the *minimum* data needed for a fresh Supabase database to boot
 * the LGU dashboard:
 *   - DEFAULT_ROLES — at least one super_admin role must exist so
 *     get_current_user_super_admin() can resolve.
 *   - SYSTEM_ADMIN_MODULES — sidebar entries for the system-admin pages
 *     (Module Management, Role Management, …). Without these, a fresh user
 *     has no DB-driven nav to reach the bootstrap UI; the dashboard's static
 *     SYSTEM ADMIN dock entries (gated by VITE_FORCE_ADMIN) cover dev mode,
 *     but for production we want real `modules` rows + RBAC gating.
 *
 * Consumed by:
 *   - prisma/seed.systemAdmin.js          (upsert on init)
 *   - src/scripts/initSystemAdmin.js      (one-shot bootstrap)
 *   - (optional) startupMigrations.js     (auto-apply in dev)
 *
 * Edit this file to add more default roles or core modules. The seed uses
 * role_code / route_path as the natural key.
 */

const DEFAULT_ROLES = [
  {
    roleCode: 'super_admin',
    roleName: 'Super Administrator',
  },
  {
    roleCode: 'admin',
    roleName: 'Administrator',
  },
  {
    roleCode: 'user',
    roleName: 'User',
  },
];

// System-admin module entries — file_path matches the frontend's lazy
// component registry in LocalGovernmentUnit/src/pages/Dashboard/Dashboard.tsx.
const SYSTEM_ADMIN_MODULES = [
  {
    moduleName: 'System Admin Setup',
    routePath: '/system-admin/setup',
    icons: 'Wrench',
    filePath: 'modules/system-admin/pages/SystemAdminSetup',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'Module Management',
    routePath: '/system-admin/modules',
    icons: 'Blocks',
    filePath: 'modules/system-admin/pages/ModuleManagement',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'Role Management',
    routePath: '/system-admin/roles',
    icons: 'Shield',
    filePath: 'modules/system-admin/pages/RoleManagement',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'Role → Module Access',
    routePath: '/system-admin/role-module-access',
    icons: 'KeyRound',
    filePath: 'modules/system-admin/pages/RoleModuleAccessManagement',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'Role Permissions',
    routePath: '/system-admin/role-permissions',
    icons: 'KeySquare',
    filePath: 'modules/system-admin/pages/RolePermissionsManagement',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'User Management',
    routePath: '/system-admin/users',
    icons: 'Users',
    filePath: 'modules/system-admin/pages/UserManagement',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'User Activation',
    routePath: '/system-admin/user-activation',
    icons: 'UserCheck',
    filePath: 'modules/system-admin/pages/UserActivation',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
  {
    moduleName: 'Facilities',
    routePath: '/system-admin/facilities',
    icons: 'Building2',
    filePath: 'modules/system-admin/pages/FacilitiesManagement',
    category: 'SYSTEM ADMIN',
    isActive: true,
  },
];

// Which roles get full CRUD on which module route_paths by default.
// '*' means every module currently in the catalog above.
const DEFAULT_ROLE_MODULE_ACCESS = [
  { roleCode: 'super_admin', routes: ['*'] },
  { roleCode: 'admin',       routes: ['*'] },
  // 'user' gets no system-admin access by default.
];

// ---------------------------------------------------------------------------
// RPTAS modules — bulk-seed catalog.
//
// One row per RPTAS page that should appear in the LGU dashboard's dock /
// sidebar. routePath is the URL the dashboard navigates to; filePath is the
// import-glob key the dashboard's componentRegistry resolves to a lazy
// React component. category groups entries under the same dock button.
//
// Routes that overlap a static baseApp in Dashboard.tsx (e.g. /migration-cart,
// /rptas/property-approval, /rptas/setup-signatories) are deduplicated by
// the dashboard at render-time — the static entry wins. Seeding them is
// still useful because the rows show up in Module Management + can be
// assigned to roles via Role Module Access.
// ---------------------------------------------------------------------------

const RPTAS_MODULES = [
  // ---- Main RPTAS pages ----
  {
    moduleName: 'FAAS Data Entry',
    routePath: '/rptas/faas',
    icons: 'FileText',
    filePath: 'modules/rptas/domains/faas/pages/DataEntryPage',
    category: 'RPTAS',
  },
  {
    moduleName: 'Real Property Data Entry',
    routePath: '/rptas/real-property-data-entry',
    icons: 'ClipboardList',
    filePath: 'modules/rptas/domains/RPT-management/faas/rpt_m_RealPropertyDataEntry',
    category: 'RPTAS',
  },
  {
    moduleName: 'Property Tracking',
    routePath: '/rptas/property-tracking',
    icons: 'Search',
    filePath: 'modules/rptas/domains/tracking/pages/PropertyTrackingPage',
    category: 'RPTAS',
  },
  {
    moduleName: 'Migration Cart',
    routePath: '/migration-cart',
    icons: 'ShoppingCart',
    filePath: 'modules/rptas/domains/migration/MigrationCartPage',
    category: 'RPTAS',
  },

  // ---- Approvals ----
  {
    moduleName: 'Property Approval',
    routePath: '/rptas/property-approval',
    icons: 'CheckSquare',
    filePath: 'modules/rptas/domains/approvals/pages/PropertyApproval',
    category: 'APPROVALS',
  },
  {
    moduleName: 'Municipal Approvals',
    routePath: '/rptas/approvals/municipal',
    icons: 'Award',
    filePath: 'modules/rptas/domains/approvals/pages/MunicipalApprovals',
    category: 'APPROVALS',
  },
  {
    moduleName: 'Provincial Approvals',
    routePath: '/rptas/approvals/provincial',
    icons: 'Flag',
    filePath: 'modules/rptas/domains/approvals/pages/ProvincialApprovals',
    category: 'APPROVALS',
  },

  // ---- Setup ----
  {
    moduleName: 'Signatory Setup',
    routePath: '/rptas/setup-signatories',
    icons: 'Users',
    filePath: 'modules/rptas/domains/RPT-management/pages/SignatorySetupPage',
    category: 'RPTAS',
  },

  // ---- Treasury ----
  {
    moduleName: 'Order of Payment',
    routePath: '/rptas/treasury/oop',
    icons: 'FileSpreadsheet',
    filePath: 'modules/rptas/domains/treasury/domains/oop/pages/OrderOfPaymentPage',
    category: 'TREASURY',
  },
  {
    moduleName: 'Payors Registry',
    routePath: '/rptas/treasury/payors',
    icons: 'User',
    filePath: 'modules/rptas/domains/treasury/domains/payors/pages/PayorsRegistryPage',
    category: 'TREASURY',
  },
  {
    moduleName: 'Treasury Payments Report',
    routePath: '/rptas/treasury/reports',
    icons: 'BarChart3',
    filePath: 'modules/rptas/domains/treasury/domains/reports/pages/TreasuryPaymentsReportPage',
    category: 'TREASURY',
  },
  {
    moduleName: 'Treasury Confirm Payment',
    routePath: '/rptas/treasury/confirm',
    icons: 'DollarSign',
    filePath: 'modules/rptas/domains/treasury/domains/payments/pages/TreasuryConfirmPage',
    category: 'TREASURY',
  },

  // ---- References ----
  {
    moduleName: 'Barangay',
    routePath: '/rptas/references/barangay',
    icons: 'MapPin',
    filePath: 'modules/rptas/domains/references/pages/BarangayPage',
    category: 'REFERENCES',
  },
  {
    moduleName: 'City-Barangay Assignment',
    routePath: '/rptas/references/city-barangay',
    icons: 'Map',
    filePath: 'modules/rptas/domains/references/pages/CityBarangayAssignmentPage',
    category: 'REFERENCES',
  },
  {
    moduleName: 'Actual Use Setup',
    routePath: '/rptas/references/actual-use',
    icons: 'Bookmark',
    filePath: 'modules/rptas/domains/references/pages/ActualUseSetupPage',
    category: 'REFERENCES',
  },
  {
    moduleName: 'Actual Use Rate',
    routePath: '/rptas/references/actual-use-rate',
    icons: 'Tag',
    filePath: 'modules/rptas/domains/references/pages/ActualUseRatePage',
    category: 'REFERENCES',
  },
  {
    moduleName: 'Building Unit Cost',
    routePath: '/rptas/references/building-unit-cost',
    icons: 'Home',
    filePath: 'modules/rptas/domains/references/pages/BuildingUnitCostSetupPage',
    category: 'REFERENCES',
  },
  {
    moduleName: 'Building Unit Cost Sets',
    routePath: '/rptas/references/building-unit-cost-sets',
    icons: 'Folder',
    filePath: 'modules/rptas/domains/references/pages/BuildingUnitCostSetManagementPage',
    category: 'REFERENCES',
  },
];

module.exports = {
  DEFAULT_ROLES,
  SYSTEM_ADMIN_MODULES,
  DEFAULT_ROLE_MODULE_ACCESS,
  RPTAS_MODULES,
};
