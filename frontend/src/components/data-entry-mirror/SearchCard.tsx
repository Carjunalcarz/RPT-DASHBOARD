import React from 'react';
import { Search } from 'lucide-react';

interface SearchCardProps {
  onPinSearch: (pin: string) => void;
  onLocationSearch: (municipality: string, barangay: string) => void;
}

const SearchCard: React.FC<SearchCardProps> = ({ onPinSearch, onLocationSearch }) => {
  const [pin, setPin] = React.useState('');
  const [municipality, setMunicipality] = React.useState('');
  const [barangay, setBarangay] = React.useState('');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-4">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Property Search</h2>
      
      {/* PIN Search */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">PIN</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="053-07-0002-003-32"
            className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
          />
          <button
            onClick={() => onPinSearch(pin)}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-500 dark:text-slate-400">Or Search by Location</span>
        </div>
      </div>

      {/* Location Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Municipality</label>
          <select
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select municipality</option>
            <option value="tubay">Tubay</option>
            <option value="bacuag">Bacuag</option>
            <option value="gigaquit">Gigaquit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Barangay (Optional)</label>
          <select
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-slate-900 dark:text-slate-100"
          >
            <option value="">Select barangay</option>
            <option value="poblacion">Poblacion</option>
            <option value="tinigbasan">Tinigbasan</option>
            <option value="tagmamarkay">Tagmamarkay</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onLocationSearch(municipality, barangay)}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Search size={16} />
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchCard;
