import React from 'react';
import { FileText, Download, Calendar } from 'lucide-react';

const Reports: React.FC = () => {
  const reports = [
    {
      id: 'REP-2024-001',
      title: 'Monthly Tax Collection Report',
      description: 'Summary of tax collections for January 2024',
      date: '2024-01-31',
      type: 'Tax Collection',
    },
    {
      id: 'REP-2024-002',
      title: 'Property Assessment Summary',
      description: 'Quarterly property assessment analysis',
      date: '2024-01-25',
      type: 'Assessment',
    },
    {
      id: 'REP-2024-003',
      title: 'Delinquency Report',
      description: 'List of delinquent accounts and overdue payments',
      date: '2024-01-20',
      type: 'Delinquency',
    },
  ];

  return (
    <div data-testid="reports-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Reports
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Generate and download tax administration reports
        </p>
      </div>

      <div className="grid gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    {report.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{report.date}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {report.type}
                    </span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                <Download size={16} />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
