'use client';

import React from 'react';
import { OrderStatus } from '@/types';
import { CheckCircle, Clock, Truck, ChefHat, Check, XCircle } from 'lucide-react';

interface StatusTimelineProps {
  status: OrderStatus;
}

const STATUS_STEPS: { key: OrderStatus; label: string; icon: any; description: string }[] = [
  { 
    key: 'placed', 
    label: 'Order Placed', 
    icon: Clock,
    description: 'We received your order' 
  },
  { 
    key: 'confirmed', 
    label: 'Confirmed', 
    icon: CheckCircle,
    description: 'Dhaba confirmed the items' 
  },
  { 
    key: 'preparing', 
    label: 'Preparing', 
    icon: ChefHat,
    description: 'Chefs are cooking the meal' 
  },
  { 
    key: 'out_for_delivery', 
    label: 'Out for Delivery', 
    icon: Truck,
    description: 'Rider is carrying your food' 
  },
  { 
    key: 'delivered', 
    label: 'Delivered', 
    icon: Check,
    description: 'Order completed!' 
  },
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-4">
        <XCircle className="text-cancelled w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-red-800 text-sm sm:text-base">Order Cancelled</h3>
          <p className="text-red-700 text-xs sm:text-sm mt-0.5">
            This order was cancelled by the administrator or customer support.
          </p>
        </div>
      </div>
    );
  }

  // Find index of current status
  const currentStepIndex = STATUS_STEPS.findIndex((step) => step.key === status);

  return (
    <div className="flex flex-col gap-6 md:flex-row md:justify-between md:gap-2">
      {STATUS_STEPS.map((step, idx) => {
        const StepIcon = step.icon;
        const isCompleted = idx <= currentStepIndex;
        const isCurrent = idx === currentStepIndex;

        return (
          <div key={step.key} className="flex flex-1 gap-4 md:flex-col md:align-center md:gap-2 relative">
            
            {/* Horizontal timeline connector lines (Desktop only) */}
            {idx < STATUS_STEPS.length - 1 && (
              <div 
                className={`hidden md:block absolute top-5 left-[50%] right-[-50%] h-0.5 z-0 ${
                  idx < currentStepIndex ? 'bg-green' : 'bg-border'
                }`}
              />
            )}

            {/* Icon Step indicator */}
            <div className="flex flex-col items-center z-10 md:justify-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted 
                    ? 'bg-green border-green text-white' 
                    : 'bg-surface border-border text-muted/60'
                } ${isCurrent && 'ring-4 ring-green/20 scale-105'}`}
              >
                <StepIcon size={18} className={isCurrent ? 'animate-bounce' : ''} />
              </div>

              {/* Vertical connector line (Mobile only) */}
              {idx < STATUS_STEPS.length - 1 && (
                <div 
                  className={`w-0.5 h-10 md:hidden mt-2 ${
                    idx < currentStepIndex ? 'bg-green' : 'bg-border'
                  }`}
                />
              )}
            </div>

            {/* Labels and description */}
            <div className="flex-1 flex flex-col md:text-center md:items-center">
              <span className={`text-sm font-bold ${isCompleted ? 'text-ink' : 'text-muted/60'}`}>
                {step.label}
              </span>
              <span className="text-[11px] text-muted leading-tight mt-0.5 max-w-[120px]">
                {step.description}
              </span>
            </div>

          </div>
        );
      })}
    </div>
  );
};
export default StatusTimeline;
