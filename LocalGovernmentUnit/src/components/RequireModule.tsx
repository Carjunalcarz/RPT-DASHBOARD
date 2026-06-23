import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useBackendRbac, type ModuleAction } from "@/hooks/useBackendRbac";

/**
 * Route guard. Wrap a route element to require module access:
 *
 *   <Route path="/rptas/*" element={
 *     <RequireModule module="/rptas">
 *       <RPTASRoutes />
 *     </RequireModule>
 *   } />
 *
 * Behaviour:
 *   - while loading: render `loadingFallback` (default: null)
 *   - if access denied: redirect to `redirectTo` (default: "/")
 *   - if super_admin: always allowed
 */

export interface RequireModuleProps {
  module: string;
  action?: ModuleAction;
  redirectTo?: string;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

export function RequireModule({
  module,
  action,
  redirectTo = "/",
  loadingFallback = null,
  children,
}: RequireModuleProps) {
  const { isLoading, isSuperAdmin, hasModuleAccess, hasPermission } =
    useBackendRbac();
  const location = useLocation();

  if (isLoading) return <>{loadingFallback}</>;

  if (isSuperAdmin) return <>{children}</>;

  const allowed = action
    ? hasPermission(module, action)
    : hasModuleAccess(module);

  if (!allowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default RequireModule;