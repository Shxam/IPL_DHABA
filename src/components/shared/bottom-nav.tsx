'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ListOrdered, Heart, User } from 'lucide-react';
import { useUserStore } from '@/store/use-user-store';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const user = useUserStore((state) => state.user);

  // Hide on admin routes or non-customer routes if preferred
  if (pathname.startsWith('/admin/dashboard') || pathname.startsWith('/admin/delivery')) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/#search', icon: Search },
    { label: 'Orders', href: '/my-orders', icon: ListOrdered },
    { label: 'Favourites', href: '/#favourites', icon: Heart },
    { 
      label: user ? 'Profile' : 'Login', 
      href: user ? (user.role === 'delivery' ? '/admin/delivery' : '/admin/dashboard') : '/admin/login', 
      icon: User 
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/90 backdrop-blur-lg px-2 py-2 flex items-center justify-around shadow-2xl md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all px-3 py-1 rounded-xl ${
              isActive
                ? 'text-saffron scale-105'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon size={18} className={isActive ? 'text-saffron stroke-[2.5]' : 'text-zinc-400'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;
