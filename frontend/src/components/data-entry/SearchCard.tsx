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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Property Search</h2>
      
      {/* PIN Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-600 mb-2">PIN</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="053-07-0002-003-32"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700"
          />
          <button
            onClick={() => onPinSearch(pin)}
            className="px-6 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Search size={18} />
            Search
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm text-slate-500">Or Search by Location</span>
        </div>
      </div>

      {/* Location Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Municipality</label>
          <select
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 bg-white"
          >
            <option value="">Select municipality</option>
            <option value="tubay">Tubay</option>
            <option value="bacuag">Bacuag</option>
            <option value="gigaquit">Gigaquit</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Barangay (Optional)</label>
          <select
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-700 bg-white"
          >
            <option value="">Select barangay</option>
            <option value="poblacion">Poblacion</option>
            <option value="tinigbasan">Tinigbasan</option>
            <option value="tagmamarkay">Tagmamarkay</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onLocationSearch(municipality, barangay)}
          className="px-6 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Search size={18} />
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchCard;
