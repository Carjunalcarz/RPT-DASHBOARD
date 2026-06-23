import { useMemo, useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { AlertCircle } from 'lucide-react';
import { AccountGroupList, MajorAccountGroupList, SubMajorAccountGroupList, GeneralLedgerAccountList, ResponsibilityCenterGLAConnectionTab } from '../components/index';

export default function AccountGroupManagement() {
  type TabKey =
    | 'account-groups'
    | 'major-account-groups'
    | 'sub-major-account-groups'
    | 'general-ledger-accounts'
    | 'rc-gla-connections';

  const { isSuperAdmin, hasModuleAccess } = useRBAC();
  const [activeTab, setActiveTab] = useState<TabKey>('account-groups');
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(new Set(['account-groups']));

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  const panelClass = (tab: TabKey) => (activeTab === tab ? 'block' : 'hidden');
  const hasVisited = useMemo(
    () => (tab: TabKey) => visitedTabs.has(tab),
    [visitedTabs]
  );

  // Check if user has admin access to account group management
  const hasAccess = isSuperAdmin || hasModuleAccess('/accounting/account-groups');

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Access Denied</h3>
              <p className="text-sm text-gray-600 mt-1">You don't have permission to manage account groups</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Account Group Management</h1>
        <p className="text-gray-600 mt-2 text-base">
          Manage your account structure across all four hierarchy levels: Account Groups, Major Account Groups,
          Sub Major Account Groups, and General Ledger Accounts.
        </p>
      </div>

      {/* Tabs Container */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => handleTabChange('account-groups')}
              className={`flex-1 px-4 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'account-groups'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <span className="hidden sm:inline">Account Groups</span>
              <span className="sm:hidden">Account Groups</span>
            </button>
            <button
              onClick={() => handleTabChange('major-account-groups')}
              className={`flex-1 px-4 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'major-account-groups'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <span className="hidden sm:inline">Major Groups</span>
              <span className="sm:hidden">Major Groups</span>
            </button>
            <button
              onClick={() => handleTabChange('sub-major-account-groups')}
              className={`flex-1 px-4 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'sub-major-account-groups'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <span className="hidden sm:inline">Sub Major Groups</span>
              <span className="sm:hidden">Sub Major</span>
            </button>
            <button
              onClick={() => handleTabChange('general-ledger-accounts')}
              className={`flex-1 px-4 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'general-ledger-accounts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <span className="hidden sm:inline">General Ledger Accounts</span>
              <span className="sm:hidden">General Ledger Accounts</span>
            </button>
            <button
              onClick={() => handleTabChange('rc-gla-connections')}
              className={`flex-1 px-4 py-4 text-center font-medium text-sm transition-colors ${
                activeTab === 'rc-gla-connections'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              <span className="hidden sm:inline">Responsibility Center to General Ledger Account Links</span>
              <span className="sm:hidden">Responsibility Center to General Ledger Account Links</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Tab 1: Account Groups */}
          {hasVisited('account-groups') && (
            <div className={`space-y-4 ${panelClass('account-groups')}`}>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account Groups</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Top-level account categories. Each Account Group can contain multiple Major Account Groups.
                </p>
              </div>
              <AccountGroupList />
            </div>
          )}

          {/* Tab 2: Major Account Groups */}
          {hasVisited('major-account-groups') && (
            <div className={`space-y-4 ${panelClass('major-account-groups')}`}>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Major Account Groups</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Sub-divisions within Account Groups. Select an Account Group to filter Major Account Groups or create
                  new ones within a specific Account Group.
                </p>
              </div>
              <MajorAccountGroupList />
            </div>
          )}

          {/* Tab 3: Sub Major Account Groups */}
          {hasVisited('sub-major-account-groups') && (
            <div className={`space-y-4 ${panelClass('sub-major-account-groups')}`}>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Sub Major Account Groups</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Further sub-divisions within Major Account Groups. Select a Major Account Group to filter Sub Major
                  Account Groups or create new ones.
                </p>
              </div>
              <SubMajorAccountGroupList />
            </div>
          )}

          {/* Tab 4: General Ledger Accounts */}
          {hasVisited('general-ledger-accounts') && (
            <div className={`space-y-4 ${panelClass('general-ledger-accounts')}`}>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">General Ledger Accounts</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Individual General Ledger Accounts that record transactions. Each General Ledger Account belongs to a
                  Sub Major Account Group and has a specific account type (Asset, Liability, Equity, Revenue, Expense).
                </p>
              </div>
              <GeneralLedgerAccountList />
            </div>
          )}

          {hasVisited('rc-gla-connections') && (
            <div className={`space-y-4 ${panelClass('rc-gla-connections')}`}>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Responsibility Center to General Ledger Account Connections</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Connect responsibility centers to general ledger accounts for posting and reporting alignment.
                </p>
              </div>
              <ResponsibilityCenterGLAConnectionTab />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
