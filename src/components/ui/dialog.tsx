import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Content Container */}
      <div className={cn(
        'relative bg-surface rounded-lg border border-border w-full max-w-lg shadow-premium z-10 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200',
        className
      )}>
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          {title && <h2 className="font-bold text-lg text-ink">{title}</h2>}
          <button 
            onClick={onClose} 
            className="text-muted hover:text-ink w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream transition-colors text-xl font-bold"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        
        {/* Body */}
        <div className="overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
};
