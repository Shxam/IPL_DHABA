'use client';

import React from 'react';
import { Category } from '@/types';
import { cn } from '@/lib/utils';
import { Utensils } from 'lucide-react';

interface CategoryChipsProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  return (
    <nav className="sticky top-[64px] z-30 bg-surface border-b border-border shadow-sm py-2 bg-opacity-95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar flex gap-2">
        
        {/* 'All' Category Chip */}
        <button
          onClick={() => onSelectCategory('all')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-surface text-muted text-sm font-semibold whitespace-nowrap transition-all duration-150 hover:border-saffron hover:text-saffron',
            activeCategoryId === 'all' && 'bg-saffron border-saffron text-white hover:border-saffron hover:text-white shadow-saffron'
          )}
        >
          <Utensils size={14} />
          <span>All</span>
        </button>

        {/* Dynamic Category Chips */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-surface text-muted text-sm font-semibold whitespace-nowrap transition-all duration-150 hover:border-saffron hover:text-saffron',
              activeCategoryId === category.id && 'bg-saffron border-saffron text-white hover:border-saffron hover:text-white shadow-saffron'
            )}
          >
            {category.emoji && <span>{category.emoji}</span>}
            <span>{category.name}</span>
          </button>
        ))}

      </div>
    </nav>
  );
};
export default CategoryChips;
