'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/use-cart-store';
import { useUserStore } from '@/store/use-user-store';
import { ShoppingCart, User, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { formatPrice } from '@/lib/utils';

interface NavbarProps {
  onCartClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCartClick }) => {
  const cartItemsCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const cartTotal = useCartStore((state) => state.subtotal);
  const user = useUserStore((state) => state.user);

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo and Title */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Image 
            src="/logo.png" 
            alt="IPL Dhaba Logo" 
            width={40} 
            height={40} 
            className="rounded-full shadow-sm object-cover"
          />
          <span className="font-display text-xl sm:text-2xl text-saffron font-bold">
            IPL Dhaba
          </span>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* Contact shortcut */}
          <Link 
            href="/contact"
            className="text-xs font-semibold text-muted hover:text-saffron transition-colors border border-border rounded-full px-3 py-1 bg-cream/30 hover:bg-cream"
          >
            Contact Us
          </Link>
          
          {/* Admin link shortcut */}
          <Link 
            href={user ? (user.role === 'delivery' ? '/admin/delivery' : '/admin/dashboard') : '/admin/login'}
            className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-saffron transition-colors border border-border rounded-full px-3 py-1 bg-cream/30 hover:bg-cream"
          >
            {user ? <ShieldAlert size={14} /> : <User size={14} />}
            <span>{user ? 'Staff Portal' : 'Staff Login'}</span>
          </Link>

          {/* Floating / Static Cart Trigger */}
          {onCartClick && (
            <button
              onClick={onCartClick}
              className="relative flex items-center gap-2 bg-saffron hover:bg-saffron-hover text-white rounded-full px-4 py-2 text-sm font-bold shadow-saffron transition-all active:scale-[0.98]"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">{formatPrice(cartTotal)}</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-green text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-surface animate-pulse-fast">
                  {cartItemsCount}
                </span>
              )}
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
