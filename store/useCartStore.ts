import { create } from 'zustand';
export interface CartItem {
  cartItemId: string;
  id: number;
  name: string;
  price: number;
  quantity: number;
  options?: {
    temperature: 'HOT' | 'ICE';
    size: 'Regular' | 'Large';
    shot: number;
  };
}

interface CartState {
  cart: CartItem[];
  totalPrice: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: [],
  totalPrice: 0,
  
  addToCart: (item) =>
    set((state) => {
      const existingItemIndex = state.cart.findIndex((cartItem) => cartItem.cartItemId === item.cartItemId);
      const newCart = [...state.cart];
      
      if (existingItemIndex !== -1) {
        newCart[existingItemIndex].quantity += item.quantity;
      } else {
        newCart.push(item);
      }
      
      return {
        cart: newCart,
        totalPrice: newCart.reduce((total, i) => total + i.price * i.quantity, 0),
      };
    }),

  removeFromCart: (cartItemId) =>
    set((state) => {
      const newCart = state.cart.filter((item) => item.cartItemId !== cartItemId);
      return {
        cart: newCart,
        totalPrice: newCart.reduce((total, i) => total + i.price * i.quantity, 0),
      };
    }),

  updateQuantity: (cartItemId, delta) =>
    set((state) => {
      const newCart = state.cart.map((item) => {
        if (item.cartItemId === cartItemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      return {
        cart: newCart,
        totalPrice: newCart.reduce((total, i) => total + i.price * i.quantity, 0),
      };
    }),

  clearCart: () => set({ cart: [], totalPrice: 0 }),
}));