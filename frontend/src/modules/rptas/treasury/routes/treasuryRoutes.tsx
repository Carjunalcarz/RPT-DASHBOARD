import React, { lazy } from 'react';
import { AppRouteObject } from '../../routes/rptasRoutes';

const PaymentsPage = lazy(() => import('../domains/payments/pages/PaymentsPage'));
const OrderOfPaymentPage = lazy(() => import('../domains/oop/pages/OrderOfPaymentPage'));
const TreasuryConfirmPage = lazy(() => import('../domains/payments/pages/TreasuryConfirmPage'));
const PayorRegistryPage = lazy(() => import('../domains/payors/pages/PayorRegistryPage'));
const TreasuryPaymentsReportPage = lazy(() => import('../domains/reports/pages/TreasuryPaymentsReportPage'));

export const treasuryRoutes: AppRouteObject[] = [
  {
    path: "/treasury",
    meta: {
      title: "Treasury",
      icon: "CreditCard",
      permissionCode: "treasury.view",
      showInSidebar: true,
      group: "Treasury",
      order: 20,
    },
    children: [
      {
        index: true,
        element: React.createElement(PaymentsPage),
        meta: {
          title: "Payments",
          icon: "CreditCard",
          permissionCode: "treasury.payments.view",
          showInSidebar: true,
          group: "Treasury",
          order: 1,
        }
      },
      {
        path: "order",
        element: React.createElement(OrderOfPaymentPage),
        meta: {
          title: "Order of Payment",
          icon: "FileText",
          permissionCode: "treasury.oop.view",
          showInSidebar: true,
          group: "Treasury",
          order: 2,
        }
      },
      {
        path: "confirm",
        element: React.createElement(TreasuryConfirmPage),
        meta: {
          title: "Treasury Confirm",
          icon: "CheckCircle",
          permissionCode: "treasury.confirm.view",
          showInSidebar: true,
          group: "Treasury",
          order: 3,
        }
      },
      {
        path: "payors",
        element: React.createElement(PayorRegistryPage),
        meta: {
          title: "Payor Registry",
          icon: "User",
          permissionCode: "treasury.payors.view",
          showInSidebar: true,
          group: "Treasury",
          order: 4,
        }
      },
      {
        path: "reports",
        element: React.createElement(TreasuryPaymentsReportPage),
        meta: {
          title: "Treasury Reports",
          icon: "BarChart3",
          permissionCode: "treasury.reports.view",
          showInSidebar: true,
          group: "Treasury",
          order: 5,
        }
      }
    ]
  }
];
