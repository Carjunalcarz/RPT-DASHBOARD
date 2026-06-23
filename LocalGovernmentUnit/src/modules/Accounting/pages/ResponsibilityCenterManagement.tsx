import { AlertCircle, Building2 } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { ResponsibilityCenterList } from '../components';

const ResponsibilityCenterManagement = () => {
  const { isSuperAdmin, hasModuleAccess } = useRBAC();

  const hasAccess =
    isSuperAdmin ||
    hasModuleAccess('/accounting/responsibility-centers') ||
    hasModuleAccess('/accounting/account-groups');

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Access Denied</h3>
              <p className="text-sm text-gray-600 mt-1">
                You do not have permission to manage responsibility centers
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Responsibility Center Management</h1>
        <p className="text-gray-600 mt-2 text-base">
          Manage responsibility centers and their sections. A responsibility center can contain multiple sections.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Responsibility Centers</h2>
            <p className="text-sm text-gray-600">
              Create and maintain responsibility centers with their sections in one place.
            </p>
          </div>
        </div>

        <ResponsibilityCenterList />
      </div>
    </div>
  );
};

export default ResponsibilityCenterManagement;
