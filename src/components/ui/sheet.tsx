import * as React from 'react';
import { cn } from '@/lib/utils';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'right' | 'bottom';
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  side = 'right', 
  className 
}) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        'absolute bg-surface shadow-premium z-10 flex flex-col',
        {
          // Right panel slide-in
          'right-0 top-0 bottom-0 w-full md:max-w-md h-full border-l border-border animate-in slide-in-from-right duration-300': side === 'right',
          // Bottom sheet slide-up
          'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-lg border-t border-border animate-in slide-in-from-bottom duration-300': side === 'bottom',
        },
        className
      )}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          {title && <h2 className="font-bold text-lg text-ink">{title}</h2>}
          <button 
            onClick={onClose} 
            className="text-muted hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream transition-colors text-xl font-bold"
            aria-label="Close sheet"
          >
            &times;
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};
