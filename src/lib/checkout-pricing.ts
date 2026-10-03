import { getProductBySlug } from "@/lib/products";

export type PricedCartItem = { slug: string; size: string; color: string; quantity: number; unitAmount: number };
export type CheckoutPricingResult =
  | { ok: true; items: PricedCartItem[]; subtotal: number }
  | { ok: false; status: number; error: string };

export async function priceCheckoutCart(rawItems: unknown): Promise<CheckoutPricingResult> {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 20) {
    return { ok: false, status: 400, error: "Your bag is empty or contains too many line items." };
  }

  const merged = new Map<string, PricedCartItem>();
  const productCache = new Map<string, Awaited<ReturnType<typeof getProductBySlug>>>();
  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) return { ok: false, status: 400, error: "One or more items in your bag are invalid." };
    const item = rawItem as Record<string, unknown>;
    if (typeof item.productId !== "string" || item.productId.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.productId) || typeof item.size !== "string" || item.size.length > 20 || !Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 10 || (item.color !== undefined && typeof item.color !== "string") || (typeof item.color === "string" && item.color.length > 30)) {
      return { ok: false, status: 400, error: "One or more items in your bag are invalid." };
    }

    let product = productCache.get(item.productId);
    if (product === undefined) {
      product = await getProductBySlug(item.productId);
      productCache.set(item.productId, product);
    }
    if (!product || !product.sizes.includes(item.size)) return { ok: false, status: 400, error: "One of the selected products or sizes is no longer available." };

    const selectedColor = typeof item.color === "string" && item.color.trim() ? item.color.trim() : product.colors?.[0] ?? "Default";
    if (product.colors?.length && !product.colors.includes(selectedColor)) return { ok: false, status: 400, error: `${product.title} does not offer the selected color.` };

    const key = JSON.stringify([product.slug, item.size, selectedColor]);
    const quantity = (merged.get(key)?.quantity ?? 0) + (item.quantity as number);
    if (quantity > 10) return { ok: false, status: 400, error: "A maximum of 10 of each product, size, and color can be ordered." };
    merged.set(key, { slug: product.slug, size: item.size, color: selectedColor, quantity, unitAmount: product.priceCents });
  }

  const items = [...merged.values()];
  let subtotal = 0;
  for (const item of items) {
    const product = productCache.get(item.slug);
    if (product?.inventory && (product.inventory[item.size] ?? 0) < item.quantity) {
      return { ok: false, status: 409, error: `${product.title} in size ${item.size} does not have enough stock.` };
    }
    subtotal += item.unitAmount * item.quantity;
  }
  return { ok: true, items, subtotal };
}