'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useUserStore } from '@/store/use-user-store';
import { Order, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, Truck, Navigation, 
  MapPin, Phone, Loader2, RefreshCw, Route, Coffee
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function DeliveryPortal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useUserStore();

  // Guard routing
  useEffect(() => {
    if (!user || user.role !== 'delivery') {
      router.push('/admin/login');
    }
  }, [user, router]);

  // Query assigned active delivery orders
  const { data, isLoading, refetch } = useQuery<{ orders: Order[] }>({
    queryKey: ['delivery-orders'],
    queryFn: async () => {
      // Fetch orders. The route filter logic handles security filtering.
      const res = await fetch('/api/orders?status=active');
      if (!res.ok) throw new Error('Failed to load delivery queue');
      return res.json();
    },
    enabled: !!user,
  });

  const orders = data?.orders || [];

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/admin/login');
  };

  const handleStatusChange = (orderId: string, currentStatus: OrderStatus) => {
    const nextStatus = currentStatus === 'out_for_delivery' ? 'delivered' : 'out_for_delivery';
    updateStatusMutation.mutate({ orderId, status: nextStatus });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream/30 flex flex-col">
      
      {/* Portal Header */}
      <header className="bg-ink text-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Truck className="text-saffron w-5 h-5" />
          <h1 className="font-display text-lg font-bold tracking-wide text-saffron">Dhaba Driver</h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Refresh list"
          >
            <RefreshCw size={14} className={updateStatusMutation.isPending ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition-all"
          >
            <LogOut size={11} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-4">
        
        {/* Welcome status header */}
        <div className="bg-surface border border-border rounded-lg p-4 shadow-sm text-xs">
          <strong>Driver Profile:</strong> {user.full_name && user.full_name !== 'Guest User' ? user.full_name : user.email}
        </div>

        <h2 className="text-sm font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5 mt-2">
          <Route size={16} className="text-saffron" />
          Active Delivery Queue ({orders.length})
        </h2>

        {/* Deliveries queues loader */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted">
            <Loader2 className="animate-spin text-saffron w-6 h-6" />
            <span className="text-xs font-semibold">Loading your route queue...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-lg border border-border">
            <Coffee className="mx-auto w-10 h-10 text-muted/40" />
            <h3 className="font-bold text-ink text-sm mt-3">No active deliveries</h3>
            <p className="text-xs text-muted mt-0.5">Enjoy your break! Refresh the page when orders resume.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="bg-surface border-border shadow-sm">
                <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-sm font-bold text-ink">Order #{order.order_number}</CardTitle>
                    <span className="text-[10px] text-muted block mt-0.5">
                      Placed: {new Date(order.created_at || '').toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge variant={order.status}>{order.status.replace(/_/g, ' ').toUpperCase()}</Badge>
                </CardHeader>
                <CardContent className="p-4 flex flex-col gap-3">
                  {/* Delivery addresses & instructions */}
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="text-saffron flex-shrink-0 mt-0.5" />
                      <span>{order.delivery_address?.address_line}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={14} className="text-green flex-shrink-0" />
                      <a href={`tel:${order.phone}`} className="text-saffron hover:underline font-semibold">
                        {order.phone}
                      </a>
                    </div>
                    {order.delivery_instructions && (
                      <div className="bg-amber-50 p-2 rounded text-[11px] text-amber-800">
                        <strong>Rider Note:</strong> {order.delivery_instructions}
                      </div>
                    )}
                  </div>

                  {/* Actions to status progress */}
                  <div className="border-t border-border pt-3 mt-1 flex justify-between items-center">
                    <span className="font-extrabold text-ink text-sm">
                      COD Total: {formatPrice(order.total_amount)}
                    </span>
                    <Button
                      size="sm"
                      isLoading={updateStatusMutation.isPending}
                      onClick={() => handleStatusChange(order.id, order.status)}
                    >
                      <Navigation size={12} className="mr-1" />
                      <span>
                        {order.status === 'out_for_delivery' ? 'Mark Delivered' : 'Start Delivery'}
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
