import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product-detail";
import { getProductBySlug } from "@/lib/products";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function formatPriceForMetadata(priceCents: number) {
  return `GH₵${(priceCents / 100).toFixed(2)}`;
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };

  const title = `${product.title} in Ghana`;
  const description = `${product.description} Shop ${product.title} from 38 RICHES Clothing in Ghana for ${formatPriceForMetadata(product.priceCents)}.`;
  const canonical = `/product/${product.slug}`;
  const images = product.images.length ? product.images : [product.image];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", title: `${title} | 38 RICHES`, description, url: canonical, images: images.map((url) => ({ url, alt: product.title })) },
    twitter: { card: "summary_large_image", title: `${title} | 38 RICHES`, description, images },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/product/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const images = product.images.length ? product.images : [product.image];
  const availableUnits = product.inventory ? Object.values(product.inventory).reduce((total, quantity) => total + quantity, 0) : undefined;
  const productStructuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: images,
    sku: product.slug,
    category: product.category,
    brand: { "@type": "Brand", name: "38 RICHES" },
    additionalProperty: [
      { "@type": "PropertyValue", name: "Available sizes", value: product.sizes.join(", ") },
      { "@type": "PropertyValue", name: "Material", value: product.fabric },
      ...(product.printMethod ? [{ "@type": "PropertyValue", name: "Print method", value: product.printMethod }] : []),
    ],
    offers: {
      "@type": "Offer",
      url: new URL(`/product/${product.slug}`, getSiteUrl()).toString(),
      priceCurrency: "GHS",
      price: (product.priceCents / 100).toFixed(2),
      ...(availableUnits === undefined ? {} : { availability: availableUnits > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" }),
      itemCondition: "https://schema.org/NewCondition",
    },
  }).replace(/</g, "\\u003c");

  return (
    <main className="product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#shop">Shop</Link><span>/</span><span>{product.title}</span></nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productStructuredData }} />
      <div className="product-detail"><ProductDetail product={product} restockConfirmed={query.restock === "confirmed"} /></div>
    </main>
  );
}