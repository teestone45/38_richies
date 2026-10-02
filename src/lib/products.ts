import { createClient } from "@sanity/client";
import { vintageTeeDesigns } from "@/lib/vintage-tee-designs";

export type ProductArtwork = {
  top: string;
  center: string;
  bottom: string;
  palette: string;
};

export type Product = {
  slug: string;
  title: string;
  priceCents: number;
  image: string;
  images: string[];
  category: string;
  badge: string;
  description: string;
  colors?: string[];
  sizes: string[];
  dtfPlacement: string;
  fabric: string;
  printMethod?: "DTF" | "DTG" | "Embroidered";
  artwork?: ProductArtwork;
  inventory?: Record<string, number>;
  featured?: boolean;
};

const fallbackProducts: Product[] = [
  {
    slug: "dark-trilogy-tee", title: "Dark Trilogy Tee", priceCents: 4500,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1100&q=88",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1100&q=88"],
    category: "Graphic tee", badge: "DROP 001",
    description: "A heavyweight everyday layer with an oversized shape and a bold front graphic. Cut to sit easy, made to hold its shape.",
    colors: ["Black", "White", "Heather Grey"], sizes: ["XL", "2XL"], dtfPlacement: "A3 front print, centered 3 inches below the collar.", fabric: "280 GSM cotton",
    printMethod: "DTF", artwork: { top: "38 RICHES", center: "38", bottom: "MOVE DIFFERENT / 001", palette: "ink" },
  },
  {
    slug: "after-hours-tee", title: "After Hours Tee", priceCents: 4200,
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1100&q=88",
    images: ["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1100&q=88"],
    category: "Graphic tee", badge: "SMALL RUN",
    description: "An oversized cotton tee for late starts and longer nights. A clean silhouette with a considered, durable finish.",
    colors: ["Ink", "Cream"], sizes: ["XL", "2XL"], dtfPlacement: "A3 front print, centered 3 inches below the collar.", fabric: "280 GSM cotton",
    printMethod: "DTG", artwork: { top: "AFTER HOURS", center: "38", bottom: "STAY OUT A LITTLE LONGER", palette: "gold" },
  },
  {
    slug: "riches-heavy-hoodie", title: "38 Heavy Hoodie", priceCents: 8800,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1100&q=88",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1100&q=88"],
    category: "Fleece", badge: "HEAVYWEIGHT",
    description: "A substantial fleece layer with room through the body and a soft brushed interior. Built for repeat wear.",
    colors: ["Charcoal", "Sand"], sizes: ["XL", "2XL"], dtfPlacement: "Front graphic, centered on chest.", fabric: "450 GSM cotton blend",
    printMethod: "DTF", artwork: { top: "38 RICHES", center: "38", bottom: "HEAVY GOODS / 001", palette: "ink" },
  },
  {
    slug: "off-script-cap", title: "Off Script Cap", priceCents: 3200,
    image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1100&q=88",
    images: ["https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1100&q=88"],
    category: "Accessories", badge: "ONE SIZE",
    description: "A structured six-panel cap with an adjustable back and understated 38 RICHES branding.",
    colors: ["Off White", "Black"], sizes: ["One size"], dtfPlacement: "Embroidered front mark.", fabric: "Cotton twill",
  },
];

const teePhotos = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1100&q=88",
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1100&q=88",
  "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1100&q=88",
  "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1100&q=88",
];

const archiveTees: Product[] = vintageTeeDesigns.map((design, index) => ({
  slug: design.slug,
  title: design.title,
  priceCents: design.priceCents,
  image: teePhotos[index % teePhotos.length],
  images: [teePhotos[index % teePhotos.length]],
  category: "Vintage graphic tee",
  badge: `ARCHIVE / ${String(index + 1).padStart(2, "0")}`,
  description: `An original 38 RICHES archive-inspired graphic tee. ${design.bottom.toLowerCase()}. ${design.printMethod === "DTG" ? "Direct-to-garment ink gives the print a soft hand." : "A durable direct-to-film transfer keeps the graphic crisp and vivid."}`,
  sizes: ["M", "L", "XL", "2XL"],
  dtfPlacement: "Large front graphic, centered on chest.",
  fabric: "240 GSM heavyweight cotton",
  printMethod: design.printMethod,
  artwork: { top: design.top, center: design.center, bottom: design.bottom, palette: design.palette },
  featured: false,
}));

