import React, { useState } from 'react';
import { AssessmentRow, AssessmentSummary } from './rpt_m_types';
import TableToolbar from './rpt_m_TableToolbar';
import EditableCell from './rpt_m_EditableCell';
import PrintDocument from './rpt_m_PrintDocument';
import SelectionModal from './rpt_m_SelectionModal';
import { useSelectionModal } from './rpt_m_useSelectionModal';
import { useAlert } from '@/context/AlertContext';
import '@/styles/print.css';

const AssessmentTable: React.FC = () => {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [originalRowBackup, setOriginalRowBackup] = useState<AssessmentRow | null>(null);
  const { showAlert } = useAlert();

  // Selection modal hook
  const {
    isModalOpen,
    modalType,
    activeRowId,
    activeField,
    openModal,
    closeModal,
    selectValue,
  } = useSelectionModal();

  // Generate unique ID
  const generateId = () => `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Calculate derived values
  const calculateDerivedValues = (row: AssessmentRow): AssessmentRow => {
    const area = parseFloat(row.area) || 0;
    const unitValue = parseFloat(row.unitValue) || 0;
    const adjustedMarketValue = parseFloat(row.adjustedMarketValue) || 0;
    const assessmentLevel = parseFloat(row.assessmentLevel) || 0;

    const baseMarketValue = area * unitValue;
    const assessedValue = adjustedMarketValue * (assessmentLevel / 100);

    return {
      ...row,
      baseMarketValue: baseMarketValue.toFixed(2),
      assessedValue: assessedValue.toFixed(2),
    };
  };

  // Handler: Add new row
  const handleAdd = async () => {
    if (editingRowId) {
      await showAlert('Please save or cancel the current edit before adding a new row.');
      return;
    }

    const newRow: AssessmentRow = {
      id: generateId(),
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

    setRows([...rows, newRow]);
    setSelectedRowId(newRow.id);
    setEditingRowId(newRow.id);
    setOriginalRowBackup(newRow);
  };

  // Handler: Edit selected row
  const handleEdit = async () => {
    if (!selectedRowId) return;

    if (editingRowId) {
      await showAlert('Please save or cancel the current edit before editing another row.');
      return;
    }

    const row = rows.find((r) => r.id === selectedRowId);
    if (row) {
      setEditingRowId(selectedRowId);
      setOriginalRowBackup({ ...row });
    }
  };

  // Handler: Delete selected row
  const handleDelete = async () => {
    if (!selectedRowId) return;

    if (editingRowId === selectedRowId) {
      await showAlert('Cannot delete a row that is being edited. Please save or cancel first.');
      return;
    }

    setRows(rows.filter((row) => row.id !== selectedRowId));
    setSelectedRowId(null);
  };

  // Handler: Save editing row
  const handleSave = () => {
    if (!editingRowId) return;

    const updatedRows = rows.map((row) => {
      if (row.id === editingRowId) {
        return calculateDerivedValues(row);
      }
      return row;
    });

    setRows(updatedRows);
    setEditingRowId(null);
    setOriginalRowBackup(null);
  };

  // Handler: Cancel editing
  const handleCancel = () => {
    if (!editingRowId || !originalRowBackup) return;

    // If it's a new row (all fields empty in backup), remove it
    const isNewRow = Object.values(originalRowBackup).every(
      (val, idx) => idx === 0 || val === '' // Skip id field
    );

    if (isNewRow) {
      setRows(rows.filter((row) => row.id !== editingRowId));
      setSelectedRowId(null);
    } else {
      // Restore original values
      setRows(rows.map((row) => (row.id === editingRowId ? originalRowBackup : row)));
    }

    setEditingRowId(null);
    setOriginalRowBackup(null);
  };

  // Handler: Refresh (reload data)
  const handleRefresh = () => {
    console.log('Refresh data');
    // In real app, fetch from API
  };

  // Handler: Print
  const handlePrint = () => {
    window.print();
  };

  // Handler: Row selection
  const handleRowSelect = async (rowId: string) => {
    if (editingRowId && editingRowId !== rowId) {
      await showAlert('Please save or cancel the current edit before selecting another row.');
      return;
    }
    setSelectedRowId(rowId);
  };

  // Handler: Update field value
  const handleFieldChange = (rowId: string, field: keyof AssessmentRow, value: string) => {
    setRows(
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  // Handler: Open selection modal
  const handleOpenModal = (
    rowId: string,
    field: string,
    modalType: 'kind' | 'class' | 'actualUse' | 'subClass'
  ) => {
    // Only allow modal if row is being edited
    if (editingRowId !== rowId) {
      return;
    }
    openModal(modalType, rowId, field);
  };

  // Handler: Select value from modal
  const handleModalSelect = (value: string) => {
    if (activeRowId && activeField) {
      handleFieldChange(activeRowId, activeField as keyof AssessmentRow, value);
    }
  };

  // Calculate summary totals
  const calculateSummary = (): AssessmentSummary => {
    return rows.reduce(
      (acc, row) => ({
        totalArea: acc.totalArea + (parseFloat(row.area) || 0),
        totalAdjustedMarketValue:
          acc.totalAdjustedMarketValue + (parseFloat(row.adjustedMarketValue) || 0),
        totalAssessedValue: acc.totalAssessedValue + (parseFloat(row.assessedValue) || 0),
      }),
      { totalArea: 0, totalAdjustedMarketValue: 0, totalAssessedValue: 0 }
    );
  };

  const summary = calculateSummary();

  // Mock property info (in real app, this would come from props or context)
  const propertyInfo = {
    ownerName: 'Sample Owner Name',
    pin: '053-07-0002-003-32',
    tdNo: 'TD-2024-001',
    arpNo: 'ARP-2024-001',
    province: 'Agusan del Norte',
    municipality: 'Tubay',
    barangay: 'Poblacion',
    effectivityDate: '2024-01-01',
    declarationDate: '2024-01-15',
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <TableToolbar
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSave={handleSave}
        onCancel={handleCancel}
        onRefresh={handleRefresh}
        onPrint={handlePrint}
        isEditing={!!editingRowId}
        hasSelection={!!selectedRowId}
      />

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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                    No assessment entries yet. Click "Add" to create one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isEditing = editingRowId === row.id;
                  const isSelected = selectedRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleRowSelect(row.id)}
                      className={`transition-colors ${
                        isEditing
                          ? 'bg-white dark:bg-slate-900 cursor-default'
                          : isSelected
                          ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer'
                          : 'bg-slate-50 dark:bg-slate-800/30 cursor-pointer'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.kind}
                          onChange={(val) => handleFieldChange(row.id, 'kind', val)}
                          isEditing={isEditing}
                          hasModal={true}
                          onDoubleClick={() => handleOpenModal(row.id, 'kind', 'kind')}
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.class}
                          onChange={(val) => handleFieldChange(row.id, 'class', val)}
                          isEditing={isEditing}
                          hasModal={true}
                          onDoubleClick={() => handleOpenModal(row.id, 'class', 'class')}
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.actualUse}
                          onChange={(val) => handleFieldChange(row.id, 'actualUse', val)}
                          isEditing={isEditing}
                          hasModal={true}
                          onDoubleClick={() => handleOpenModal(row.id, 'actualUse', 'actualUse')}
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.subClass}
                          onChange={(val) => handleFieldChange(row.id, 'subClass', val)}
                          isEditing={isEditing}
                          hasModal={true}
                          onDoubleClick={() => handleOpenModal(row.id, 'subClass', 'subClass')}
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.area}
                          onChange={(val) => handleFieldChange(row.id, 'area', val)}
                          isEditing={isEditing}
                          type="number"
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.unitValue}
                          onChange={(val) => handleFieldChange(row.id, 'unitValue', val)}
                          isEditing={isEditing}
                          type="number"
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                          {row.baseMarketValue || '0.00'}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.adjustedMarketValue}
                          onChange={(val) => handleFieldChange(row.id, 'adjustedMarketValue', val)}
                          isEditing={isEditing}
                          type="number"
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <EditableCell
                          value={row.assessmentLevel}
                          onChange={(val) => handleFieldChange(row.id, 'assessmentLevel', val)}
                          isEditing={isEditing}
                          type="number"
                          placeholder="%"
                        />
                      </td>
                      <td className="border-r border-slate-200 dark:border-slate-700">
                        <div className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                          {row.assessedValue || '0.00'}
                        </div>
                      </td>
                      <td>
                        <EditableCell
                          value={row.taxability}
                          onChange={(val) => handleFieldChange(row.id, 'taxability', val)}
                          isEditing={isEditing}
                        />
                      </td>
                    </tr>
                  );
                })
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
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  Total Area (Sqm)
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  Total Adjusted Market Value
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">
                  Total Assessed Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-50 dark:bg-slate-800 font-semibold">
                <td className="px-3 py-3 text-slate-900 dark:text-slate-100 uppercase">TOTAL</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">
                  {summary.totalArea.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">
                  {summary.totalAdjustedMarketValue.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right text-slate-900 dark:text-slate-100">
                  {summary.totalAssessedValue.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Document */}
      <PrintDocument
        propertyInfo={propertyInfo}
        assessmentRows={rows}
        summary={summary}
      />

      {/* Selection Modal */}
      <SelectionModal
        isOpen={isModalOpen}
        type={modalType}
        onClose={closeModal}
        onSelect={handleModalSelect}
        currentValue={
          activeRowId && activeField
            ? rows.find((r) => r.id === activeRowId)?.[activeField as keyof AssessmentRow] || ''
            : ''
        }
      />
    </div>
  );
};

export default AssessmentTable;
