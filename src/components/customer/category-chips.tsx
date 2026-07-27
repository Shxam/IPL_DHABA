'use client';

import React from 'react';
import { Category } from '@/types';
import { cn } from '@/lib/utils';

interface CategoryChipsProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

const getCategoryEmoji = (name: string, fallbackEmoji?: string | null): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('starter')) return '🔴';
  if (lowerName.includes('main') || lowerName.includes('curry')) return '🧢';
  if (lowerName.includes('biryani') || lowerName.includes('rice')) return '🪵';
  if (lowerName.includes('combo') || lowerName.includes('thali')) return '🏆';
  if (lowerName.includes('beverage') || lowerName.includes('drink')) return '☝️';
  return fallbackEmoji || '🏏';
};

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  return (
    <nav className="sticky top-[64px] z-30 bg-surface/95 border-b border-border shadow-sm py-3 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar flex items-center gap-3">
        
        {/* 'All' Category Chip */}
        <button
          onClick={() => onSelectCategory('all')}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-2xl border border-border bg-surface text-muted text-xs font-extrabold min-w-[72px] transition-all duration-150 hover:border-saffron hover:text-saffron',
            activeCategoryId === 'all' && 'bg-saffron border-saffron text-white hover:border-saffron hover:text-white shadow-saffron scale-105'
          )}
        >
          <span className="text-xl">🏏</span>
          <span>All</span>
        </button>

        {/* Dynamic Category Chips */}
        {categories.map((category) => {
          const emoji = getCategoryEmoji(category.name, category.emoji);
          const isActive = activeCategoryId === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 px-4 py-2 rounded-2xl border border-border bg-surface text-muted text-xs font-extrabold min-w-[78px] whitespace-nowrap transition-all duration-150 hover:border-saffron hover:text-saffron',
                isActive && 'bg-saffron border-saffron text-white hover:border-saffron hover:text-white shadow-saffron scale-105'
              )}
            >
              <span className="text-xl">{emoji}</span>
              <span>{category.name}</span>
            </button>
          );
        })}

      </div>
    </nav>
  );
};
export default CategoryChips;
