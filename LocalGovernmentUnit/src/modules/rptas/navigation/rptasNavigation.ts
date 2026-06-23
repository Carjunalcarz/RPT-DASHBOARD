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
    key: "rptas-approvals-municipal",
    label: "Municipal Approvals",
    path: "/rptas/approvals/municipal",
    icon: "Building2",
    showInSidebar: true,
    order: 3,
  },
  {
    key: "rptas-approvals-provincial",
    label: "Provincial Approvals",
    path: "/rptas/approvals/provincial",
    icon: "Landmark",
    showInSidebar: true,
    order: 4,
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
  },
  {
    key: "references",
    label: "References",
    icon: "Database",
    showInSidebar: true,
    order: 5,
    children: [
      {
        key: "references-barangay",
        label: "Barangay Registry",
        path: "/rptas/references/barangays",
        icon: "MapPin",
        showInSidebar: true,
        order: 1,
      },
      {
        key: "references-city-barangay",
        label: "City-Barangay Mapping",
        path: "/rptas/references/city-barangay-mapping",
        icon: "Map",
        showInSidebar: true,
        order: 2,
      },
      {
        key: "references-actual-use",
        label: "Actual Use Setup",
        path: "/rptas/references/actual-use-setup",
        icon: "Tags",
        showInSidebar: true,
        order: 3,
      },
      {
        key: "references-classification-rates",
        label: "Actual Use Rates",
        path: "/rptas/references/classification-rates",
        icon: "Percent",
        showInSidebar: true,
        order: 4,
      }
    ]
  }
];
