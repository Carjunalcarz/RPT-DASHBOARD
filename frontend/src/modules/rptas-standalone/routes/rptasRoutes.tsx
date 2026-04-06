import React, { lazy } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';

const ProfilePage = lazy(() => import('../domains/profile/pages/ProfilePage'));
const DataEntryPage = lazy(() => import('../domains/faas/pages/DataEntryPage'));
const DataEntryV2Page = lazy(() => import('../domains/faas/pages/DataEntryV2Page'));
const PropertyApproval = lazy(() => import('@/modules/rptas/domains/approvals/pages/PropertyApproval'));
const PendingApprovals = lazy(() => import('@/modules/rptas/domains/approvals/pages/PendingApprovals'));

const PaymentsPage = lazy(() => import('../domains/treasury/domains/payments/pages/PaymentsPage'));
const OrderOfPaymentPage = lazy(() => import('../domains/treasury/domains/oop/pages/OrderOfPaymentPage'));
const TreasuryConfirmPage = lazy(() => import('../domains/treasury/domains/payments/pages/TreasuryConfirmPage'));
const TreasuryPaymentsReportPage = lazy(() => import('../domains/treasury/domains/reports/pages/TreasuryPaymentsReportPage'));
const PayorRegistryPage = lazy(() => import('../domains/treasury/domains/payors/pages/PayorRegistryPage'));

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
        path: "pending-approvals",
        element: React.createElement(PendingApprovals),
        meta: {
          title: "Pending Approvals",
          icon: "CheckSquare",
          permissionCode: "rptas.approvals.view",
          showInSidebar: true,
          group: "Assessment",
          order: 3,
        }
      },
      {
        path: "approvals/municipal",
        element: React.createElement(PendingApprovals, { fixedStatus: "pending-municipal" }),
        meta: {
          title: "Municipal Approvals",
          icon: "Building2",
          permissionCode: "rptas.approvals.municipal",
          showInSidebar: true,
          group: "Assessment",
        }
      },
      {
        path: "approvals/provincial",
        element: React.createElement(PendingApprovals, { fixedStatus: "pending-provincial" }),
        meta: {
          title: "Provincial Approvals",
          icon: "Building2",
          permissionCode: "rptas.approvals.provincial",
          showInSidebar: true,
          group: "Assessment",
        }
      },
      {
        path: "property-approval/:id",
        element: React.createElement(PropertyApproval),
        meta: {
          title: "Property Approval",
          icon: "CheckSquare",
          permissionCode: "rptas.approvals.view",
          showInSidebar: false,
          group: "Assessment",
        }
      },
      {
        path: "profile",
        element: React.createElement(ProfilePage),
        meta: {
          title: "My Profile",
          icon: "User",
          permissionCode: "rptas.profile.view",
          showInSidebar: true,
          group: "Assessment",
          order: 7,
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
      },
      {
        path: "treasury",
        element: React.createElement(PaymentsPage),
        meta: {
          title: "Payments",
          icon: "CreditCard",
          showInSidebar: true,
        }
      },
      {
        path: "treasury/order",
        element: React.createElement(OrderOfPaymentPage),
        meta: {
          title: "Order of Payment",
          icon: "FileText",
          showInSidebar: true,
        }
      },
      {
        path: "treasury/confirm",
        element: React.createElement(TreasuryConfirmPage),
        meta: {
          title: "Treasury Confirm",
          icon: "CheckCircle",
          showInSidebar: true,
        }
      },
      {
        path: "treasury/payors",
        element: React.createElement(PayorRegistryPage),
        meta: {
          title: "Payor Registry",
          icon: "User",
          showInSidebar: true,
        }
      },
      {
        path: "treasury/reports",
        element: React.createElement(TreasuryPaymentsReportPage),
        meta: {
          title: "Treasury Reports",
          icon: "BarChart3",
          showInSidebar: true,
        }
      }
    ]
  }
];
