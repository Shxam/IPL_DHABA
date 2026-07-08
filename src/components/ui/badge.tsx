import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
}

export const Badge = ({ className, variant = 'primary', ...props }: BadgeProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors focus:outline-none',
        {
          'bg-saffron/10 text-saffron border-saffron/20': variant === 'primary',
          'bg-green/10 text-green border-green/20': variant === 'secondary',
          'border-border text-ink bg-transparent': variant === 'outline',
          
          // Order statuses
          'bg-gray-100 text-gray-800 border-gray-200': variant === 'placed',
          'bg-blue-50 text-blue-700 border-blue-100': variant === 'confirmed',
          'bg-amber-50 text-amber-700 border-amber-100': variant === 'preparing',
          'bg-purple-50 text-purple-700 border-purple-100': variant === 'out_for_delivery',
          'bg-emerald-50 text-emerald-700 border-emerald-100': variant === 'delivered',
          'bg-red-50 text-red-700 border-red-100': variant === 'cancelled',
        },
        className
      )}
      {...props}
    />
  );
};
