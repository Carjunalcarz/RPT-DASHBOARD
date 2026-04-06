export const rptasNavigation = [
 



  {
    key: "rptas-data-entry",
    label: "Data Entry",
    path: "/rptas/data-entry",
    icon: "ClipboardEdit",
    showInSidebar: true,
    order: 1,
  },
  {
    key: "rptas-data-entry-v2",
    label: "RPT Management",
    path: "/rptas/data-entry-v2",
    icon: "ClipboardEdit",
    showInSidebar: true,
    order: 2,
  },
  {
    key: "rptas-pending-approvals",
    label: "Pending Approvals",
    path: "/rptas/pending-approvals",
    icon: "CheckSquare",
    showInSidebar: true,
    order: 3,
    children: [
      {
        key: "rptas-approvals-municipal",
        label: "Municipal Approvals",
        path: "/rptas/approvals/municipal",
        icon: "Building2",
      },
      {
        key: "rptas-approvals-provincial",
        label: "Provincial Approvals",
        path: "/rptas/approvals/provincial",
        icon: "Building2",
      }
    ]
  },
  {
    key: "treasury",
    label: "Treasury",
    icon: "CreditCard",
    showInSidebar: true,
    order: 4,
    children: [
      {
        key: "treasury-payments",
        label: "Payments",
        path: "/rptas/treasury",
        icon: "CreditCard",
        showInSidebar: true,
        order: 1,
      },
      {
        key: "treasury-oop",
        label: "Order of Payment",
        path: "/rptas/treasury/order",
        icon: "FileText",
        showInSidebar: true,
        order: 2,
      },
      {
        key: "treasury-confirm",
        label: "Treasury Confirm",
        path: "/rptas/treasury/confirm",
        icon: "CheckCircle",
        showInSidebar: true,
        order: 3,
      },
      {
        key: "treasury-payors",
        label: "Payor Registry",
        path: "/rptas/treasury/payors",
        icon: "User",
        showInSidebar: true,
        order: 4,
      },
      {
        key: "treasury-reports",
        label: "Treasury Reports",
        path: "/rptas/treasury/reports",
        icon: "BarChart3",
        showInSidebar: true,
        order: 5,
      }
    ]
  }
];
