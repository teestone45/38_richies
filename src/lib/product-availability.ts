import type { Product } from "@/lib/products";

export function isComingSoon(product: Pick<Product, "title" | "slug" | "badge" | "comingSoon">) {
  return product.comingSoon ?? /\bcoming[\s-]+(?:soon|up)\b/i.test(`${product.title} ${product.slug} ${product.badge}`);
}
