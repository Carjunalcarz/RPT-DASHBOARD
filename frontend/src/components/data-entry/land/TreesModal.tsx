import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Save } from 'lucide-react';
import { getTreesByTdn } from '@/services/rptTreeService';
import { getTrees, Tree } from '@/services/classificationService';

export interface TreePlant {
  id: string;
  name: string;
  class?: string;
  unitPrice: number;
  quantity: number;
  totalValue: number;
}

interface TreesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (trees: TreePlant[]) => void;
  initialTrees?: TreePlant[];
  tdn?: string;
}

const TreesModal: React.FC<TreesModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialTrees = [],
  tdn,
}) => {
  const [trees, setTrees] = useState<TreePlant[]>(initialTrees);
  const [treeOptions, setTreeOptions] = useState<Tree[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    unitPrice: '',
    quantity: '',
  });

  // Load Tree Options from API
  useEffect(() => {
    getTrees()
      .then(setTreeOptions)
      .catch(err => console.error('Failed to load tree options', err));
  }, []);

  useEffect(() => {
    // If TDN is provided, fetch trees from API
    if (open && tdn) {
      getTreesByTdn(tdn).then((data) => {
        if (data && data.length > 0) {
          const mappedTrees: TreePlant[] = data.map((record, index) => ({
            id: `${record.TDN}-${record.Prod_Code}-${index}`,
            name: record.Prod_Code,
            class: '', 
            unitPrice: record.Unit_Price,
            quantity: record.Tot_FB, // Using Tot_FB as quantity based on sample
            totalValue: record.Market_Value,
          }));
          setTrees(mappedTrees);
        } else {
           // Fallback to initialTrees if API returns nothing (or empty)
           setTrees(initialTrees);
        }
      });
    } else {
      setTrees(initialTrees);
    }
  }, [open, tdn, initialTrees]);

  const handleAdd = () => {
    if (!formData.name || !formData.unitPrice || !formData.quantity) return;

    const unitPrice = parseFloat(formData.unitPrice);
    const quantity = parseInt(formData.quantity);
    const totalValue = unitPrice * quantity;

    const newTree: TreePlant = {
      id: Date.now().toString(),
      name: formData.name,
      class: formData.class,
      unitPrice,
      quantity,
      totalValue,
    };

    setTrees([...trees, newTree]);
    setFormData({ name: '', class: '', unitPrice: '', quantity: '' });
  };

  const handleDelete = (id: string) => {
    setTrees(trees.filter((t) => t.id !== id));
  };

  const handleSave = () => {
    onSave?.(trees);
    onOpenChange(false);
  };

  const grandTotal = trees.reduce((sum, t) => sum + t.totalValue, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Trees & Plants Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 items-end bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Plant/Tree Name
              </label>
              <select
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
              >
                <option value="">Select Plant/Tree</option>
                {treeOptions.map((t) => (
                  <option key={t.Code} value={t.Description || t.Code}>{t.Description || t.Code}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Class (Optional)
              </label>
              <input
                type="text"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                placeholder="A, B, C..."
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
              />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Unit Price
              </label>
              <input
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-right"
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-right"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!formData.name || !formData.unitPrice || !formData.quantity}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Class</th>
                  <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Total Value</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {trees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No trees/plants added.
                    </td>
                  </tr>
                ) : (
                  trees.map((tree) => (
                    <tr key={tree.id} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2">{tree.name}</td>
                      <td className="px-3 py-2">{tree.class || '-'}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(tree.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{tree.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(tree.totalValue)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDelete(tree.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-semibold border-t border-slate-200 dark:border-slate-700 sticky bottom-0">
                <tr>
                  <td className="px-3 py-2 text-right" colSpan={4}>Grand Total:</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(grandTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
          >
            <Save size={14} />
            Save Plants/Trees
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TreesModal;
