# RPTAS Module Integration Architecture

## 1. RPTAS Integration Strategy Summary
The standalone RPTAS Vite + React application is being refactored into a scalable, feature-based module (`src/modules/rptas`) that plugs directly into the main LGU government enterprise system. The refactor completely strips away standalone responsibilities (e.g., `main.jsx`, global routers, authentication wrappers, and duplicated UI themes) and replaces them with a modular, domain-driven structure. It exposes a standardized `rptasRoutes` array and `rptasNavigation` config to seamlessly merge into the main app’s dynamic sidebar and routing engine. Under the hood, the architecture utilizes TanStack Query for state management, separates API calls into distinct layers (services, queries, mutations, transformers), and lays out the foundation for LGU-specific workflows such as ETL, JSONB facilitation, and approval validations.

## 2. Refactor Checklist
- [ ] **Remove Standalone Entry Points:** Delete `main.jsx`, `App.jsx`, and `index.html` from the module.
- [ ] **Strip Global Providers:** Remove `BrowserRouter`, `QueryClientProvider`, `ThemeProvider`, and `AuthProvider`.
- [ ] **Convert Routing:** Translate standalone routes into the `rptasRoutes.js` object array using the main app’s metadata format (title, icon, permissionCode).
- [ ] **Convert Navigation:** Map all sidebar items into `rptasNavigation.js` with RBAC grouping and ordering.
- [ ] **Extract API Logic:** Migrate all raw `fetch`/`axios` calls into `services/`.
- [ ] **Implement TanStack Hooks:** Create custom `queries/` for reads and `mutations/` for writes.
- [ ] **Apply Transformers:** Introduce a `transformers/` layer to map backend payloads (like JSONB) to UI-ready shapes.
- [ ] **Standardize UI Components:** Replace local generic components (buttons, tables, modals) with the main app's `src/components/shared`.
- [ ] **Setup LGU Domain Folders:** Scaffold `faas`, `property`, `land`, `approvals`, and `etl` domain directories.
- [ ] **Namespace Environment Variables:** Prefix all feature-specific `.env` variables with `VITE_RPTAS_`.

## 3. Recommended Final Folder Structure
```text
src/
  modules/
    rptas/
      index.js                     # Main entry: exports routes, navigation, and module metadata
      routes/
        rptasRoutes.js             # Route configuration with metadata
      navigation/
        rptasNavigation.js         # Sidebar configuration
      domains/
        faas/                      # Domain-driven feature split
          pages/
          components/
          forms/
          tables/
          hooks/
          services/
          queries/
          mutations/
          transformers/
          etl/                     # Facilitation and normalization logic
          approvals/               # Validation workflows
        property/                  # Property Domain
        land/                      # Land Domain
        building/                  # Building Domain
        machinery/                 # Machinery Domain
        reports/                   # Snapshots & Monitoring
      shared/                      # RPTAS-specific shared elements
        constants/
        schemas/
        utils/
        assets/
```

## 4. What Stays Inside `modules/rptas` vs What Moves to Shared
**Stays in `modules/rptas` (Feature-Scoped):**
- Domain-specific pages (e.g., `FaasRecordsPage`, `DashboardPage`).
- RPTAS-specific forms (e.g., FAAS Assessment Form) and validation schemas.
- Domain services, TanStack query/mutation hooks, and ETL/transformer logic.
- RPTAS workflow approval components and specific constants.

**Moves to `src/` (Global/Shared):**
- Generic UI components (`Button`, `DataTable`, `Modal`, `PageHeader`).
- Layout components (`MainLayout`, `Sidebar`, `Navbar`).
- Core services (`axiosClient.js`, `authService.js`).
- Global hooks (`useAuth`, `usePermissions`, `useToast`).
- System-wide constants, global state (`store`), and generic utility functions.

## 5. Merge Risks / Conflict Points
- **Dependency Version Mismatches:** Conflicts between React Router v6 variants or TanStack Query versions (v4 vs v5).
- **CSS / Styling Collisions:** Global CSS files from the standalone app overriding the main app's Tailwind or theme config.
- **Auth Context Assumptions:** The standalone app might expect a different user object shape or token storage mechanism than the main system.
- **Route Collisions:** Ensure all RPTAS routes are strictly prefixed with `/rptas` to prevent shadowing main app routes.
- **State Pollution:** Accidental use of global Redux/Zustand stores for local page states.

## 6. Full Code Examples

### `src/modules/rptas/index.js`
```javascript
export { rptasRoutes } from './routes/rptasRoutes';
export { rptasNavigation } from './navigation/rptasNavigation';
```

### `src/modules/rptas/routes/rptasRoutes.js`
```javascript
import React, { lazy } from 'react';

const RPTASDashboardPage = lazy(() => import('../domains/dashboard/pages/DashboardPage'));
const FaasRecordsPage = lazy(() => import('../domains/faas/pages/FaasRecordsPage'));

export const rptasRoutes = [
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
        element: <RPTASDashboardPage />,
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
        element: <FaasRecordsPage />,
        meta: {
          title: "FAAS Records",
          icon: "FileText",
          permissionCode: "rptas.faas.view",
          showInSidebar: true,
          group: "Assessment",
          order: 2,
        }
      }
    ]
  }
];
```

### `src/modules/rptas/navigation/rptasNavigation.js`
```javascript
export const rptasNavigation = [
  {
    key: "rptas",
    label: "RPTAS",
    icon: "Building2",
    permissionCode: "rptas.view",
    showInSidebar: true,
    order: 10,
    children: [
      {
        key: "rptas-dashboard",
        label: "Dashboard",
        path: "/rptas",
        icon: "LayoutDashboard",
        permissionCode: "rptas.dashboard.view",
        showInSidebar: true,
        order: 1,
      },
      {
        key: "rptas-faas-records",
        label: "FAAS Records",
        path: "/rptas/faas-records",
        icon: "FileText",
        permissionCode: "rptas.faas.view",
        showInSidebar: true,
        order: 2,
      }
    ]
  }
];
```

### `src/modules/rptas/domains/faas/services/faasService.js`
```javascript
import { apiClient } from '@/services/core/apiClient'; // Main app's shared axios instance

export const getFaasRecords = async (params) => {
  const response = await apiClient.get('/api/v1/rptas/faas', { params });
  return response.data;
};

export const submitFaasForValidation = async (id) => {
  const response = await apiClient.post(`/api/v1/rptas/faas/${id}/submit`);
  return response.data;
};
```

### `src/modules/rptas/domains/faas/queries/useFaasRecordsQuery.js`
```javascript
import { useQuery } from '@tanstack/react-query';
import { getFaasRecords } from '../services/faasService';
import { transformFaasList } from '../transformers/faasTransformer';

export const useFaasRecordsQuery = (params) => {
  return useQuery({
    queryKey: ['rptas', 'faas', 'list', params],
    queryFn: async () => {
      const data = await getFaasRecords(params);
      return transformFaasList(data);
    },
    keepPreviousData: true,
  });
};
```

### `src/modules/rptas/domains/faas/mutations/useSubmitForValidationMutation.js`
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitFaasForValidation } from '../services/faasService';

export const useSubmitForValidationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => submitFaasForValidation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rptas', 'faas'] });
    },
  });
};
```

### `src/modules/rptas/domains/faas/transformers/faasTransformer.js`
```javascript
/**
 * Maps complex JSONB backend structures into flat, UI-ready objects
 */
export const transformFaasList = (apiResponse) => {
  if (!apiResponse?.data) return [];
  
  return apiResponse.data.map(record => ({
    id: record.id,
    tdn: record.tdn_number,
    ownerName: record.raw_jsonb?.owner?.fullName || 'Unknown',
    propertyType: record.property_classification,
    marketValue: parseFloat(record.raw_jsonb?.assessment?.totalMarketValue || 0),
    status: record.workflow_status, // e.g., 'pending_validation'
    lastModified: new Date(record.updated_at).toLocaleDateString(),
  }));
};
```

### `src/modules/rptas/domains/faas/etl/faasFacilitation.js`
```javascript
/**
 * Handles mapping staging JSONB data to relational structures
 * Ready for LGU ETL pipelines
 */
