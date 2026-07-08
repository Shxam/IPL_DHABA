'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useUserStore } from '@/store/use-user-store';
import { Order, OrderStatus, MenuItem, Category, AuditLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, ShoppingBag, Clock, CheckCircle, 
  LogOut, Plus, Edit, ShieldAlert, BarChart, 
  Package, Loader2, ListOrdered, Check, X, Inbox
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useUserStore();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'categories' | 'audit'>('orders');
  const [ordersFilter, setOrdersFilter] = useState<'active' | 'all' | 'completed' | 'cancelled'>('active');

  // Guard routing
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'super_admin' && user.role !== 'owner')) {
      router.push('/admin/login');
    }
  }, [user, router]);

  // 1. Fetch Orders List via TanStack Query
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['admin-orders', ordersFilter],
    queryFn: async () => {
      const res = await fetch(`/api/orders?status=${ordersFilter}&limit=100`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!user,
  });

  // 2. Fetch Analytics Stats
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    today: { totalOrders: number; totalRevenue: number; pendingOrders: number; deliveredToday: number };
    weeklyRevenue: { date: string; revenue: number }[];
  }>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: !!user,
  });

  // 3. Fetch Menu & Categories for CRUD
  const { data: menuData } = useQuery<{ categories: Category[]; items: MenuItem[] }>({
    queryKey: ['admin-menu-data'],
    queryFn: async () => {
      const res = await fetch('/api/menu');
      return res.json();
    },
  });

  // 4. Fetch Audit Logs (Admin only)
  const { data: auditData } = useQuery<{ logs: AuditLog[] }>({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs?limit=50');
      return res.json();
    },
    enabled: !!user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'owner') && activeTab === 'audit',
  });

  // 5. Setup Real-time updates for orders
  useEffect(() => {
    if (!user) return;

    console.log('[Admin Realtime] Subscribing to all orders changes');
    const channel = supabase
      .channel('admin-orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Subscribe to insert, update, delete
          schema: 'public',
          table: 'orders',
        },
        () => {
          console.log('[Admin Realtime] Orders changed! Invalidating queries.');
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // 6. Order Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: string; status: OrderStatus; reason?: string }) => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, cancelled_reason: reason }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    },
  });

  // 7. Menu item toggling availability mutation
  const toggleAvailableMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: isAvailable })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu-data'] });
      try {
        await fetch('/api/menu/invalidate', { method: 'POST' });
      } catch (err) {
        console.error('Failed to invalidate menu cache:', err);
      }
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/admin/login');
  };

  const handleUpdateStatus = (orderId: string, currentStatus: OrderStatus, action: 'advance' | 'cancel') => {
    if (action === 'cancel') {
      const reason = prompt('Enter cancellation reason:') || 'Restaurant busy';
      updateStatusMutation.mutate({ orderId, status: 'cancelled', reason });
      return;
    }

    let nextStatus: OrderStatus = 'placed';
    if (currentStatus === 'placed') nextStatus = 'confirmed';
    else if (currentStatus === 'confirmed') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'out_for_delivery';
    else if (currentStatus === 'out_for_delivery') nextStatus = 'delivered';

    updateStatusMutation.mutate({ orderId, status: nextStatus });
  };

  const getActionButtonText = (status: OrderStatus) => {
    if (status === 'placed') return 'Confirm Order';
    if (status === 'confirmed') return 'Start Cooking';
    if (status === 'preparing') return 'Out for Delivery';
    if (status === 'out_for_delivery') return 'Mark Delivered';
    return '';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream/30 flex flex-col">
      
      {/* Dashboard Top Header */}
      <header className="bg-ink text-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-saffron w-6 h-6 animate-pulse" />
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-wide text-saffron">Dhaba Admin</h1>
            <p className="text-[10px] text-muted-foreground opacity-80 font-medium">Real-time Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs font-semibold text-gray-300">
            Welcome, {user.full_name && user.full_name !== 'Guest User' ? user.full_name : user.email} ({user.role.toUpperCase()})
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition-all"
          >
            <LogOut size={12} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <nav className="flex border-b border-border bg-surface rounded-md p-1 border shadow-sm">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-md transition-all ${
              activeTab === 'orders' ? 'bg-saffron text-white shadow-sm' : 'text-muted hover:bg-cream/40'
            }`}
          >
            <ListOrdered size={16} />
            <span>Manage Orders</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-md transition-all ${
              activeTab === 'menu' ? 'bg-saffron text-white shadow-sm' : 'text-muted hover:bg-cream/40'
            }`}
          >
            <Package size={16} />
            <span>Menu Items</span>
          </button>
          {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'owner') && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-md transition-all ${
                activeTab === 'audit' ? 'bg-saffron text-white shadow-sm' : 'text-muted hover:bg-cream/40'
              }`}
            >
              <BarChart size={16} />
              <span>Audit Logs</span>
            </button>
          )}
        </nav>

        {/* 1. ORDERS SECTION */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-6">
            
            {/* Analytics Stats Overview */}
            {analyticsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-surface rounded-lg border border-border" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-surface border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted">Today&apos;s Revenue</p>
                      <h4 className="text-lg font-bold text-saffron mt-1">
                        {formatPrice(analyticsData?.today.totalRevenue || 0)}
                      </h4>
                    </div>
                    <TrendingUp className="text-saffron w-8 h-8 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="bg-surface border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted">Today&apos;s Orders</p>
                      <h4 className="text-lg font-bold text-ink mt-1">
                        {analyticsData?.today.totalOrders || 0}
                      </h4>
                    </div>
                    <ShoppingBag className="text-ink w-8 h-8 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="bg-surface border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted">Active Orders</p>
                      <h4 className="text-lg font-bold text-ink mt-1">
                        {analyticsData?.today.pendingOrders || 0}
                      </h4>
                    </div>
                    <Clock className="text-ink w-8 h-8 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="bg-surface border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted">Completed Today</p>
                      <h4 className="text-lg font-bold text-green mt-1">
                        {analyticsData?.today.deliveredToday || 0}
                      </h4>
                    </div>
                    <CheckCircle className="text-green w-8 h-8 opacity-20" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filter Tabs for Orders */}
            <div className="flex gap-2 flex-wrap">
              {(['active', 'all', 'completed', 'cancelled'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOrdersFilter(filter)}
                  className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                    ordersFilter === filter
                      ? 'bg-ink border-ink text-white shadow-sm'
                      : 'bg-surface border-border text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Orders list container */}
            {ordersLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-muted">
                <Loader2 className="animate-spin text-saffron w-6 h-6" />
                <span className="text-xs font-semibold">Loading orders...</span>
              </div>
            ) : (ordersData?.orders || []).length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-lg border border-border">
                <Inbox className="mx-auto w-10 h-10 text-muted/40" />
                <h3 className="font-bold text-ink text-sm mt-3">No orders found</h3>
                <p className="text-xs text-muted mt-0.5">Order queues are currently clear.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(ordersData?.orders || []).map((order) => (
                  <Card key={order.id} className="bg-surface border-border flex flex-col justify-between">
                    <CardHeader className="p-4 border-b border-border flex flex-row justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-bold text-ink flex items-center gap-1.5">
                          Order #{order.order_number}
                        </CardTitle>
                        <span className="text-[10px] text-muted block mt-0.5">
                          {new Date(order.created_at || '').toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge variant={order.status}>{order.status.replace(/_/g, ' ').toUpperCase()}</Badge>
                    </CardHeader>
                    <CardContent className="p-4 flex-1">
                      <div className="flex flex-col gap-2 text-xs text-ink">
                        <div>
                          <strong>Customer:</strong> {order.customer_name} ({order.phone})
                        </div>
                        <div>
                          <strong>Address:</strong> {order.delivery_address?.address_line}
                        </div>
                        {order.delivery_instructions && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded">
                            <strong>Note:</strong> {order.delivery_instructions}
                          </div>
                        )}
                        <div className="border-t border-dashed border-border pt-2.5 mt-2 flex flex-col gap-1">
                          <strong>Items Ordered:</strong>
                          <ul className="list-disc list-inside text-muted">
                            {order.order_items?.map((item, idx) => (
                              <li key={idx} className="truncate">
                                {item.name} x{item.quantity} ({formatPrice(item.unit_price)})
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Actions footer */}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <div className="p-4 bg-cream/20 border-t border-border flex justify-end gap-2">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, order.status, 'cancel')}
                          className="px-3"
                        >
                          <X size={14} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, order.status, 'advance')}
                          className="px-4"
                        >
                          <Check size={14} className="mr-1" />
                          <span>{getActionButtonText(order.status)}</span>
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

          </div>
        )}

        {/* 2. MENU MANAGEMENT SECTION */}
        {activeTab === 'menu' && (
          <Card className="bg-surface border-border">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-ink">Menu Catalog Management</CardTitle>
              <Button size="sm" className="flex items-center gap-1">
                <Plus size={14} />
                <span>Add Item</span>
              </Button>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted font-bold">
                    <th className="py-2">Item Name</th>
                    <th className="py-2">Food Type</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Availability</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(menuData?.items || []).map((item) => (
                    <tr key={item.id} className="border-b border-border hover:bg-cream/15 transition-colors">
                      <td className="py-3 font-semibold text-ink">{item.name}</td>
                      <td className="py-3 capitalize">{item.food_type.replace('_', ' ')}</td>
                      <td className="py-3 font-bold">{formatPrice(item.price)}</td>
                      <td className="py-3">
                        <button
                          onClick={() => toggleAvailableMutation.mutate({ itemId: item.id, isAvailable: !item.is_available })}
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            item.is_available 
                              ? 'bg-green/10 text-green border border-green/20' 
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}
                        >
                          {item.is_available ? 'IN STOCK' : 'OUT OF STOCK'}
                        </button>
                      </td>
                      <td className="py-3 text-right flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="p-1.5">
                          <Edit size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* 3. AUDIT LOGS SECTION */}
        {activeTab === 'audit' && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'owner') && (
          <Card className="bg-surface border-border">
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-sm font-bold text-ink">System Security Audit Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted font-bold">
                    <th className="py-2">Timestamp</th>
                    <th className="py-2">User</th>
                    <th className="py-2">Security Event Action</th>
                    <th className="py-2">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData?.logs || []).map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-cream/10">
                      <td className="py-2.5 text-muted">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2.5 font-medium">{log.profiles?.email || 'System / Anon'}</td>
                      <td className="py-2.5 font-bold uppercase text-saffron">{log.action}</td>
                      <td className="py-2.5 text-muted">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
