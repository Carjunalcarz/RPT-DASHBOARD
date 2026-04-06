import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ChevronRight, 
  Database, 
  History,
  Info,
  Download
} from 'lucide-react';
import { useMigrationCart } from '@/context/MigrationCartContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAlert } from '@/context/AlertContext';
import { bulkMigrate, checkExistingTdns } from '@/modules/rptas/shared/services/faasService';

const MigrationCartPage: React.FC = () => {
  const { selectedProperties, removeFromCart, clearCart, count } = useMigrationCart();
  const { headerColor, headerColorDark } = useThemeColor();
  const { showConfirm } = useAlert();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [migrationResults, setMigrationResults] = useState<any[] | null>(null);
  const [existingTdns, setExistingTdns] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [skipExisting, setSkipExisting] = useState(true);

  // Check for existing properties on mount
  React.useEffect(() => {
    const checkExisting = async () => {
      if (selectedProperties.length === 0) return;
      
      setIsChecking(true);
      try {
        const tdns = selectedProperties.map(p => p.tdn);
        const existing = await checkExistingTdns(tdns);
        setExistingTdns(existing);
      } catch (error) {
        console.error('Failed to check existing properties:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkExisting();
  }, [selectedProperties]);

  const handleBulkMigrate = async () => {
    if (count === 0) return;

    const existingCount = selectedProperties.filter(p => existingTdns.includes(p.tdn)).length;
    let message = `You are about to migrate ${count} properties. This operation will be executed as a database transaction.`;
    
    if (existingCount > 0) {
      if (skipExisting) {
        message += `\n\nNote: ${existingCount} properties already exist in Supabase and will be SKIPPED.`;
      } else {
        message += `\n\nNote: ${existingCount} properties already exist in Supabase and will be OVERWRITTEN.`;
      }
    }

    const confirmed = await showConfirm({
      title: 'Confirm Bulk Migration',
      message: message,
      confirmLabel: 'YES, PROCEED',
      cancelLabel: 'CANCEL'
    } as any);

    if (!confirmed) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      // Simulate progress for UI
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const migrationType = (document.querySelector('select') as HTMLSelectElement)?.value || 'GENERAL REVISION';
      const results = await bulkMigrate(selectedProperties, migrationType, skipExisting);
      
      clearInterval(progressInterval);
      setMigrationResults(results);
      setProgress(100);
      
      const successCount = results.filter((r: any) => r.status === 'success' || r.status === 'skipped').length;
      if (successCount === count) {
        toast.success(`Successfully processed all ${count} properties!`);
        clearCart();
      } else {
        toast.warning(`Migration completed with some errors. ${successCount}/${count} successful.`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Migration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadLog = () => {
    if (!migrationResults) return;
    const blob = new Blob([JSON.stringify(migrationResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration_log_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div 
        className="px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 bg-primary"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Database size={24} />
              Bulk Property Migration
            </h1>
            <p className="text-white/80 text-xs">Review and execute bulk property migration transactions</p>
          </div>
        </div>
        
        {count > 0 && !migrationResults && (
          <button
            onClick={() => {
              showConfirm({
                title: 'Clear Cart',
                message: 'Are you sure you want to remove all properties from the migration cart?',
                confirmLabel: 'CLEAR ALL',
                cancelLabel: 'KEEP THEM'
              } as any).then(confirmed => confirmed && clearCart());
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-white/20"
          >
            <Trash2 size={16} />
            CLEAR CART
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Progress Section */}
          {isProcessing && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <RefreshCw size={48} className="animate-spin text-primary" />
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">
                    {progress}%
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Processing Bulk Migration</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Executing database transactions for {count} properties. Please do not close this window.
                  </p>
                </div>
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500 ease-out bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Summary Section */}
          {migrationResults && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-top-4 duration-500">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                  <History size={20} className="text-primary" />
                  Migration Summary Report
                </div>
                <button 
                  onClick={downloadLog}
                  className="px-3 py-1.5 bg-primary hover:brightness-110 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download size={14} />
                  DOWNLOAD FULL LOG
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                  <div className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">Successful</div>
                  <div className="text-3xl font-black text-green-700 dark:text-green-300">
                    {migrationResults.filter(r => r.status === 'success').length}
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">Skipped</div>
                  <div className="text-3xl font-black text-amber-700 dark:text-amber-300">
                    {migrationResults.filter(r => r.status === 'skipped').length}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                  <div className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mb-1">Failed</div>
                  <div className="text-3xl font-black text-red-700 dark:text-red-300">
                    {migrationResults.filter(r => r.status === 'failed').length}
                  </div>
                </div>
                <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-xl border border-primary/20 dark:border-primary/30">
                  <div className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Total Processed</div>
                  <div className="text-3xl font-black text-primary">{count}</div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-left font-semibold">
                    <tr>
                      <th className="px-6 py-3">TDN</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {migrationResults.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{result.tdn}</td>
                        <td className="px-6 py-3">
                          <span className={`flex items-center gap-1.5 font-bold uppercase text-[10px] px-2 py-1 rounded-full border ${
                            result.status === 'success' 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : result.status === 'skipped'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {result.status === 'success' ? <CheckCircle2 size={12} /> : result.status === 'skipped' ? <Info size={12} /> : <AlertTriangle size={12} />}
                            {result.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400 italic text-xs">
                          {result.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-center">
                <button
                  onClick={() => navigate('/data-entry-v2')}
                  className="px-6 py-3 text-white font-bold rounded-xl transition-all shadow-md hover:brightness-110 bg-primary"
                >
                  RETURN TO PROPERTIES
                </button>
              </div>
            </div>
          )}

          {/* Cart Content Section */}
          {!isProcessing && !migrationResults && (
            <>
              {count === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 shadow-sm border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-6">
                  <div className="w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center opacity-80 text-primary">
                    <Database size={48} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Your Migration Cart is Empty</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2">
                      You haven't selected any properties for bulk migration yet. Go back to the property list to add them.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/data-entry-v2')}
                    className="px-8 py-3 text-white font-bold rounded-xl transition-all shadow-lg hover:brightness-110 bg-primary"
                  >
                    GO TO PROPERTY LIST
                  </button>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left Column: List of Properties */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        Selected Properties
                        <span className="text-xs font-normal bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600">
                          {count}
                        </span>
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {selectedProperties.map((property) => (
                        <div 
                          key={property.id}
                          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                <FileText size={24} />
                              </div>
                              <div>
                                <div className="font-mono font-black text-slate-800 dark:text-slate-100 tracking-wider">
                                  {property.tdn}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                  PIN: {property.pin}
                                  {existingTdns.includes(property.tdn) && (
                                    <span className="bg-amber-100 text-orange-700 px-1.5 py-0.5 rounded text-[8px] flex items-center gap-1 border border-amber-200 animate-in fade-in duration-300">
                                      <Database size={10} />
                                      EXISTS IN SUPABASE
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2">
                                  <Info size={14} className="opacity-50" />
                                  {property.owner}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromCart(property.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Remove from cart"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Migration Controls */}
                  <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 sticky top-24">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Migration Actions</h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Total Properties</div>
                          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{count}</div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Migration Type</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                            style={{ color: headerColor }}
                          >
                            <option>GENERAL REVISION</option>
                            <option>REVISION</option>
                            <option>MIGRATE FROM MSSQL</option>
                            <option>DATA RECOVERY</option>
                          </select>
                        </div>

                        {existingTdns.length > 0 && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 space-y-3 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                              <AlertTriangle size={16} />
                              <span className="text-xs font-black uppercase tracking-tight">Existing Records Found</span>
                            </div>
                            <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-tight">
                              {existingTdns.length} properties already exist in the target database.
                            </p>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer"
                                  checked={skipExisting}
                                  onChange={(e) => setSkipExisting(e.target.checked)}
                                />
                                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 dark:peer-focus:ring-slate-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors hover:opacity-80">
                                Skip Existing Properties
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={handleBulkMigrate}
                            className="w-full py-4 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 hover:brightness-110 bg-primary"
                          >
                            <Database size={20} />
                            EXECUTE BULK MIGRATION
                          </button>
                          <p className="text-[10px] text-center text-slate-400 mt-3 italic">
                            This action will create a bulk transaction for all {count} selected properties.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 text-primary">
                        <CheckCircle2 size={16} />
                        Migration Safety
                      </h4>
                      <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
                        <li>All operations are wrapped in a database transaction.</li>
                        <li>Rollback is automatic if any fatal error occurs.</li>
                        <li>Audit logs are created for every property.</li>
                        <li>PIN and TDN validation is performed for the whole batch.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationCartPage;
