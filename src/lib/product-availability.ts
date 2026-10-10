import type { Product } from "@/lib/products";

export function isComingSoon(product: Product) {
  return /\bcoming[\s-]+(?:soon|up)\b/i.test(`${product.title} ${product.slug} ${product.badge}`);
}