export const facilitateFaasRecord = (rawIntakeData) => {
  const normalizedOwner = {
    firstName: rawIntakeData.ownerDetails?.fName,
    lastName: rawIntakeData.ownerDetails?.lName,
    tin: rawIntakeData.taxpayerId,
  };

  const normalizedProperty = {
    pin: rawIntakeData.pin,
    barangayId: rawIntakeData.location?.brgyCode,
  };

  return {
    owner: normalizedOwner,
    property: normalizedProperty,
    raw_source: rawIntakeData // Preserve original JSONB for audit
  };
};
```

### `src/modules/rptas/domains/faas/pages/FaasRecordsPage.jsx`
```javascript
import React, { useState } from 'react';
import { useFaasRecordsQuery } from '../queries/useFaasRecordsQuery';
import { useSubmitForValidationMutation } from '../mutations/useSubmitForValidationMutation';
import { DataTable } from '@/components/shared/DataTable'; // Main app UI
import { PageHeader } from '@/components/shared/PageHeader'; // Main app UI

const FaasRecordsPage = () => {
  const [page, setPage] = useState(1);
  const { data: records = [], isLoading } = useFaasRecordsQuery({ page });
  const submitMutation = useSubmitForValidationMutation();

  const handleValidationSubmit = (id) => {
    submitMutation.mutate(id);
  };

  const columns = [
    { key: 'tdn', label: 'TDN' },
    { key: 'ownerName', label: 'Owner' },
    { key: 'propertyType', label: 'Type' },
    { key: 'status', label: 'Status' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (row) => (
        <button 
          onClick={() => handleValidationSubmit(row.id)}
          disabled={submitMutation.isLoading || row.status !== 'draft'}
          className="btn-primary"
        >
          Submit for Validation
        </button>
      ) 
    }
  ];

  return (
    <div className="p-6">
      <PageHeader title="FAAS Records" breadcrumbs={['RPTAS', 'FAAS']} />
      
      <DataTable 
        data={records} 
        columns={columns} 
        loading={isLoading}
        onPageChange={setPage}
      />
    </div>
  );
};

export default FaasRecordsPage;
```

### Example integration in main app router (`src/routes/index.js`)
```javascript
import { createBrowserRouter } from 'react-router-dom';
import { rptasRoutes } from '@/modules/rptas';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      ...rptasRoutes,
      // ...other modules like business permits, treasury, etc.
    ]
  }
]);
```

### Example integration in main app sidebar builder (`src/layouts/Sidebar.jsx`)
```javascript
import { rptasNavigation } from '@/modules/rptas';
import { usePermissions } from '@/hooks/shared/usePermissions';

// Merge all module navigations
const allNavItems = [
  ...rptasNavigation,
  // ...other navigations
];

export const Sidebar = () => {
  const { hasPermission } = usePermissions();

  // Filter items based on RBAC permissionCode
  const authorizedNav = allNavItems.filter(item => 
    !item.permissionCode || hasPermission(item.permissionCode)
  );

  return (
    <nav className="sidebar">
      {authorizedNav.map(nav => (
        <SidebarItem key={nav.key} item={nav} />
      ))}
    </nav>
  );
};
```

## 7. Step-by-Step Merge Procedure
1. **Dependency Alignment:** Ensure `package.json` in the main app has the required versions of TanStack Query, React Router, and Axios that RPTAS expects.
2. **Move Files:** Copy the refactored `src/modules/rptas` folder into the main app’s `src/modules/` directory.
3. **Integrate Routes:** Import `rptasRoutes` into the main routing configuration array.
4. **Integrate Sidebar:** Import `rptasNavigation` into the dynamic sidebar configuration.
5. **Update Shared Imports:** Do a global find-and-replace inside `modules/rptas` to update import paths for generic components (e.g., pointing them to `@/components/shared/`).
6. **Migrate Environment Variables:** Copy RPTAS-specific `.env` keys to the main `.env` files, ensuring they are prefixed with `VITE_RPTAS_`.

## 8. Post-Merge Validation Checklist
- [ ] **RBAC Verification:** Log in with different roles to ensure RPTAS menu items appear/disappear according to `permissionCode` rules.
- [ ] **Routing Validation:** Verify that `/rptas` and `/rptas/faas-records` load within the `MainLayout` without triggering full page reloads.
- [ ] **Auth Token Propagation:** Open the network tab and confirm that RPTAS API calls automatically attach the main app’s Bearer token.
- [ ] **Theme Consistency:** Check buttons, tables, and typography in RPTAS pages to ensure they inherit the main app's global CSS/Tailwind rules.
- [ ] **State Isolation:** Ensure navigating away from `/rptas` and back does not cause unexpected caching errors in TanStack Query Devtools.
