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
    <div className="bg-surface dark:bg-surface rounded-lg shadow-sm border border-border dark:border-border p-4 mb-4">
      <h2 className="text-base font-semibold text-foreground dark:text-surface mb-3">Property Search</h2>
      
      {/* PIN Search */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1.5">PIN</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="053-07-0002-003-32"
            className="flex-1 px-3 py-2 text-sm bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-600 text-foreground dark:text-surface"
          />
          <button
            onClick={() => onPinSearch(pin)}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Search size={16} />
            Search
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border dark:border-border"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface dark:bg-surface px-3 text-xs text-muted dark:text-muted">Or Search by Location</span>
        </div>
      </div>

      {/* Location Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1.5">Municipality</label>
          <select
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-600 text-foreground dark:text-surface"
          >
            <option value="">Select municipality</option>
            <option value="tubay">Tubay</option>
            <option value="bacuag">Bacuag</option>
            <option value="gigaquit">Gigaquit</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground dark:text-foreground mb-1.5">Barangay (Optional)</label>
          <select
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background dark:bg-background border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-600 text-foreground dark:text-surface"
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
          className="px-4 py-2 text-sm bg-primary hover:bg-primary-light dark:bg-primary/100 dark:hover:bg-primary text-surface rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Search size={16} />
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchCard;
