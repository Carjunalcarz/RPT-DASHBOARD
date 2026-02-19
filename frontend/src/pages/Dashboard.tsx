import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building2, CreditCard, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

interface KPICardProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: React.ElementType;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, isPositive, icon: Icon }) => (
  <div data-testid="kpi-card" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</h3>
        <div className="flex items-center gap-1 mt-2">
          {isPositive ? (
            <TrendingUp size={16} className="text-green-600" />
          ) : (
            <TrendingDown size={16} className="text-red-600" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        </div>
      </div>
      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
        <Icon size={24} className="text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats({
          totalProperties: 15847,
          collectedTax: 2847950,
          pendingPayments: 324,
          delinquentAccounts: 89,
        });
      }
    };
    fetchStats();
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Overview of real property tax administration
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Properties"
          value={stats.totalProperties.toLocaleString()}
          change="+5.2% from last month"
          isPositive={true}
          icon={Building2}
        />
        <KPICard
          title="Collected Tax"
          value={`$${(stats.collectedTax / 1000000).toFixed(2)}M`}
          change="+12.3% from last month"
          isPositive={true}
          icon={DollarSign}
        />
        <KPICard
          title="Pending Payments"
          value={stats.pendingPayments}
          change="-8.1% from last month"
          isPositive={true}
          icon={CreditCard}
        />
        <KPICard
          title="Delinquent Accounts"
          value={stats.delinquentAccounts}
          change="+2.4% from last month"
          isPositive={false}
          icon={AlertCircle}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {[
            { action: 'New property assessment', property: 'Property #12847', time: '2 hours ago' },
            { action: 'Payment received', property: 'Property #45621', time: '4 hours ago' },
            { action: 'Tax rate updated', property: 'District Zone A', time: '1 day ago' },
            { action: 'Delinquency notice sent', property: 'Property #78934', time: '2 days ago' },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {activity.action}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activity.property}
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
