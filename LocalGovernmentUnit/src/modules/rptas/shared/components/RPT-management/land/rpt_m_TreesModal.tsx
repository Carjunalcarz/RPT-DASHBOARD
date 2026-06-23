import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';
import { Plus, Trash2, Save } from 'lucide-react';
import { getTreesByTdn, getTreeLibrary, TreeLibraryRecord, RptTreeRecord } from '@/modules/rptas/shared/services/rptTreeService';

export interface TreePlant {
  id: string;
  code?: string;
  name: string;
  class?: string;
  unitPrice: number;
  quantity: number;
  totalValue: number;
  type: 'FB' | 'NFB'; // Fruit Bearing or Non-Fruit Bearing
}

interface TreesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (trees: TreePlant[]) => void;
  initialTrees?: TreePlant[] | RptTreeRecord[];
  tdn?: string;
  readOnly?: boolean;
}

const TreesModal: React.FC<TreesModalProps> = ({
  open,
  onOpenChange,
  onSave,
  initialTrees,
  tdn,
  readOnly = false,
}) => {
  const [trees, setTrees] = useState<TreePlant[]>([]); // Initialize as empty, effect will populate
  const [treeLibrary, setTreeLibrary] = useState<TreeLibraryRecord[]>([]);
  const hasUserEditsRef = useRef(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    class: '',
    unitPrice: '',
    quantity: '',
    type: 'FB' as 'FB' | 'NFB',
  });

  // Load Tree Library
  useEffect(() => {
    getTreeLibrary()
      .then(setTreeLibrary)
      .catch(err => console.error('Failed to load tree library', err));
  }, []);

  // Map Code to Description helper
  const getTreeDescription = (code: string) => {
    const found = treeLibrary.find(t => t.Code === code);
    if (!found) return code;
    
    // Format effective date
    const date = new Date(found.Eff_Date);
    const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric' }); // Just year or full date? Usually just year for ordinance
    // Or full date: date.toISOString().split('T')[0]
    
    return `${found.Description} (${formattedDate})`;
  };

  // Helper to map RptTreeRecord[] to TreePlant[]
  const mapRptTreeRecords = (records: RptTreeRecord[]): TreePlant[] => {
    const mappedTrees: TreePlant[] = [];
    records.forEach((record, index) => {
       // Add Fruit Bearing Trees if quantity > 0
       if (record.Tot_FB > 0) { // Using Tot_FB as main quantity for FB
          mappedTrees.push({
           id: `${record.TDN}-${record.Prod_Code}-FB-${index}`,
           code: record.Prod_Code,
           name: getTreeDescription(record.Prod_Code),
           class: '', // Class is often part of description or separate, not in API response explicitly besides Prod_Code
           unitPrice: record.Unit_Price,
           quantity: record.Tot_FB,
           totalValue: record.Market_Value, // Usually Market_Value covers both? Or just FB? Assuming FB if NFB is 0
           type: 'FB'
         });
       }

       // Add Non-Fruit Bearing Trees if quantity > 0
       if (record.Non_FB > 0) {
         mappedTrees.push({
           id: `${record.TDN}-${record.Prod_Code}-NFB-${index}`,
           code: record.Prod_Code,
           name: getTreeDescription(record.Prod_Code),
           class: '',
           unitPrice: record.NFB_UnitPrice,
           quantity: record.Non_FB,
           totalValue: record.Non_FB * record.NFB_UnitPrice, // Calculate NFB value separately
           type: 'NFB'
         });
       }
     });
     return mappedTrees;
  };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const apply = (next: TreePlant[]) => {
      if (!alive) return;
      if (hasUserEditsRef.current) return;
      setTrees(next);
    };

    const load = async () => {
      if (initialTrees !== undefined) {
        if (initialTrees.length > 0) {
          const firstItem = initialTrees[0];
          if ('Prod_Code' in firstItem) {
            apply(mapRptTreeRecords(initialTrees as RptTreeRecord[]));
          } else {
            apply(initialTrees as TreePlant[]);
          }
        } else {
          apply([]);
        }
        return;
      }

      if (tdn) {
        const data = await getTreesByTdn(tdn);
        if (!alive) return;
        apply(data && data.length > 0 ? mapRptTreeRecords(data) : []);
        return;
      }

      apply([]);
    };

    load();
    return () => {
      alive = false;
    };
  }, [open, tdn, initialTrees]);

  useEffect(() => {
    if (!open) hasUserEditsRef.current = false;
  }, [open]);

  useEffect(() => {
    if (treeLibrary.length === 0) return;
    setTrees((prev) =>
      prev.map((t) => {
        if (!t.code) return t;
        return { ...t, name: getTreeDescription(t.code) };
      })
    );
  }, [treeLibrary]);

  const handleTreeSelect = (value: string) => {
    // Parse composite key if present
    const [code, effDate] = value.includes('|') ? value.split('|') : [value, ''];
    
    // Find exact match including Eff_Date if available
    const selected = treeLibrary.find(t => 
      t.Code === code && (!effDate || t.Eff_Date === effDate)
    );

    if (selected) {
      let price = selected.Rate;
      let type: 'FB' | 'NFB' = 'FB';

      // Rule: If Rate (FB) is 0, default to NFB and use NFB_Rate
      if (price === 0) {
        price = selected.NFB_Rate;
        type = 'NFB';
        console.log(`[Rule Triggered] Tree ${selected.Code}: Rate is 0, assigning NFB_Rate (${price}) and setting type to NFB.`);
      }

      setFormData(prev => ({
        ...prev,
        code: value, // Store the full composite value to maintain selection state
        name: selected.Description,
        unitPrice: price.toString(),
        type: type
      }));
    } else {
        setFormData(prev => ({ ...prev, code: value, name: code }));
    }
  };

  // When Type changes manually, update the price
  useEffect(() => {
    if (formData.code && formData.type) {
      const [code, effDate] = formData.code.includes('|') ? formData.code.split('|') : [formData.code, ''];
      
      const selected = treeLibrary.find(t => 
        t.Code === code && (!effDate || t.Eff_Date === effDate)
      );

      if (selected) {
         // If switching to NFB, use NFB_Rate. If FB, use Rate.
         // Unless Rate is 0, then we might force NFB or 0.
         const newPrice = formData.type === 'FB' ? selected.Rate : selected.NFB_Rate;
         
         // If user selects FB but Rate is 0, warn or keep as 0? 
         // For now just update.
         setFormData(prev => ({
            ...prev,
            unitPrice: newPrice.toString()
         }));
      }
    }
  }, [formData.type, formData.code, treeLibrary]);

  const handleAdd = () => {
    if (!formData.name || !formData.unitPrice || !formData.quantity) return;

    const unitPrice = parseFloat(formData.unitPrice);
    const quantity = parseInt(formData.quantity);
    const totalValue = unitPrice * quantity;
    const [code] = formData.code.includes('|') ? formData.code.split('|') : [formData.code];

    const newTree: TreePlant = {
      id: Date.now().toString(),
      code,
      name: formData.name,
      class: formData.class,
      unitPrice,
      quantity,
      totalValue,
      type: formData.type
    };

    hasUserEditsRef.current = true;
    setTrees((prev) => [...prev, newTree]);
    setFormData({ code: '', name: '', class: '', unitPrice: '', quantity: '', type: 'FB' });
  };

  const handleDelete = (id: string) => {
    hasUserEditsRef.current = true;
    setTrees((prev) => prev.filter((t) => t.id !== id));
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
      <DialogContent className="max-w-4xl" aria-describedby={undefined}>
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
                value={formData.code}
                onChange={(e) => handleTreeSelect(e.target.value)}
                disabled={readOnly}
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Plant/Tree</option>
                {treeLibrary.map((t, index) => {
                  const date = new Date(t.Eff_Date);
                  const year = date.getFullYear();
                  // Use composite value to ensure uniqueness in selection
                  const uniqueValue = `${t.Code}|${t.Eff_Date}`;
                  return (
                    <option key={`${t.Code}-${index}`} value={uniqueValue}>{t.Description} ({year})</option>
                  );
                })}
              </select>
            </div>
             <div className="w-24">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'FB' | 'NFB' })}
                disabled={readOnly}
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="FB">Fruit Bearing</option>
                <option value="NFB">Non-FB</option>
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
                disabled={readOnly}
                placeholder="A, B, C..."
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={readOnly}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-right disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={readOnly}
                placeholder="0"
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-right disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!formData.name || !formData.unitPrice || !formData.quantity || readOnly}
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
                  <th className="px-3 py-2 text-left font-medium">Type</th>
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
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      No trees/plants added.
                    </td>
                  </tr>
                ) : (
                  trees.map((tree) => (
                    <tr key={tree.id} className="bg-white dark:bg-slate-900">
                      <td className="px-3 py-2">{tree.name}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${tree.type === 'FB' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {tree.type === 'FB' ? 'Fruit Bearing' : 'Non-FB'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{tree.class || '-'}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(tree.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{tree.quantity}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(tree.totalValue)}</td>
                      <td className="px-3 py-2 text-center">
                        {!readOnly && (
                          <button
                            onClick={() => handleDelete(tree.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-semibold border-t border-slate-200 dark:border-slate-700 sticky bottom-0">
                <tr>
                  <td className="px-3 py-2 text-right" colSpan={5}>Grand Total:</td>
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
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Save size={14} />
              Save Plants/Trees
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TreesModal;
