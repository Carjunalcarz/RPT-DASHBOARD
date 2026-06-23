import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/modules/rptas/ui/dialog';
import { Plus, Trash2, Save, X } from 'lucide-react';

export interface LandAdjustment {
  id: string;
  factor: string;
  percentage: number;
  valueAdjustment: number;
}

interface LandAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseMarketValue: number;
  onSave?: (adjustments: LandAdjustment[]) => void;
  initialAdjustments?: LandAdjustment[];
}

const adjustmentFactors = [
  'Road Frontage',
  'Location',
  'Topography',
  'Shape',
  'Accessibility',
  'Soil Condition',
  'Flood Risk',
];

const LandAdjustmentModal: React.FC<LandAdjustmentModalProps> = ({
  open,
  onOpenChange,
  baseMarketValue,
  onSave,
  initialAdjustments = [],
}) => {
  const [adjustments, setAdjustments] = useState<LandAdjustment[]>(initialAdjustments);
  const [formData, setFormData] = useState({
    factor: '',
    percentage: '',
  });

  useEffect(() => {
    setAdjustments(initialAdjustments);
  }, [initialAdjustments]);

  const handleAdd = () => {
    if (!formData.factor || !formData.percentage) return;

    const percentage = parseFloat(formData.percentage);
    const valueAdjustment = baseMarketValue * (percentage / 100);

    const newAdjustment: LandAdjustment = {
      id: Date.now().toString(),
      factor: formData.factor,
      percentage,
      valueAdjustment,
    };

    setAdjustments([...adjustments, newAdjustment]);
    setFormData({ factor: '', percentage: '' });
  };

  const handleDelete = (id: string) => {
    setAdjustments(adjustments.filter((a) => a.id !== id));
  };

  const handleSave = () => {
    onSave?.(adjustments);
    onOpenChange(false);
  };

  const totalAdjustment = adjustments.reduce((sum, a) => sum + a.valueAdjustment, 0);
  const adjustedMarketValue = baseMarketValue + totalAdjustment;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Land Adjustments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 bg-background dark:bg-background p-3 rounded-lg border border-border dark:border-border">
            <div>
              <p className="text-xs text-muted dark:text-muted">Base Market Value</p>
              <p className="text-lg font-semibold text-foreground dark:text-surface">
                {formatCurrency(baseMarketValue)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted dark:text-muted">Total Adjustment</p>
              <p className={`text-lg font-semibold ${totalAdjustment < 0 ? 'text-danger' : 'text-success'}`}>
                {totalAdjustment > 0 ? '+' : ''}{formatCurrency(totalAdjustment)}
              </p>
            </div>
          </div>

          {/* Add Form */}
          <div className="flex gap-2 items-end bg-background dark:bg-background/50 p-3 rounded border border-border dark:border-border">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground dark:text-foreground mb-1 block">
                Adjustment Factor
              </label>
              <select
                value={formData.factor}
                onChange={(e) => setFormData({ ...formData, factor: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border rounded bg-surface dark:bg-surface border-border dark:border-border"
              >
                <option value="">Select Factor</option>
                {adjustmentFactors.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="text-xs font-medium text-foreground dark:text-foreground mb-1 block">
                Percentage (%)
              </label>
              <input
                type="number"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-xs border rounded bg-surface dark:bg-surface border-border dark:border-border text-right"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!formData.factor || !formData.percentage}
              className="px-3 py-1.5 bg-primary hover:bg-primary-light text-surface rounded text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Table */}
          <div className="border border-border dark:border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/10 dark:bg-background text-muted dark:text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Factor</th>
                  <th className="px-3 py-2 text-right font-medium">Percentage</th>
                  <th className="px-3 py-2 text-right font-medium">Adjustment Value</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                      No adjustments added.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id} className="bg-surface dark:bg-surface">
                      <td className="px-3 py-2">{adj.factor}</td>
                      <td className="px-3 py-2 text-right">{adj.percentage}%</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(adj.valueAdjustment)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDelete(adj.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-background dark:bg-background font-semibold border-t border-border dark:border-border">
                <tr>
                  <td className="px-3 py-2 text-right" colSpan={2}>Adjusted Market Value:</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(adjustedMarketValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs border border-border dark:border-border rounded hover:bg-muted/5 dark:hover:bg-muted/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs bg-primary hover:bg-primary-light text-surface rounded transition-colors flex items-center gap-2"
          >
            <Save size={14} />
            Save Adjustments
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LandAdjustmentModal;
