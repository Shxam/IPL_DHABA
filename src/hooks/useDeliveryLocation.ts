import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface LocationCoords {
  lat: number;
  lng: number;
}

export function useDeliveryLocation(orderId: string) {
  const [location, setLocation] = useState<LocationCoords | null>(null);

  useEffect(() => {
    if (!orderId) return;

    // Fetch the latest delivery location on initial load
    supabase
      .from('delivery_locations')
      .select('lat, lng')
      .eq('order_id', orderId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setLocation({
            lat: Number(data.lat),
            lng: Number(data.lng),
          });
        }
      });

    // Subscribe to updates for this specific order delivery location
    const channel = supabase
      .channel(`live-delivery-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_locations',
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.lat === 'number' && typeof payload.new.lng === 'number') {
            setLocation({
              lat: payload.new.lat,
              lng: payload.new.lng,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return location;
}
export default useDeliveryLocation;
