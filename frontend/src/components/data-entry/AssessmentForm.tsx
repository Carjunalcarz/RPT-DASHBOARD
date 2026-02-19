import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Printer } from 'lucide-react';

interface AssessmentEntry {
  id: string;
  kind: string;
  class: string;
  actualUse: string;
  subClass: string;
  area: string;
  unitValue: string;
  baseMarketValue: string;
  adjustedMarketValue: string;
  assessmentLevel: string;
  assessedValue: string;
  taxability: string;
}

const AssessmentForm: React.FC = () => {
  const [entries, setEntries] = useState<AssessmentEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const handleAdd = () => {
    const newEntry: AssessmentEntry = {
      id: Date.now().toString(),
      kind: '',
      class: '',
      actualUse: '',
      subClass: '',
      area: '',
      unitValue: '',
      baseMarketValue: '',
      adjustedMarketValue: '',
      assessmentLevel: '',
      assessedValue: '',
      taxability: '',
    };
    setEntries([...entries, newEntry]);
    setSelectedEntry(newEntry.id);
  };

  const handleEdit = () => {
    if (selectedEntry) {
      console.log('Edit entry:', selectedEntry);
    }
  };

  const handleDelete = () => {
    if (selectedEntry) {
      setEntries(entries.filter((entry) => entry.id !== selectedEntry));
      setSelectedEntry(null);
    }
  };

  const handleSave = () => {
    console.log('Save entries:', entries);
  };

  const handleCancel = () => {
    setSelectedEntry(null);
  };

  const handleRefresh = () => {
    console.log('Refresh data');
  };

  const handlePrint = () => {
    console.log('Print assessment');
  };

  const calculateTotals = () => {
    const totalArea = entries.reduce((sum, entry) => sum + (parseFloat(entry.area) || 0), 0);
    const totalAdjustedMarketValue = entries.reduce((sum, entry) => sum + (parseFloat(entry.adjustedMarketValue) || 0), 0);
    const totalAssessedValue = entries.reduce((sum, entry) => sum + (parseFloat(entry.assessedValue) || 0), 0);

    return {
      totalArea: totalArea.toFixed(2),
      totalAdjustedMarketValue: totalAdjustedMarketValue.toFixed(2),
      totalAssessedValue: totalAssessedValue.toFixed(2),
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAdd}
            className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedEntry}
            className="px-3 py-2 text-xs bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:cursor-not-allowed"
          >
            <Edit2 size={14} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedEntry}
            className="px-3 py-2 text-xs bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium disabled:cursor-not-allowed"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 text-xs bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-2 text-xs bg-slate-500 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Assessment Entry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Kind</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Class</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Actual Use</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Sub Class</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Area</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Unit Value</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Base Market Value</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Adjusted Market Value</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Assessment Level</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Assessed Value</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Taxability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                    No assessment entries yet. Click "Add" to create one.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedEntry === entry.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="text"
                        value={entry.kind}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, kind: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="text"
                        value={entry.class}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, class: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="text"
                        value={entry.actualUse}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, actualUse: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="text"
                        value={entry.subClass}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, subClass: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="number"
                        value={entry.area}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, area: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="number"
                        value={entry.unitValue}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, unitValue: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="number"
                        value={entry.baseMarketValue}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, baseMarketValue: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="number"
                        value={entry.adjustedMarketValue}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, adjustedMarketValue: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="text"
                        value={entry.assessmentLevel}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, assessmentLevel: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="number"
                        value={entry.assessedValue}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, assessedValue: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                      <input
                        type="text"
                        value={entry.taxability}
                        onChange={(e) => {
                          const updated = entries.map((item) =>
                            item.id === entry.id ? { ...item, taxability: e.target.value } : item
                          );
                          setEntries(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assessment Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Assessment Summary Per Classification
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Kind</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Classification</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Total Area (Sqm)</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Total Adjusted Market Value</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Total Assessed Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 dark:bg-slate-800 font-semibold">
                <td className="px-3 py-3 text-slate-900 dark:text-slate-100 uppercase">TOTAL</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">{totals.totalArea}</td>
                <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">{totals.totalAdjustedMarketValue}</td>
                <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">{totals.totalAssessedValue}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;
