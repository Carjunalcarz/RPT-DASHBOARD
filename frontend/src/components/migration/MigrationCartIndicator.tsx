import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useMigrationCart } from '@/context/MigrationCartContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { useNavigate } from 'react-router-dom';

const MigrationCartIndicator: React.FC = () => {
  const { count } = useMigrationCart();
  const { headerColor } = useThemeColor();
  const navigate = useNavigate();

  if (count === 0) return null;

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="migration-cart-indicator"
    >
      <button
        onClick={() => navigate('/migration-cart')}
        className={`flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl text-white font-bold transition-all hover:scale-105 active:scale-95 group`}
        style={{ backgroundColor: headerColor }}
      >
        <div className="relative">
          <ShoppingCart size={24} />
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] ring-2 ring-white">
            {count}
          </span>
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm">Migration Cart</span>
          <span className="text-[10px] opacity-80">{count} properties selected</span>
        </div>
        <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default MigrationCartIndicator;
