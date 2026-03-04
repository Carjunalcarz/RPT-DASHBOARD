import React, { useState } from 'react';
import { CheckCircle, Clock, XCircle, DollarSign, Plus, Printer, RefreshCw } from 'lucide-react';
import { useThemeColor } from '@/context/ThemeColorContext';

const Payments: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  const [payments] = useState([
    {
      id: 'PAY-2024-001',
      tdn: '2024-01-001-00001',
      taxpayer: 'JUAN A. DELA CRUZ',
      amount: 5400.00,
      date: '2024-01-15',
      status: 'Completed',
      method: 'Credit Card',
      orNumber: 'OR-1234567'
    },
    {
      id: 'PAY-2024-002',
      tdn: '2024-01-001-00002',
      taxpayer: 'MARIA B. SANTOS',
      amount: 8160.50,
      date: '2024-01-20',
      status: 'Pending',
      method: 'Bank Transfer',
      orNumber: ''
    },
    {
      id: 'PAY-2024-003',
      tdn: '2024-01-001-00003',
      taxpayer: 'PEDRO C. PENDUKO',
      amount: 3900.00,
      date: '2024-01-10',
      status: 'Failed',
      method: 'Check',
      orNumber: 'OR-1234569'
    },
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'Pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'Failed':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div data-testid="payments-page" className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="text-blue-600" />
            Tax Payments
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Manage real property tax collections and history
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} />
            New Payment
          </button>
          <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium transition-colors">
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search by TDN or Taxpayer..." 
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
            />
          </div>
          <button className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead 
              className="text-white"
              style={{
                background: `linear-gradient(to right, ${headerColor}, ${headerColor}dd)`
              }}
            >
              <tr>
                <th className="px-6 py-3 text-left font-semibold">OR Number</th>
                <th className="px-6 py-3 text-left font-semibold">TDN</th>
                <th className="px-6 py-3 text-left font-semibold">Taxpayer</th>
                <th className="px-6 py-3 text-right font-semibold">Amount</th>
                <th className="px-6 py-3 text-center font-semibold">Date</th>
                <th className="px-6 py-3 text-center font-semibold">Method</th>
                <th className="px-6 py-3 text-center font-semibold">Status</th>
                <th className="px-6 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {payment.orNumber || <span className="text-slate-400 italic">Pending</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {payment.tdn}
                  </td>
                  <td className="px-6 py-4 text-slate-900 dark:text-slate-100">
                    {payment.taxpayer}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                    {payment.date}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-600 dark:text-slate-400">
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {getStatusIcon(payment.status)}
                      <span
                        className={`text-xs font-bold uppercase ${
                          payment.status === 'Completed'
                            ? 'text-green-700 dark:text-green-400'
                            : payment.status === 'Pending'
                            ? 'text-yellow-700 dark:text-yellow-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500">
          <span>Showing 1 to 3 of 3 entries</span>
          <div className="flex gap-1">
            <button disabled className="px-3 py-1 border rounded bg-white dark:bg-slate-700 disabled:opacity-50">Previous</button>
            <button disabled className="px-3 py-1 border rounded bg-white dark:bg-slate-700 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
