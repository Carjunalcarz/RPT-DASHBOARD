export const treasuryNavigation = [
  {
    key: "treasury",
    label: "Treasury",
    icon: "CreditCard",
    permissionCode: "treasury.view",
    showInSidebar: true,
    order: 20,
    children: [
      {
        key: "treasury-payments",
        label: "Payments",
        path: "/treasury",
        icon: "CreditCard",
        permissionCode: "treasury.payments.view",
        showInSidebar: true,
        order: 1,
      },
      {
        key: "treasury-oop",
        label: "Order of Payment",
        path: "/treasury/order",
        icon: "FileText",
        permissionCode: "treasury.oop.view",
        showInSidebar: true,
        order: 2,
      },
      {
        key: "treasury-confirm",
        label: "Treasury Confirm",
        path: "/treasury/confirm",
        icon: "CheckCircle",
        permissionCode: "treasury.confirm.view",
        showInSidebar: true,
        order: 3,
      },
      {
        key: "treasury-payors",
        label: "Payor Registry",
        path: "/treasury/payors",
        icon: "User",
        permissionCode: "treasury.payors.view",
        showInSidebar: true,
        order: 4,
      },
      {
        key: "treasury-reports",
        label: "Treasury Reports",
        path: "/treasury/reports",
        icon: "BarChart3",
        permissionCode: "treasury.reports.view",
        showInSidebar: true,
        order: 5,
      }
    ]
  }
];
