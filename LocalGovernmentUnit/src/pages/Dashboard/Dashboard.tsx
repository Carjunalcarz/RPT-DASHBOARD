import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useRBAC } from "@/hooks/useRBAC";
import UserProfile from "../UserProfile/UserProfile";
import Settings from "../Settings/Settings";
import { getIconByName } from "@/lib/iconMap";
import { cn } from "@/lib/utils";
import { useAuthStore, useSettingsStore } from "@/store";
import {
  Blocks,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  Clock,
  Cpu,
  Folder,
  KeyRound,
  KeySquare,
  Keyboard,
  LayoutDashboard,
  List,
  LogOut,
  Monitor,
  Search,
  Settings as SettingsIcon,
  Shield,
  Star,
  StarOff,
  User,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  X,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";

const LoadingFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-success" />
      <p className="text-muted">Loading module...</p>
    </div>
  </div>
);

const moduleMap = import.meta.glob("../../modules/**/pages/*.tsx", {
  eager: false,
  import: "default",
});

const DynamicComponentLoader = ({ filePath }: { filePath: string }) => {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const modulePath = `../../${normalizedPath}.tsx`;

  const Component = useMemo(() => {
    return lazy(() =>
      (async () => {
        try {
          const moduleLoader = moduleMap[modulePath];
          if (!moduleLoader) {
            throw new Error(`Module not found: ${modulePath}`);
          }
          const defaultExport = await moduleLoader();
          return { default: defaultExport as ComponentType };
        } catch (error: unknown) {
          console.error(`Failed to load module ${normalizedPath}:`, error);
          return {
            default: (() => (
              <div className="flex h-96 flex-col items-center justify-center gap-4 text-red-500">
                <p className="text-lg font-semibold">Failed to load module</p>
                <p className="text-sm text-muted">{normalizedPath}</p>
                <p className="text-xs text-muted">
                  Check that the file exists and exports a default component
                </p>
              </div>
            )) as unknown as ComponentType,
          };
        }
      })(),
    );
  }, [modulePath, normalizedPath]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
};

const DashboardHome = () => {
  return (
    <div className="h-full w-full p-8">
      <div className="max-w-2xl rounded-2xl border border-border bg-surface/90 p-6 shadow-lg backdrop-blur">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">LGU Integrated Management System</h1>
            <p className="text-sm text-muted">Your workspace dashboard</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted">
          <p>Press <kbd className="px-1.5 py-0.5 rounded bg-border text-xs font-mono">Ctrl+K</kbd> to quickly search for modules</p>
          <p>Use keyboard shortcuts to navigate faster</p>
        </div>
      </div>
    </div>
  );
};

import { ThemeColorProvider } from "@/modules/rptas/context/ThemeColorContext";
import { AlertProvider } from "@/modules/rptas/context/AlertContext";
import { AuthProvider } from "@/modules/rptas/context/AuthContext";
import { SidebarProvider } from "@/modules/rptas/context/SidebarContext";
import { LayoutToggleProvider } from "@/modules/rptas/context/LayoutToggleContext";
import { MigrationCartProvider } from "@/modules/rptas/context/MigrationCartContext";
import { ThemeProvider as RptasThemeProvider } from "@/modules/rptas/context/ThemeContext";
import CustomAlert from "@/modules/rptas/shared/components/common/CustomAlert";
import PropertyApproval from "@/modules/rptas/domains/approvals/pages/PropertyApproval";



const componentRegistry: Record<string, LazyExoticComponent<ComponentType>> = {
  "modules/system-admin/pages/UserActivation": lazy(
    () => import("@/modules/system-admin/pages/UserActivation"),
  ),
  "modules/system-admin/pages/RoleManagement": lazy(
    () => import("@/modules/system-admin/pages/RoleManagement"),
  ),
  "modules/system-admin/pages/UserManagement": lazy(
    () => import("@/modules/system-admin/pages/UserManagement"),
  ),
  "modules/system-admin/pages/ModuleManagement": lazy(
    () => import("@/modules/system-admin/pages/ModuleManagement"),
  ),
  "modules/system-admin/pages/FacilitiesManagement": lazy(
    () => import("@/modules/system-admin/pages/FacilitiesManagement"),
  ),
  "modules/system-admin/pages/RoleModuleAccessManagement": lazy(
    () => import("@/modules/system-admin/pages/RoleModuleAccessManagement"),
  ),
  "modules/system-admin/pages/RolePermissionsManagement": lazy(
    () => import("@/modules/system-admin/pages/RolePermissionsManagement"),
  ),
  "modules/system-admin/pages/SystemAdminSetup": lazy(
    () => import("@/modules/system-admin/pages/SystemAdminSetup"),
  ),
  "modules/rptas/domains/faas/pages/DataEntryPage": lazy(
    () => import("@/modules/rptas/domains/faas/pages/DataEntryPage"),

  ),
  "modules/rptas/domains/migration/MigrationCartPage": lazy(
    () => import("@/modules/rptas/domains/migration/MigrationCartPage"),
  ),
  "modules/rptas/domains/migration/MigrationCartIndicator": lazy(
    () => import("@/modules/rptas/domains/migration/MigrationCartIndicator"),
  ),
  "modules/rptas/domains/RPT-management/faas/rpt_m_RealPropertyDataEntry": lazy(
    () => import("@/modules/rptas/domains/RPT-management/faas/rpt_m_RealPropertyDataEntry"),
  ),
  "modules/rptas/domains/approvals/pages/MunicipalApprovals": lazy(
    () => import("@/modules/rptas/domains/approvals/pages/MunicipalApprovals"),
  ),
  "modules/rptas/domains/approvals/pages/ProvincialApprovals": lazy(
    () => import("@/modules/rptas/domains/approvals/pages/ProvincialApprovals"),
  ),
  "modules/rptas/domains/approvals/pages/PropertyApproval": lazy(
    () => import("@/modules/rptas/domains/approvals/pages/PropertyApproval"),
  ),
  "modules/rptas/domains/tracking/pages/PropertyTrackingPage": lazy(
    () => import("@/modules/rptas/domains/tracking/pages/PropertyTrackingPage"),
  ),
  "modules/rptas/domains/RPT-management/pages/SignatorySetupPage": lazy(
    () => import("@/modules/rptas/domains/RPT-management/pages/SignatorySetupPage"),
  ),
  "modules/rptas/domains/treasury/domains/oop/pages/OrderOfPaymentPage": lazy(
    () => import("@/modules/rptas/domains/treasury/domains/oop/pages/OrderOfPaymentPage"),
  ),
  "modules/rptas/domains/treasury/domains/payors/pages/PayorsRegistryPage": lazy(
    () => import("@/modules/rptas/domains/treasury/domains/payors/pages/PayorRegistryPage"),
  ),
  "modules/rptas/domains/treasury/domains/reports/pages/TreasuryPaymentsReportPage": lazy(
    () => import("@/modules/rptas/domains/treasury/domains/reports/pages/TreasuryPaymentsReportPage"),
  ),
  "modules/rptas/domains/treasury/domains/payments/pages/TreasuryConfirmPage": lazy(
    () => import("@/modules/rptas/domains/treasury/domains/payments/pages/TreasuryConfirmPage"),
  ),
  "modules/rptas/domains/references/pages/BarangayPage": lazy(
    () => import("@/modules/rptas/domains/references/pages/BarangayPage"),
  ),
  "modules/rptas/domains/references/pages/CityBarangayAssignmentPage": lazy(
    () => import("@/modules/rptas/domains/references/pages/CityBarangayAssignmentPage"),
  ),
  "modules/rptas/domains/references/pages/ActualUseSetupPage": lazy(
    () => import("@/modules/rptas/domains/references/pages/ActualUseSetupPage"),
  ),
  "modules/rptas/domains/references/pages/ActualUseRatePage": lazy(
    () => import("@/modules/rptas/domains/references/pages/ActualUseRatePage"),
  ),
  "modules/rptas/domains/references/pages/BuildingUnitCostSetupPage": lazy(
    () => import("@/modules/rptas/domains/references/pages/BuildingUnitCostSetupPage"),
  ),
  "modules/rptas/domains/references/pages/BuildingUnitCostSetManagementPage": lazy(
    () => import("@/modules/rptas/domains/references/pages/BuildingUnitCostSetManagementPage"),
  )
  

 



  


  
};

type AppKind = "home" | "profile" | "settings" | "registry" | "dynamic";

interface DesktopApp {
  id: string;
  title: string;
  routePath: string;
  categoryKey: string;
  icon: LucideIcon;
  kind: AppKind;
  filePath?: string;
  registryKey?: string;
}

interface DesktopCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  items: DesktopApp[];
}

