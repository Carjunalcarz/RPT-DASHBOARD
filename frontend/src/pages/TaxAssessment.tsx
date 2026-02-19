import React from 'react';
import { FileText, Calendar, DollarSign } from 'lucide-react';

const TaxAssessment: React.FC = () => {
  const assessments = [
    {
      id: 'AST-2024-001',
      property: '123 Main Street',
      assessedValue: '$450,000',
      taxRate: '1.2%',
      annualTax: '$5,400',
      date: '2024-01-15',
      status: 'Completed',
    },
    {
      id: 'AST-2024-002',
      property: '456 Oak Avenue',
      assessedValue: '$680,000',
      taxRate: '1.2%',
      annualTax: '$8,160',
      date: '2024-01-20',
      status: 'Under Review',
    },
  ];

  return (
    <div data-testid="assessment-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Tax Assessment
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Property tax assessments and calculations
        </p>
      </div>

      <div className="grid gap-6">
        {assessments.map((assessment) => (
          <div
            key={assessment.id}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {assessment.id}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {assessment.property}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  assessment.status === 'Completed'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                }`}
              >
                {assessment.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Assessed Value
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {assessment.assessedValue}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Tax Rate
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {assessment.taxRate}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Annual Tax
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {assessment.annualTax}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    Assessment Date
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {assessment.date}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaxAssessment;
