export type FoodType = 'veg' | 'non_veg' | 'egg';
export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type UserRole = 'customer' | 'delivery' | 'manager' | 'admin' | 'super_admin' | 'owner';


export interface Category {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  food_type: FoodType;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  categories?: {
    id: string;
    name: string;
    emoji?: string;
  };
}

export interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  food_type: FoodType;
}

export interface Address {
  id: string;
  user_id: string;
  title: string;
  address_line: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_item_id?: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number?: number;
  customer_id?: string | null;
  customer_name: string;
  phone: string;
  delivery_address: {
    address_line: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  delivery_instructions?: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  estimated_delivery_at?: string | null;
  delivered_at?: string | null;
  cancelled_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  tracking_token?: string;
  order_items?: OrderItem[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: OrderStatus | null;
  new_status: OrderStatus;
  changed_by?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  } | null;
}
