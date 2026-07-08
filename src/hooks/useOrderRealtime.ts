import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface StatusHistoryItem {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  note?: string;
  created_at: string;
}

export function useOrderRealtime(orderId: string) {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // Fetch initial order status history
    supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setStatusHistory(data as StatusHistoryItem[]);
        }
        setLoading(false);
      });

    // Subscribe to real-time status history inserts
    const channel = supabase
      .channel(`order-timeline-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          setStatusHistory((prev) => {
            // Prevent duplicate entries if payload matches any existing id
            if (prev.some((item) => item.id === payload.new.id)) {
              return prev;
            }
            return [...prev, payload.new as StatusHistoryItem];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { statusHistory, loading };
}
export default useOrderRealtime;
