import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, RefreshCw, Printer,
  Search, Filter, MoreHorizontal, FileText,
  Building2, ArrowUpDown, Loader2
} from 'lucide-react';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { 
  getBuildingAppraisals, 
  createBuildingAppraisal, 
  updateBuildingAppraisal, 
  deleteBuildingAppraisal,
  BuildingAppraisal 
} from '@/modules/rptas/shared/services/buildingService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';

const BuildingAppraisalDataEntry: React.FC = () => {
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  const [records, setRecords] = useState<BuildingAppraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BuildingAppraisal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Search and Filter
  const [searchText, setSearchText] = useState('');
  const [filterClassification, setFilterClassification] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<BuildingAppraisal>>({
    classification: '',
    classificationCode: '',
    buildingType: '',
    buildingSubClass: '',
    rate: 0
  });

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getBuildingAppraisals();
      setRecords(data);
    } catch (error) {
      toast.error('Failed to load building appraisals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = 
        record.classification.toLowerCase().includes(searchText.toLowerCase()) ||
        record.buildingType.toLowerCase().includes(searchText.toLowerCase()) ||
        (record.buildingSubClass || '').toLowerCase().includes(searchText.toLowerCase());
      
      const matchesFilter = filterClassification 
        ? record.classificationCode === filterClassification 
        : true;

      return matchesSearch && matchesFilter;
    });
  }, [records, searchText, filterClassification]);

  // Unique Classifications for Filter
  const classifications = useMemo(() => {
    const unique = new Set(records.map(r => r.classificationCode));
    return Array.from(unique).sort();
  }, [records]);

  // Handlers
  const handleAdd = () => {
    setIsEditing(false);
    setFormData({
      classification: '',
      classificationCode: '',
      buildingType: '',
      buildingSubClass: '',
      rate: 0
    });
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = () => {
    if (!selectedRecord) return;
    setIsEditing(true);
    setFormData({ ...selectedRecord });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    const isConfirmed = await showConfirm({
      title: 'Delete Appraisal',
      message: 'Are you sure you want to delete this appraisal?',
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        const success = await deleteBuildingAppraisal(selectedRecord.id);
        if (success) {
          toast.success('Appraisal deleted successfully');
          fetchData();
          setSelectedRecord(null);
        } else {
          toast.error('Failed to delete appraisal');
        }
      } catch (error) {
        toast.error('Error deleting appraisal');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.classificationCode || !formData.classification || !formData.buildingType || !formData.rate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(isEditing ? 'Updating appraisal...' : 'Creating appraisal...');
    
    try {
      // Simulate API call delay as requested
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (isEditing && selectedRecord) {
        await updateBuildingAppraisal(selectedRecord.id, formData);
        toast.success('Appraisal updated successfully', { id: toastId });
      } else {
        await createBuildingAppraisal(formData);
        toast.success('Appraisal created successfully', { id: toastId });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save appraisal', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowSelect = (record: BuildingAppraisal) => {
    setSelectedRecord(record);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div
        className="px-4 py-3 shadow-sm z-10 bg-primary"
      >
        
        <div className="flex items-center gap-2 text-white">
          <Building2 size={20} />
          <h1 className="text-lg font-semibold">Building Appraisal Management</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex flex-wrap gap-2 items-center">
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus size={14} />
          Add
        </button>
        <button
          onClick={handleEdit}
          disabled={!selectedRecord}
          className="px-3 py-1.5 text-xs bg-primary hover:bg-primary-light text-white dark:text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Edit2 size={14} />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedRecord}
          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
          Delete
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded shadow-sm transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        
        <div className="flex-1" />
        
        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary/50 w-48"
            />
          </div>
          <select
            value={filterClassification}
            onChange={(e) => setFilterClassification(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="">All Classifications</option>
            {classifications.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-400 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Classification Code</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Structure Type</th>
                  <th className="px-6 py-3">Sub Class</th>
                  <th className="px-6 py-3 text-right">Unit Value (Rate)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading && filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-slate-500">No records found</td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr 
                      key={record.id}
                      onClick={() => handleRowSelect(record)}
                      className={`cursor-pointer transition-colors ${
                        selectedRecord?.id === record.id 
                          ? 'bg-primary/10 dark:bg-primary/10' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{record.classificationCode}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{record.classification}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{record.buildingType}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{record.buildingSubClass || '-'}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-900 dark:text-white">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(record.rate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Appraisal' : 'Add New Appraisal'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Class Code</label>
              <input
                value={formData.classificationCode}
                onChange={(e) => setFormData({...formData, classificationCode: e.target.value})}
                className="col-span-3 flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-slate-300"
                placeholder="e.g. R, C, I"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Classification</label>
              <input
                value={formData.classification}
                onChange={(e) => setFormData({...formData, classification: e.target.value})}
                className="col-span-3 flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-slate-300"
                placeholder="e.g. Residential"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Structure Type</label>
              <input
                value={formData.buildingType}
                onChange={(e) => setFormData({...formData, buildingType: e.target.value})}
                className="col-span-3 flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-slate-300"
                placeholder="e.g. III-A, IV-B"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Sub Class</label>
              <input
                value={formData.buildingSubClass || ''}
                onChange={(e) => setFormData({...formData, buildingSubClass: e.target.value})}
                className="col-span-3 flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-slate-300"
                placeholder="Optional (e.g. A, B)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-medium">Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value) || 0})}
                className="col-span-3 flex h-9 w-full rounded-md border border-slate-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:focus-visible:ring-slate-300"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white dark:text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuildingAppraisalDataEntry;
