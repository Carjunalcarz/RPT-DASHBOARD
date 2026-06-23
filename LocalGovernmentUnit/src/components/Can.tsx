import { ReactNode } from "react";
import { useBackendRbac, type ModuleAction } from "@/hooks/useBackendRbac";

/**
 * Conditional render based on backend-driven module visibility.
 *
 *   <Can module="/rptas">                     ...visible if user can see RPTAS
 *   <Can module="/rptas/faas-records" action="insert">  ...visible if can create
 *   <Can module={moduleId} fallback={<Locked/>}>...
 *
 * The `module` prop accepts either a module id (uuid) or its route_path.
 * While the /me query is loading, nothing renders (or `fallback` if provided
 * AND `showWhileLoading` is true — by default we hide to avoid flashing).
 */

export interface CanProps {
  module: string;
  action?: ModuleAction;
  fallback?: ReactNode;
  /** If true, render fallback while loading; otherwise render nothing. */
  showWhileLoading?: boolean;
  children: ReactNode;
}

export function Can({
  module,
  action,
  fallback = null,
  showWhileLoading = false,
  children,
}: CanProps) {
  const { isLoading, isSuperAdmin, hasModuleAccess, hasPermission } =
    useBackendRbac();

  if (isLoading) {
    return <>{showWhileLoading ? fallback : null}</>;
  }

  if (isSuperAdmin) return <>{children}</>;

  const allowed = action
    ? hasPermission(module, action)
    : hasModuleAccess(module);

  return <>{allowed ? children : fallback}</>;
}

export default Can;