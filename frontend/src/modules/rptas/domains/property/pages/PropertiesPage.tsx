import React from 'react';
import { Building2, MapPin, User } from 'lucide-react';

const Properties: React.FC = () => {
  const properties = [
    {
      id: 'PROP-001',
      address: '123 Main Street',
      owner: 'John Smith',
      value: '$450,000',
      status: 'Active',
      taxDue: '$5,400',
    },
    {
      id: 'PROP-002',
      address: '456 Oak Avenue',
      owner: 'Jane Doe',
      value: '$680,000',
      status: 'Active',
      taxDue: '$8,160',
    },
    {
      id: 'PROP-003',
      address: '789 Pine Road',
      owner: 'Robert Johnson',
      value: '$325,000',
      status: 'Pending',
      taxDue: '$3,900',
    },
  ];

  return (
    <div data-testid="properties-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Property Records
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage and view property information
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Property ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Tax Due
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {properties.map((property) => (
                <tr
                  key={property.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {property.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">
                        {property.address}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-400" />
                      <span className="text-sm text-slate-900 dark:text-slate-100">
                        {property.owner}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                    {property.value}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        property.status === 'Active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                      }`}
                    >
                      {property.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {property.taxDue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Properties;