const starterProducts: Product[] = [...fallbackProducts, ...archiveTees];

type SanityProduct = Partial<Product> & {
  _id: string;
  slug: string;
  price?: number;
  priceCents?: number;
  image?: string;
  active?: boolean;
  removed?: boolean;
  images?: string[];
  inventory?: { size: string; quantity: number }[];
  featured?: boolean;
};

export function getStarterProducts() {
  return starterProducts;
}

export function getStarterProductBySlug(slug: string) {
  return starterProducts.find((product) => product.slug === slug);
}

const hasSanityConfig = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET);
const sanity = hasSanityConfig
  ? createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      apiVersion: "2025-01-01",
      useCdn: false,
      token: process.env.SANITY_API_READ_TOKEN,
    })
  : null;

const productProjection = `{
  _id,
  "slug": slug.current,
  title,
  price,
  description,
  "image": coalesce(images[0].asset->url, image.asset->url),
  "images": array::compact(images[].asset->url) + select(defined(image) => [image], []),
  category,
  badge,
  colors,
  sizes,
  inventory,
  featured,
  dtfPlacement,
  fabric,
  printMethod,
  artwork,
  "active": active != false,
  "removed": removed == true
}`;

const productQuery = `*[_type == "product" && defined(slug.current)] | order(featured desc, _createdAt desc) ${productProjection}`;
const productBySlugQuery = `*[_type == "product" && slug.current == $slug][0] ${productProjection}`;

function normalizeProduct(product: SanityProduct): Product {
  return {
    slug: product.slug,
    title: product.title ?? "38 RICHES Essential",
    priceCents: product.priceCents ?? Math.round((product.price ?? 0) * 100),
    image: product.image ?? fallbackProducts[0].image,
    images: product.images?.length ? product.images : [product.image ?? fallbackProducts[0].image],
    category: product.category ?? "Streetwear",
    badge: product.badge ?? "38 RICHES",
    description: product.description ?? "A heavyweight essential, made to move different.",
    colors: product.colors?.length ? product.colors : ["Default"],
    sizes: product.sizes?.length ? product.sizes : ["XL", "2XL"],
    dtfPlacement: product.dtfPlacement ?? "Front graphic, centered on chest.",
    fabric: product.fabric ?? "280 GSM cotton",
    printMethod: product.printMethod,
    artwork: product.artwork,
    inventory: product.inventory?.length ? product.inventory.reduce((stock, variant) => ({ ...stock, [variant.size]: variant.quantity }), {}) : undefined,
    featured: product.featured ?? false,
  };
}

export async function getProducts(): Promise<Product[]> {
  if (!sanity) return starterProducts;
  try {
    const products = await sanity.fetch<SanityProduct[]>(productQuery);
    const catalog = new Map(starterProducts.map((product) => [product.slug, product]));
    for (const product of products) {
      if (product.active === false || product.removed === true) catalog.delete(product.slug);
      else catalog.set(product.slug, normalizeProduct(product));
    }
    return [...catalog.values()].sort((left, right) => Number(right.featured) - Number(left.featured));
  } catch {
    return starterProducts;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  if (!sanity) return starterProducts.find((product) => product.slug === slug);
  try {
    const product = await sanity.fetch<SanityProduct | null>(productBySlugQuery, { slug });
    if (product) return product.active === false || product.removed === true ? undefined : normalizeProduct(product);
    return starterProducts.find((item) => item.slug === slug);
  } catch {
    return starterProducts.find((item) => item.slug === slug);
  }
}