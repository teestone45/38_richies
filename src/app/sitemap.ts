import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const products = await getProducts();
  return [
    { url: siteUrl.toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/journal", siteUrl).toString(), changeFrequency: "weekly", priority: 0.6 },
    ...products.map((product) => ({
      url: new URL(`/product/${product.slug}`, siteUrl).toString(),
      changeFrequency: "weekly" as const,
      priority: product.featured ? 0.8 : 0.6,
      images: product.images.length ? product.images : [product.image],
    })),
  ];
}