import React from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { useMigrationCart } from '../../context/MigrationCartContext';
import { useNavigate } from 'react-router';
import { useThemeColor } from '../../context/ThemeColorContext';

const MigrationCartIndicator: React.FC = () => {
  const { count } = useMigrationCart();
  const navigate = useNavigate();
  const { headerColor } = useThemeColor();

  if (count === 0) return null;

  // Render into document.body so the fixed `z-[100]` competes at the document
  // root. Inside the dashboard's `z-20` content container the button would be
  // trapped in that stacking context and painted *under* the root-level bottom
  // dock (`z-40`), which then swallows the clicks. (React context still flows
  // through the portal, so useNavigate/cart/theme keep working.)
  return createPortal(
    <div
      className="fixed bottom-[110px] right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="migration-cart-indicator"
    >
      <button
        onClick={() => navigate('/dashboard/migration-cart')}
        className="flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl text-white font-bold transition-all hover:scale-105 active:scale-95 group hover:brightness-110 bg-primary"
      >
        <div className="relative">
          <ShoppingCart size={24} />
          {count > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] ring-2 ring-white">
              {count}
            </span>
          )}
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-sm">Migration Cart</span>
          <span className="text-[10px] opacity-80">{count} properties selected</span>
        </div>
        <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>,
    document.body
  );
};

export default MigrationCartIndicator;
