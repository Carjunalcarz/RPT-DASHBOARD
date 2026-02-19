import React from 'react';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

const Payments: React.FC = () => {
  const payments = [
    {
      id: 'PAY-2024-001',
      property: '123 Main Street',
      amount: '$5,400',
      date: '2024-01-15',
      status: 'Completed',
      method: 'Credit Card',
    },
    {
      id: 'PAY-2024-002',
      property: '456 Oak Avenue',
      amount: '$8,160',
      date: '2024-01-20',
      status: 'Pending',
      method: 'Bank Transfer',
    },
    {
      id: 'PAY-2024-003',
      property: '789 Pine Road',
      amount: '$3,900',
      date: '2024-01-10',
      status: 'Failed',
      method: 'Check',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'Pending':
        return <Clock size={20} className="text-yellow-600" />;
      case 'Failed':
        return <XCircle size={20} className="text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div data-testid="payments-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Payments
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Track and manage tax payments
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {payment.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                    {payment.property}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {payment.amount}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {payment.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {payment.method}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span
                        className={`text-sm font-medium ${
                          payment.status === 'Completed'
                            ? 'text-green-600 dark:text-green-400'
                            : payment.status === 'Pending'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
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

export default Payments;
