import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  minOrderWarning: string | null;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
}

const MIN_ORDER_AMOUNT = 100;
const DELIVERY_FEE = 30;

const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? DELIVERY_FEE : 0;
  const totalAmount = subtotal + deliveryFee;
  const minOrderWarning =
    subtotal > 0 && subtotal < MIN_ORDER_AMOUNT
      ? `Minimum order value is Rs. ${MIN_ORDER_AMOUNT}. Please add Rs. ${MIN_ORDER_AMOUNT - subtotal} more.`
      : null;

  return { subtotal, deliveryFee, totalAmount, minOrderWarning };
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      totalAmount: 0,
      minOrderWarning: null,

      addItem: (newItem) =>
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (item) => item.menu_item_id === newItem.menu_item_id
          );

          let updatedItems: CartItem[];
          if (existingItemIndex > -1) {
            updatedItems = [...state.items];
            updatedItems[existingItemIndex].quantity += newItem.quantity || 1;
          } else {
            updatedItems = [...state.items, { ...newItem, quantity: newItem.quantity || 1 } as CartItem];
          }

          return {
            items: updatedItems,
            ...calculateTotals(updatedItems),
          };
        }),

      removeItem: (itemId) =>
        set((state) => {
          const updatedItems = state.items.filter((item) => item.menu_item_id !== itemId);
          return {
            items: updatedItems,
            ...calculateTotals(updatedItems),
          };
        }),

      updateQuantity: (itemId, delta) =>
        set((state) => {
          const updatedItems = state.items
            .map((item) => {
              if (item.menu_item_id === itemId) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
              }
              return item;
            })
            .filter((item) => item.quantity > 0);

          return {
            items: updatedItems,
            ...calculateTotals(updatedItems),
          };
        }),

      clearCart: () =>
        set(() => ({
          items: [],
          subtotal: 0,
          deliveryFee: 0,
          totalAmount: 0,
          minOrderWarning: null,
        })),
    }),
    {
      name: 'ipl-dhaba-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
