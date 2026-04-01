import React, { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const RPTASDashboardPage = lazy(() => import('../domains/dashboard/pages/DashboardPage'));
const FaasRecordsPage = lazy(() => import('../domains/faas/pages/FaasRecordsPage'));
const PropertiesPage = lazy(() => import('../domains/property/pages/PropertiesPage'));
const TaxAssessmentPage = lazy(() => import('../domains/assessment/pages/TaxAssessmentPage'));
const RPTASReportsPage = lazy(() => import('../domains/reports/pages/RPTASReportsPage'));
const RPTASSettingsPage = lazy(() => import('../domains/settings/pages/RPTASSettingsPage'));
const DataEntryPage = lazy(() => import('../domains/faas/pages/DataEntryPage'));
const DataEntryV2Page = lazy(() => import('../domains/faas/pages/DataEntryV2Page'));

// Define meta types to match the main app's routing structure if needed
export type AppRouteObject = RouteObject & {
  meta?: {
    title: string;
    icon?: string;
    permissionCode?: string;
    showInSidebar?: boolean;
    group?: string;
    order?: number;
  };
  children?: AppRouteObject[];
};

export const rptasRoutes: AppRouteObject[] = [
  {
    path: "/rptas",
    meta: {
      title: "RPTAS",
      icon: "Building2",
      permissionCode: "rptas.view",
      showInSidebar: true,
      group: "Assessment",
      order: 10,
    },
    children: [
      {
        index: true,
        element: React.createElement(RPTASDashboardPage),
        meta: {
          title: "Dashboard",
          icon: "LayoutDashboard",
          permissionCode: "rptas.dashboard.view",
          showInSidebar: true,
          group: "Assessment",
          order: 1,
        }
      },
      {
        path: "faas-records",
        element: React.createElement(FaasRecordsPage),
        meta: {
          title: "FAAS Records",
          icon: "FileText",
          permissionCode: "rptas.faas.view",
          showInSidebar: true,
          group: "Assessment",
          order: 2,
        }
      },
      {
        path: "properties",
        element: React.createElement(PropertiesPage),
        meta: {
          title: "Properties",
          icon: "Building2",
          permissionCode: "rptas.properties.view",
          showInSidebar: true,
          group: "Assessment",
          order: 3,
        }
      },
      {
        path: "assessment",
        element: React.createElement(TaxAssessmentPage),
        meta: {
          title: "Tax Assessment",
          icon: "FileText",
          permissionCode: "rptas.assessment.view",
          showInSidebar: true,
          group: "Assessment",
          order: 4,
        }
      },
      {
        path: "reports",
        element: React.createElement(RPTASReportsPage),
        meta: {
          title: "Reports",
          icon: "BarChart3",
          permissionCode: "rptas.reports.view",
          showInSidebar: true,
          group: "Assessment",
          order: 5,
        }
      },
      {
        path: "settings",
        element: React.createElement(RPTASSettingsPage),
        meta: {
          title: "Settings",
          icon: "Settings",
          permissionCode: "rptas.settings.view",
          showInSidebar: true,
          group: "Assessment",
          order: 6,
        }
      },
      {
        path: "data-entry",
        element: React.createElement(DataEntryPage),
        meta: {
          title: "Data Entry",
          icon: "ClipboardEdit",
          permissionCode: "rptas.data_entry.view",
          showInSidebar: true,
          group: "Assessment",
          order: 7,
        }
      },
      {
        path: "data-entry-v2",
        element: React.createElement(DataEntryV2Page),
        meta: {
          title: "RPT Management",
          icon: "ClipboardEdit",
          permissionCode: "rptas.data_entry.view",
          showInSidebar: true,
          group: "Assessment",
          order: 8,
        }
      }
    ]
  }
];
