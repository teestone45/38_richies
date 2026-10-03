import Link from "next/link";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/product-detail";
import { getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params, searchParams }: PageProps<"/product/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#shop">Shop</Link><span>/</span><span>{product.title}</span></nav>
      <div className="product-detail"><ProductDetail product={product} restockConfirmed={query.restock === "confirmed"} /></div>
    </main>
  );
}