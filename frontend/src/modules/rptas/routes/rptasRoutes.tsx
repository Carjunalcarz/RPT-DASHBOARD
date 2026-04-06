import React, { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
const FaasRecordsPage = lazy(() => import('../domains/faas/pages/FaasRecordsPage'));
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
        path: "data-entry",
        element: React.createElement(DataEntryPage),
        meta: {
          title: "Data Entry",
          icon: "ClipboardEdit",
          permissionCode: "rptas.data_entry.view",
          showInSidebar: true,
          group: "Assessment",
          order: 8,
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
          order: 9,
        }
      }
    ]
  }
];
