import React, { lazy } from 'react';
import { RouteObject, Navigate } from 'react-router';

const ProfilePage = lazy(() => import('../domains/profile/pages/ProfilePage'));
const DataEntryPage = lazy(() => import('../domains/faas/pages/DataEntryPage'));
const DataEntryV2Page = lazy(() => import('../domains/faas/pages/DataEntryV2Page'));
const PropertyApproval = lazy(() => import('@/modules/rptas/domains/approvals/pages/PropertyApproval'));
const MunicipalApprovals = lazy(() => import('@/modules/rptas/domains/approvals/pages/MunicipalApprovals'));
const ProvincialApprovals = lazy(() => import('@/modules/rptas/domains/approvals/pages/ProvincialApprovals'));
const PropertyTrackingPage = lazy(() => import('@/modules/rptas/domains/tracking/pages/PropertyTrackingPage'));

const PaymentsPage = lazy(() => import('../domains/treasury/domains/payments/pages/PaymentsPage'));
const OrderOfPaymentPage = lazy(() => import('../domains/treasury/domains/oop/pages/OrderOfPaymentPage'));
const TreasuryConfirmPage = lazy(() => import('../domains/treasury/domains/payments/pages/TreasuryConfirmPage'));
const TreasuryPaymentsReportPage = lazy(() => import('../domains/treasury/domains/reports/pages/TreasuryPaymentsReportPage'));
const PayorRegistryPage = lazy(() => import('../domains/treasury/domains/payors/pages/PayorRegistryPage'));
const BarangayPage = lazy(() => import('../domains/references/pages/BarangayPage'));
const CityBarangayAssignmentPage = lazy(() => import('../domains/references/pages/CityBarangayAssignmentPage'));
const ActualUseSetupPage = lazy(() => import('../domains/references/pages/ActualUseSetupPage'));
const ActualUseRatePage = lazy(() => import('../domains/references/pages/ActualUseRatePage'));
const BuildingUnitCostSetupPage = lazy(() => import('../domains/references/pages/BuildingUnitCostSetupPage'));
const BuildingUnitCostSetManagementPage = lazy(() => import('../domains/references/pages/BuildingUnitCostSetManagementPage'));

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
        path: "approvals/municipal",
        element: React.createElement(MunicipalApprovals),
        meta: {
          title: "Municipal Approvals",
          icon: "Building2",
          permissionCode: "rptas.approvals.municipal",
          showInSidebar: true,
          group: "Assessment",
          order: 3,
        }
      },
      {
        path: "approvals/provincial",
        element: React.createElement(ProvincialApprovals),
        meta: {
          title: "Provincial Approvals",
          icon: "Landmark",
          permissionCode: "rptas.approvals.provincial",
          showInSidebar: true,
          group: "Assessment",
          order: 4,
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
        path: "property-tracking",
        element: React.createElement(PropertyTrackingPage),
        meta: {
          title: "Property Tracking",
          icon: "History",
          permissionCode: "rptas.tracking.view",
          showInSidebar: true,
          group: "Assessment",
          order: 5,
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
      },
      {
        path: "references/barangays",
        element: React.createElement(BarangayPage),
        meta: {
          title: "Barangay Registry",
          icon: "MapPin",
          showInSidebar: true,
          group: "References",
        }
      },
      {
        path: "references/city-barangay-mapping",
        element: React.createElement(CityBarangayAssignmentPage),
        meta: {
          title: "City-Barangay Mapping",
          icon: "Map",
          showInSidebar: true,
          group: "References",
        }
      },
      {
        path: "references/actual-use-setup",
        element: React.createElement(ActualUseSetupPage),
        meta: {
          title: "Actual Use Setup",
          icon: "Tags",
          showInSidebar: true,
          group: "References",
        }
      },
      {
        path: "references/classification-rates",
        element: React.createElement(ActualUseRatePage),
        meta: {
          title: "Actual Use Rates",
          icon: "Percent",
          showInSidebar: true,
          group: "References",
        }
      },
      {
        path: "references/building-unit-cost",
        element: React.createElement(BuildingUnitCostSetupPage),
        meta: {
          title: "Building Unit Cost Setup",
          icon: "Building2",
          showInSidebar: true,
          group: "References",
        }
      },
      {
        path: "references/building-unit-cost-sets",
        element: React.createElement(BuildingUnitCostSetManagementPage),
        meta: {
          title: "Building Unit Cost Sets",
          icon: "Layers",
          showInSidebar: true,
          group: "References",
        }
      }
    ]
  }
];
