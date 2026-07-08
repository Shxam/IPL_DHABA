import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full border border-border rounded-md px-3.5 py-2.5 text-sm bg-surface outline-none transition-all placeholder:text-muted/60 focus:border-saffron focus:ring-2 focus:ring-saffron/15 disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-cancelled focus:border-cancelled focus:ring-cancelled/15',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-cancelled font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