const normalizeRoutePath = (routePath: string): string => {
  if (!routePath || routePath === "/") return "/";
  return routePath.startsWith("/") ? routePath : `/${routePath}`;
};

const formatCategoryLabel = (value: string): string => {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const categoryIconMap: Record<string, LucideIcon> = {
  MAIN: LayoutDashboard,
  BUDGET: Wallet,
  USER: User,
  "SYSTEM ADMIN": Shield,
  ACCOUNTING: Calculator,
  "MY OFFICE": Briefcase,
  "HR & PAYROLL": Users,
};

const resolveCategoryIcon = (
  categoryKey: string,
  firstItemIcon?: LucideIcon,
): LucideIcon => {
  return categoryIconMap[categoryKey] ?? firstItemIcon ?? Folder ?? Cpu;
};

// =====================================================
// SIDEBAR NAVIGATION COMPONENT
// =====================================================
interface SidebarNavigationProps {
  apps: DesktopApp[];
  categories: DesktopCategory[];
  activeApp: DesktopApp | null;
  openApps: DesktopApp[];
  onOpenApp: (app: DesktopApp) => void;
  onToggleFavorite: (appId: string) => void;
  favorites: string[];
  recentApps: string[];
}

const SidebarNavigation = ({
  apps,
  categories,
  activeApp,
  openApps,
  onOpenApp,
  onToggleFavorite,
  favorites,
  recentApps,
}: SidebarNavigationProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.key)),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const query = searchQuery.toLowerCase();
    return apps.filter(
      (app) =>
        app.title.toLowerCase().includes(query) ||
        app.categoryKey.toLowerCase().includes(query),
    );
  }, [apps, searchQuery]);

  const favoriteApps = useMemo(
    () => apps.filter((app) => favorites.includes(app.id)),
    [apps, favorites],
  );

  const recentAppsList = useMemo(
    () =>
      recentApps
        .map((id) => apps.find((app) => app.id === id))
        .filter((app): app is DesktopApp => Boolean(app))
        .slice(0, 5),
    [apps, recentApps],
  );

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-surface transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        {!sidebarCollapsed && (
          <h2 className="text-sm font-semibold text-foreground">Navigation</h2>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "rounded-lg p-1.5 text-muted transition-colors hover:bg-border hover:text-foreground",
            sidebarCollapsed && "mx-auto",
          )}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <List className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Search */}
      {!sidebarCollapsed && (
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-success focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto">
        {/* Favorites Section */}
        {!sidebarCollapsed && favoriteApps.length > 0 && (
          <div className="px-2 py-1">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Favorites
            </p>
            <div className="space-y-0.5">
              {favoriteApps.map((app) => {
                const Icon = app.icon || Cpu;
                const isActive = activeApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => onOpenApp(app)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onOpenApp(app);
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-success/15 text-success"
                        : "text-foreground hover:bg-border/50",
                    )}
                    title={app.title}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{app.title}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(app.id);
                      }}
                      className="ml-auto rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-border transition-opacity"
                      title="Remove from favorites"
                    >
                      <Star className="h-3 w-3 fill-success text-success" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Apps Section */}
        {!sidebarCollapsed && recentAppsList.length > 0 && !searchQuery && (
          <div className="px-2 py-1">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Recent
            </p>
            <div className="space-y-0.5">
              {recentAppsList.map((app) => {
                const Icon = app.icon || Cpu;
                const isActive = activeApp?.id === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => onOpenApp(app)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-success/15 text-success"
                        : "text-foreground hover:bg-border/50",
                    )}
                    title={app.title}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{app.title}</span>
                    {openApps.some((a) => a.id === app.id) && !isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {!searchQuery ? (
          categories.map((category) => {
            const Icon = category.icon || Cpu;
            const isExpanded = expandedCategories.has(category.key);
            const isEmpty = category.items.length === 0;
            const hasOpenApps = category.items.some((item) => openApps.some((a) => a.id === item.id));

            return (
              <div key={category.key} className="px-2 py-1">
                <button
                  onClick={() => toggleCategory(category.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                    isExpanded
                      ? "bg-border/50 text-foreground"
                      : "text-foreground hover:bg-border/50",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{category.label}</span>
                      {hasOpenApps && (
                        <span className="ml-auto mr-1 h-1.5 w-1.5 rounded-full bg-success/70" />
                      )}
                      {isEmpty ? (
                        <span className="text-[10px] text-muted">
                          {isExpanded ? "−" : "+"}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "text-muted transition-transform duration-200",
                            isExpanded ? "rotate-90" : "",
                          )}
                        >
                          ▶
                        </span>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && hasOpenApps && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success/70" />
                  )}
                </button>

                {isExpanded && !sidebarCollapsed && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                    {category.items.map((app) => {
                      const AppIcon = app.icon || Cpu;
                      const isActive = activeApp?.id === app.id;
                      const isOpen = openApps.some((a) => a.id === app.id);

                      return (
                        <div
                          key={app.id}
                          onClick={() => onOpenApp(app)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onOpenApp(app);
                          }}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-success/15 text-success"
                              : "text-foreground hover:bg-border/50",
                          )}
                          title={app.title}
                        >
                          <AppIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{app.title}</span>
                          {isOpen && !isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(app.id);
                            }}
                            className="ml-auto rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-border transition-opacity"
                            title={favorites.includes(app.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            {favorites.includes(app.id) ? (
                              <Star className="h-3 w-3 fill-success text-success" />
                            ) : (
                              <StarOff className="h-3 w-3 text-muted" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Search Results */
          !sidebarCollapsed && (
            <div className="px-2 py-1">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                Results ({filteredApps.length})
              </p>
              <div className="space-y-0.5">
                {filteredApps.map((app) => {
                  const Icon = app.icon || Cpu;
                  const isActive = activeApp?.id === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => onOpenApp(app)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-success/15 text-success"
                          : "text-foreground hover:bg-border/50",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{app.title}</span>
                      <span className="ml-auto text-[10px] text-muted">
                        {app.categoryKey}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Bottom Keyboard Shortcuts */}
      {!sidebarCollapsed && (
        <div className="border-t border-border p-2">
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-border px-1 py-0.5 font-mono">⌘K</kbd>
              <span>Search</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-border px-1 py-0.5 font-mono">[</kbd>
              <span>Toggle</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================
// MAIN DASHBOARD
// =====================================================
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userModules } = useRBAC();
  // SYSTEM ADMIN navigation is gated solely by the VITE_FORCE_ADMIN env flag.
  // When it's not "true", the dock entries are absent AND no app entry exists
  // for the /system-admin/* routes, so direct URL access falls through to
  // DashboardHome — the pages are neither visible nor reachable.
  const adminEnabled = import.meta.env.VITE_FORCE_ADMIN === "true";
  const {
    navigationUI,
    recentApps,
    favoriteApps,
    sidebarCollapsed,
    setSidebarCollapsed,
    dockStyle,
    addRecentApp,
    toggleFavoriteApp,
  } = useSettingsStore();

  // Dock style sizes
  const dockSizes = {
    compact: { dockH: 'h-14', iconSize: 'h-5 w-5', textSize: 'text-[9px]', btnMinW: 'min-w-[70px]', btnH: 'h-12', gap: 'gap-1.5' },
    comfortable: { dockH: 'h-16', iconSize: 'h-6 w-6', textSize: 'text-[10px]', btnMinW: 'min-w-[80px]', btnH: 'h-14', gap: 'gap-2' },
    expanded: { dockH: 'h-[76px]', iconSize: 'h-7 w-7', textSize: 'text-[11px]', btnMinW: 'min-w-[90px]', btnH: 'h-[60px]', gap: 'gap-3' },
  };

  const dockSize = dockSizes[dockStyle] || dockSizes.comfortable;

  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabRoutes, setTabRoutes] = useState<Record<string, string>>({});
  const tabRoutesRef = useRef<Record<string, string>>({});
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>("MAIN");
  const [now, setNow] = useState(() => new Date());
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeDockCategory, setActiveDockCategory] = useState<string | null>(null);

  useEffect(() => {
    tabRoutesRef.current = tabRoutes;
  }, [tabRoutes]);

  const apps = useMemo<DesktopApp[]>(() => {
    const baseApps: DesktopApp[] = [
      {
        id: "main-dashboard-home",
        title: "Dashboard",
        routePath: "/",
        categoryKey: "MAIN",
        icon: LayoutDashboard,
        kind: "home",
      },
      {
        id: "user-profile",
        title: "User Profile",
        routePath: "/profile",
        categoryKey: "USER",
        icon: User,
        kind: "profile",
      },
      {
        id: "user-settings",
        title: "Settings",
        routePath: "/settings",
        categoryKey: "USER",
        icon: SettingsIcon,
        kind: "settings",
      },
      {
        // Workflow infrastructure, not a dockable page: HIDDEN from nav and
        // reached by direct navigation from the cart indicator. Kept hardcoded
        // so the migration flow stays reachable regardless of RBAC assignment.
        id: "migration-cart",
        title: "Migration Cart",
        routePath: "/migration-cart",
        categoryKey: "HIDDEN",
        icon: ShoppingCart,
        kind: "registry",
        registryKey: "modules/rptas/domains/migration/MigrationCartPage",
      },
      // NOTE: RPTAS feature pages (Property Approval, Property Tracking,
      // Signatory Setup, Building Unit Cost Sets) are intentionally NOT
      // hardcoded here. They are driven by the `modules` catalog and gated by
      // RBAC (role -> module access), surfacing via the `dynamicApps` mapping
      // below. Seed them via `npm run seed-modules` and assign to roles.
    ];

    // System Administration — only present when VITE_FORCE_ADMIN=true. When
    // disabled, these entries are absent from `apps`, which means:
    //   - the dock/sidebar shows no SYSTEM ADMIN category
    //   - no openApp() call resolves to a system-admin route
    //   - URL-based access (/dashboard/system-admin/*) fails to match any
    //     app in the location effect and quietly falls back to DashboardHome
    const systemAdminApps: DesktopApp[] = adminEnabled
      ? [
          {
            id: "sys-admin-setup",
            title: "System Admin Setup",
            routePath: "/system-admin/setup",
            categoryKey: "SYSTEM ADMIN",
            icon: Wrench,
            kind: "registry",
            registryKey: "modules/system-admin/pages/SystemAdminSetup",
          },
          {
            id: "sys-admin-modules",
            title: "Module Management",
            routePath: "/system-admin/modules",
            categoryKey: "SYSTEM ADMIN",
            icon: Blocks,
            kind: "registry",
            registryKey: "modules/system-admin/pages/ModuleManagement",
          },
          {
            id: "sys-admin-roles",
            title: "Role Management",
            routePath: "/system-admin/roles",
            categoryKey: "SYSTEM ADMIN",
            icon: Shield,
            kind: "registry",
            registryKey: "modules/system-admin/pages/RoleManagement",
          },
          {
            id: "sys-admin-role-modules",
            title: "Role → Module Access",
            routePath: "/system-admin/role-module-access",
            categoryKey: "SYSTEM ADMIN",
            icon: KeyRound,
            kind: "registry",
            registryKey: "modules/system-admin/pages/RoleModuleAccessManagement",
          },
          {
            id: "sys-admin-role-permissions",
            title: "Role Permissions",
            routePath: "/system-admin/role-permissions",
            categoryKey: "SYSTEM ADMIN",
            icon: KeySquare,
            kind: "registry",
            registryKey: "modules/system-admin/pages/RolePermissionsManagement",
          },
          {
            id: "sys-admin-users",
            title: "User Management",
            routePath: "/system-admin/users",
            categoryKey: "SYSTEM ADMIN",
            icon: Users,
            kind: "registry",
            registryKey: "modules/system-admin/pages/UserManagement",
          },
          {
            id: "sys-admin-user-activation",
            title: "User Activation",
            routePath: "/system-admin/user-activation",
            categoryKey: "SYSTEM ADMIN",
            icon: UserCheck,
            kind: "registry",
            registryKey: "modules/system-admin/pages/UserActivation",
          },
          {
            id: "sys-admin-facilities",
            title: "Facilities",
            routePath: "/system-admin/facilities",
            categoryKey: "SYSTEM ADMIN",
            icon: Building2,
            kind: "registry",
            registryKey: "modules/system-admin/pages/FacilitiesManagement",
          },
        ]
      : [];

    const dynamicApps = userModules.map((module) => {
      const normalizedRoute = normalizeRoutePath(module.route_path);
      const normalizedPath = module.file_path?.replace(/\\/g, "/") || "";
      const isLegacyModule = normalizedPath in componentRegistry;

      return {
        id: `module-${module.id}`,
        title: module.module_name,
        routePath: normalizedRoute,
        categoryKey: (module.category || "MODULES").toUpperCase(),
        icon: getIconByName(module.icons),
        kind: isLegacyModule ? "registry" : "dynamic",
        filePath: module.file_path || "",
        registryKey: normalizedPath,
      } satisfies DesktopApp;
    });

    // Drop any dynamic (DB-driven) module whose routePath collides with a
    // static system-admin app — the static one wins so the bootstrap UI
    // can't be accidentally hidden by a misconfigured `modules` row.
    const staticRoutes = new Set([
      ...baseApps.map((a) => a.routePath),
      ...systemAdminApps.map((a) => a.routePath),
    ]);
    const dedupedDynamic = dynamicApps.filter(
      (a) => !staticRoutes.has(a.routePath),
    );

    return [...baseApps, ...systemAdminApps, ...dedupedDynamic];
  }, [userModules, adminEnabled]);

  const appMap = useMemo(() => {
    return new Map(apps.map((app) => [app.id, app]));
  }, [apps]);

  const categories = useMemo<DesktopCategory[]>(() => {
    const grouped = new Map<string, DesktopApp[]>();

    for (const app of apps) {
      if (!grouped.has(app.categoryKey)) {
        grouped.set(app.categoryKey, []);
      }
      grouped.get(app.categoryKey)?.push(app);
    }

    const orderedKeys = Array.from(grouped.keys())
      .filter((key) => key !== "HIDDEN")
      .sort((a, b) => {
      if (a === "MAIN") return -1;
      if (b === "MAIN") return 1;
      if (a === "USER") return 1;
      if (b === "USER") return -1;
      return a.localeCompare(b);
    });

    return orderedKeys.map((key) => {
      const items = grouped.get(key) ?? [];
      return {
        key,
        label: formatCategoryLabel(key),
        icon: resolveCategoryIcon(key, items[0]?.icon),
        items,
      };
    });
  }, [apps]);

  useEffect(() => {
    if (!categories.some((category) => category.key === selectedCategoryKey)) {
      setSelectedCategoryKey(categories[0]?.key ?? "MAIN");
    }
  }, [categories, selectedCategoryKey]);

  const openTabs = useMemo(() => {
    return openTabIds
      .map((id) => appMap.get(id))
      .filter((app): app is DesktopApp => Boolean(app));
  }, [openTabIds, appMap]);

  const openAppsSet = useMemo(() => {
    return new Set(openTabs.map((app) => app.id));
  }, [openTabs]);

  const activeApp = activeTabId ? appMap.get(activeTabId) ?? null : null;

  const openApp = useCallback(
    (app: DesktopApp, options?: { navigateToRoute?: boolean }) => {
      const navigateToRoute = options?.navigateToRoute ?? true;

      setSelectedCategoryKey(app.categoryKey);
      setOpenTabIds((current) =>
        current.includes(app.id) ? current : [...current, app.id],
      );
      setActiveTabId(app.id);
      addRecentApp(app.id);

      if (navigateToRoute) {
        const targetRoute =
          tabRoutesRef.current[app.id] ||
          (app.routePath === "/" ? "/dashboard" : `/dashboard${app.routePath}`);
        navigate(
          targetRoute,
        );
      }
    },
    [navigate, addRecentApp],
  );

  const activateTab = useCallback(
    (tabId: string, options?: { navigateToRoute?: boolean }) => {
      const navigateToRoute = options?.navigateToRoute ?? true;
      const app = appMap.get(tabId);
      if (!app) return;

      setActiveTabId(tabId);
      setSelectedCategoryKey(app.categoryKey);
      addRecentApp(app.id);

      if (navigateToRoute) {
        const targetRoute =
          tabRoutesRef.current[app.id] ||
          (app.routePath === "/" ? "/dashboard" : `/dashboard${app.routePath}`);
        navigate(
          targetRoute,
        );
      }
    },
    [appMap, navigate, addRecentApp],
  );

  // Programmatic navigation requested by feature pages (e.g. "use this payor in
  // the Order of Payment"). Guarantees the target tab opens/activates regardless
  // of the current URL/tab state, which plain navigate() can miss.
  useEffect(() => {
    const handler = (e: Event) => {
      const routePath = (e as CustomEvent<{ routePath?: string }>).detail?.routePath;
      if (!routePath) return;
      const target = apps.find((a) => a.routePath === routePath);
      if (target) openApp(target);
    };
    window.addEventListener("app:navigate", handler);
    return () => window.removeEventListener("app:navigate", handler);
  }, [apps, openApp]);

  const closeTab = useCallback(
    (tabId: string) => {
      const index = openTabIds.indexOf(tabId);
      if (index === -1) return;

      const next = openTabIds.filter((id) => id !== tabId);
      setOpenTabIds(next);
      setTabRoutes((current) => {
        const { [tabId]: _removed, ...rest } = current;
        return rest;
      });

      if (activeTabId !== tabId) return;

      const fallbackId = next[index - 1] || next[index] || next[0] || null;
      setActiveTabId(fallbackId);

      if (fallbackId) {
        const fallbackApp = appMap.get(fallbackId);
        if (fallbackApp) {
          setSelectedCategoryKey(fallbackApp.categoryKey);
          navigate(
            fallbackApp.routePath === "/"
              ? "/dashboard"
              : `/dashboard${fallbackApp.routePath}`,
          );
          return;
        }
      }

      navigate("/dashboard");
    },
    [activeTabId, appMap, navigate, openTabIds],
  );

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        await toggleFullscreen();
        return;
      }

      if (event.key.toLowerCase() === "[") {
        if (navigationUI === "sidebar") {
          event.preventDefault();
          setSidebarCollapsed(!sidebarCollapsed);
        }
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        if (!activeTabId) return;
        event.preventDefault();
        closeTab(activeTabId);
        return;
      }

      if (event.ctrlKey && event.key === "Tab") {
        if (openTabIds.length <= 1) return;
        event.preventDefault();
        const currentIndex = activeTabId
          ? openTabIds.indexOf(activeTabId)
          : -1;
        const nextIndex =
          currentIndex === -1
            ? 0
            : (currentIndex + 1) % openTabIds.length;
        activateTab(openTabIds[nextIndex]);
        return;
      }

      if (event.altKey && /^\d$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < categories.length) {
          event.preventDefault();
          setSelectedCategoryKey(categories[index].key);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activateTab,
    activeTabId,
    categories,
    closeTab,
    navigationUI,
    openTabIds,
    setSidebarCollapsed,
    sidebarCollapsed,
    toggleFullscreen,
  ]);

  useEffect(() => {
    const routePath = normalizeRoutePath(
      location.pathname.replace(/^\/dashboard/, "") || "/",
    );
    const targetApp = apps.find((app) => app.routePath === routePath);
    if (!targetApp) return;

    setTabRoutes((current) => ({
      ...current,
      [targetApp.id]: `${location.pathname}${location.search || ""}`,
    }));
    openApp(targetApp, { navigateToRoute: false });
  }, [apps, location.pathname, location.search, openApp]);

  const renderAppContent = (app: DesktopApp) => {
    let content;
    switch (app.kind) {
      case "home":
        content = <DashboardHome />;
        break;
      case "profile":
        content = <UserProfile />;
        break;
      case "settings":
        content = <Settings />;
        break;
      case "registry": {
        const Component = app.registryKey
          ? componentRegistry[app.registryKey]
          : undefined;

        if (!Component) {
          content = (
            <div className="flex h-full items-center justify-center text-muted">
              Module component is not available.
            </div>
          );
        } else {
          content = (
            <Suspense fallback={<LoadingFallback />}>
              <Component />
            </Suspense>
          );
        }
        break;
      }
      case "dynamic":
      default:
        content = <DynamicComponentLoader filePath={app.filePath || ""} />;
        break;
    }
    
    // Check if the component belongs to rptas and needs its context providers
    if (app.filePath?.includes("rptas") || app.registryKey?.includes("rptas")) {
      return (
        <ThemeColorProvider>
          <RptasThemeProvider>
            <AlertProvider>
              <AuthProvider>
                <SidebarProvider>
                  <LayoutToggleProvider>
                    <MigrationCartProvider>
                      <CustomAlert />
                      {content}
                    </MigrationCartProvider>
                  </LayoutToggleProvider>
                </SidebarProvider>
              </AuthProvider>
            </AlertProvider>
          </RptasThemeProvider>
        </ThemeColorProvider>
      );
    }
    
    return content;
  };

  // =====================================================
  // RENDER
  // =====================================================
  if (navigationUI === "sidebar") {
    return (
      <div className="relative flex h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <SidebarNavigation
          apps={apps}
          categories={categories}
          activeApp={activeApp}
          openApps={openTabs}
          onOpenApp={openApp}
          onToggleFavorite={toggleFavoriteApp}
          favorites={favoriteApps}
          recentApps={recentApps}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 border-b border-border bg-surface/95 px-2 py-1.5 backdrop-blur">
            {openTabs.length === 0 && (
              <div className="ml-2 flex items-center gap-2 text-sm text-muted">
                <Keyboard className="h-4 w-4" />
                Press <kbd className="px-1 py-0.5 rounded bg-border text-xs">Ctrl+K</kbd> to search
              </div>
            )}
            {openTabs.map((tab) => {
              const Icon = tab.icon || Cpu;
              const active = activeTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1",
                    active
                      ? "border-success bg-success/10 text-success"
                      : "border-border bg-background text-muted hover:bg-border/50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => activateTab(tab.id)}
                    className="flex items-center gap-1.5 text-sm"
                    title={tab.title}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="max-w-32 truncate">{tab.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => closeTab(tab.id)}
                    className="rounded p-0.5 hover:bg-border/70"
                    aria-label={`Close ${tab.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setCommandOpen(true)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted hover:bg-border/50"
              title="Search modules (Ctrl+K)"
            >
              <Search className="h-3 w-3" />
              <kbd className="font-mono">Ctrl+K</kbd>
            </button>

            {/* Logout button - Upper right in sidebar mode */}
            <button
              type="button"
              onClick={() => useAuthStore.getState().logout()}
              className="ml-2 flex items-center gap-2 rounded-md bg-red-500 px-3 py-2 text-xs text-white transition-colors hover:bg-red-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-4">
            <div className="h-full overflow-auto rounded-lg border border-border bg-surface/70">
              {activeApp ? renderAppContent(activeApp) : <DashboardHome />}
            </div>
          </div>
        </div>

        {/* Command Palette */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl">
              <CommandInput
                placeholder="Search modules..."
                className="w-full border-b border-border px-4 py-3 text-sm outline-none placeholder:text-muted"
              />
              <CommandList className="max-h-80 overflow-y-auto p-2">
                <CommandEmpty className="py-6 text-center text-sm text-muted">
                  No results found.
                </CommandEmpty>
                <CommandGroup heading="Modules">
                  {apps.map((app) => {
                    const Icon = app.icon || Cpu;
                    return (
                      <CommandItem
                        key={app.id}
                        value={app.title}
                        onSelect={() => {
                          openApp(app);
                          setCommandOpen(false);
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-border/50"
                      >
                        <Icon className="h-4 w-4 text-muted" />
                        <span className="flex-1">{app.title}</span>
                        <span className="text-xs text-muted">
                          {app.categoryKey}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </div>
          </div>
        </CommandDialog>
      </div>
    );
  }

  // =====================================================
  // DESKTOP MODE (Bottom Dock with Popup Dialog)
  // =====================================================
  const activeDockCategoryData = categories.find((c) => c.key === activeDockCategory);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-surface" />
      <div className="absolute inset-0 z-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,_var(--color-border)_1px,_transparent_0)] [background-size:24px_24px]" />

      {/* Top Tab Bar */}
      <div className="absolute left-0 right-0 top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex h-12 items-center gap-1 overflow-x-auto px-2">
          {openTabs.map((tab) => {
            const Icon = tab.icon || Cpu;
            const active = activeTabId === tab.id;

            return (
              <div
                key={tab.id}
                className={cn(
                  "group flex shrink-0 items-center gap-1 rounded-md border pl-2 pr-1 transition-all",
                  active
                    ? "border-success bg-success/10 text-success shadow-sm"
                    : "border-border bg-background/80 text-muted hover:bg-border/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => activateTab(tab.id)}
                  className="flex items-center gap-2 py-1.5 text-sm"
                  title={tab.title}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-36 truncate">{tab.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => closeTab(tab.id)}
                  className="rounded p-0.5 hover:bg-border transition-colors"
                  aria-label={`Close ${tab.title}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {openTabs.length === 0 && (
            <div className="ml-2 flex items-center gap-2 text-sm text-muted">
              <Keyboard className="h-4 w-4" />
              Press <kbd className="mx-1 rounded bg-border px-1.5 py-0.5 text-xs">Ctrl+K</kbd> to search
            </div>
          )}

          {/* Quick Search */}
          <button
            onClick={() => setCommandOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs text-muted transition-all hover:bg-border/50 hover:text-foreground"
          >
            <Search className="h-3 w-3" />
            <kbd className="rounded bg-border px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Center Content */}
      <div className={cn("absolute inset-x-0 top-12 z-20 overflow-auto p-4", dockStyle === 'compact' ? "bottom-14" : dockStyle === 'expanded' ? "bottom-[76px]" : "bottom-16")}>
        <div
          className={cn(
            "h-full w-full overflow-auto rounded-xl border border-border bg-surface/70 shadow-sm",
            activeApp?.routePath?.includes("rpt-management") || activeApp?.routePath?.includes("rpt/dashboard")
              ? "no-scrollbar"
              : "",
          )} 
        >
          {activeApp ? renderAppContent(activeApp) : <DashboardHome />}
        </div>
      </div>

      {/* Category Popup Dialog - Floats above bottom dock with gap */}
      {activeDockCategory && activeDockCategoryData && (
        <>
          {/* Arrow indicator pointing down to the active category */}
          <div className={cn("absolute left-1/2 z-[60] -translate-x-1/2", dockStyle === 'compact' ? "bottom-[56px]" : dockStyle === 'expanded' ? "bottom-[78px]" : "bottom-[66px]")}>
            <div className="flex flex-col items-center">
              <span className="h-0 w-0 -mb-px border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-success" />
              <div className="h-3 w-3 rotate-45 bg-success" />
            </div>
          </div>

          <div
            className={cn("absolute inset-x-0 z-50 px-4", dockStyle === 'compact' ? "bottom-[68px]" : dockStyle === 'expanded' ? "bottom-[90px]" : "bottom-[78px]")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface/95 shadow-2xl backdrop-blur-sm">
              {/* Dialog Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = activeDockCategoryData.icon || Cpu;
                    return <Icon className="h-4 w-4 text-success" />;
                  })()}
                  <span className="text-sm font-medium">{activeDockCategoryData.label}</span>
                  <span className="text-xs text-muted">({activeDockCategoryData.items.length} items)</span>
                </div>
                <button
                  onClick={() => setActiveDockCategory(null)}
                  className="rounded-lg p-1 text-muted hover:bg-border hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dialog Content - Bubble hover items */}
              <div className="flex flex-wrap gap-3 p-4">
                {activeDockCategoryData.items.map((item) => {
                  const Icon = item.icon || Cpu;
                  const isActive = activeTabId === item.id;
                  const isOpen = openAppsSet.has(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        openApp(item);
                        setActiveDockCategory(null);
                      }}
                      className={cn(
                        "group relative flex h-20 w-28 flex-col items-center justify-center rounded-xl border-2 px-3 transition-all duration-200",
                        isActive
                          ? "border-success bg-success/15 text-success shadow-md scale-105"
                          : isOpen
                            ? "border-success/50 bg-success/10 text-success"
                            : "border-border bg-background/80 text-foreground hover:border-success/50 hover:bg-success/10 hover:shadow-lg hover:scale-105",
                      )}
                    >
                      {/* Bubble effect background */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-success/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                      <Icon className="h-6 w-6 relative z-10" />
                      <span className="mt-1.5 text-[10px] font-medium text-center leading-tight relative z-10">
                        {item.title}
                      </span>

                      {/* Open indicator */}
                      {isOpen && !isActive && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-success" />
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
                          <Star className="h-2 w-2 fill-current" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Dock - Category Icons - Dynamic size based on dockStyle */}
      <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
        <div className={cn("flex items-center justify-between gap-2 px-4", dockSize.dockH)}>
          {/* Left: Date/Time */}
          <div className="flex items-center gap-3 rounded-lg bg-background/50 px-3 py-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-4 w-4 text-success" />
              <span className="font-medium text-foreground">
                {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" />
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* Center: Category Icons */}
          <div className={cn("flex items-center justify-center", dockSize.gap)}>
            {categories.map((category) => {
              const Icon = category.icon || Cpu;
              const isActive = category.key === activeDockCategory;
              const hasOpenApps = category.items.some((item) => openAppsSet.has(item.id));

              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setActiveDockCategory(isActive ? null : category.key)}
                  className={cn(
                    "group relative flex shrink-0 flex-col items-center justify-center rounded-xl border-2 px-3 transition-all duration-200",
                    dockSize.btnH,
                    dockSize.btnMinW,
                    isActive
                      ? "border-success bg-success text-white shadow-lg scale-105"
                      : hasOpenApps
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-background/80 text-foreground hover:border-success/50 hover:bg-success/10 hover:shadow-md",
                  )}
                >
                  <Icon className={dockSize.iconSize} />
                  <span className={cn("mt-1 max-w-full truncate font-semibold leading-tight", dockSize.textSize)}>
                    {category.label}
                  </span>

                  {/* Open apps indicator */}
                  {hasOpenApps && !isActive && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Logout button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => useAuthStore.getState().logout()}
              className="flex items-center gap-2 rounded-md bg-red-500 px-3 py-2 text-xs text-white transition-colors hover:bg-red-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
            <CommandInput
              placeholder="Search modules..."
              className="w-full border-b border-border px-4 py-4 text-base outline-none placeholder:text-muted"
            />
            <CommandList className="max-h-80 overflow-y-auto p-2">
              <CommandEmpty className="py-6 text-center text-sm text-muted">
                No results found.
              </CommandEmpty>
              <CommandGroup heading="Modules">
                {apps.map((app) => {
                  const Icon = app.icon || Cpu;
                  return (
                    <CommandItem
                      key={app.id}
                      value={app.title}
                      onSelect={() => {
                        openApp(app);
                        setCommandOpen(false);
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-border/50"
                    >
                      <Icon className="h-4 w-4 text-muted" />
                      <span className="flex-1">{app.title}</span>
                      <span className="text-xs text-muted">{app.categoryKey}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </div>
        </div>
      </CommandDialog>
    </div>
  );
};

export default Dashboard;
