import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Product } from "@/lib/products";

export type CartItem = {
  productId: string;
  title: string;
  image: string;
  priceCents: number;
  size: string;
  color?: string;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  hasHydrated: boolean;
  addItem: (product: Product, size: string, color?: string, quantity?: number) => void;
  removeItem: (productId: string, size: string, color?: string) => void;
  setQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      addItem: (product, size, color, quantity = 1) => set((state) => {
        const selectedColor = color ?? product.colors?.[0] ?? "Default";
        const safeQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
        const requestedQuantity = Math.max(1, Math.min(10, safeQuantity));
        const maxQuantity = Math.min(10, product.inventory?.[size] ?? 10);
        const existing = state.items.find((item) => item.productId === product.slug && item.size === size && (item.color ?? "Default") === selectedColor);
        if (existing) {
          return { items: state.items.map((item) => item === existing ? { ...item, quantity: Math.min(item.quantity + requestedQuantity, maxQuantity) } : item) };
        }
        if (maxQuantity < 1) return { items: state.items };
        return {
          items: [...state.items, {
            productId: product.slug, title: product.title, image: product.image,
            priceCents: product.priceCents, size, color: selectedColor, quantity: Math.min(requestedQuantity, maxQuantity),
          }],
        };
      }),
      removeItem: (productId, size, color) => set((state) => ({
        items: state.items.filter((item) => item.productId !== productId || item.size !== size || (item.color ?? "Default") !== (color ?? "Default")),
      })),
      setQuantity: (productId, size, quantity, color) => set((state) => ({
        items: quantity < 1
          ? state.items.filter((item) => item.productId !== productId || item.size !== size || (item.color ?? "Default") !== (color ?? "Default"))
          : state.items.map((item) => item.productId === productId && item.size === size && (item.color ?? "Default") === (color ?? "Default") ? { ...item, quantity } : item),
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