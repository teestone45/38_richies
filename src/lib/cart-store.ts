import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/lib/products";

export type CartItem = {
  productId: string;
  title: string;
  image: string;
  priceCents: number;
  size: string;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  hasHydrated: boolean;
  addItem: (product: Product, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  setQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      addItem: (product, size) => set((state) => {
        const existing = state.items.find((item) => item.productId === product.slug && item.size === size);
        if (existing) {
          return { items: state.items.map((item) => item === existing ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item) };
        }
        return {
          items: [...state.items, {
            productId: product.slug, title: product.title, image: product.image,
            priceCents: product.priceCents, size, quantity: 1,
          }],
        };
      }),
      removeItem: (productId, size) => set((state) => ({
        items: state.items.filter((item) => item.productId !== productId || item.size !== size),
      })),
      setQuantity: (productId, size, quantity) => set((state) => ({
        items: quantity < 1
          ? state.items.filter((item) => item.productId !== productId || item.size !== size)
          : state.items.map((item) => item.productId === productId && item.size === size ? { ...item, quantity } : item),
      })),
      clearCart: () => set({ items: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "38-riches-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);