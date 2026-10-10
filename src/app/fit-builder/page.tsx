import type { Metadata } from "next";
import Link from "next/link";
import FitBuilder from "@/components/fit-builder";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "38 RICHES Fit Builder | Mix & Match Oversized Streetwear",
  description: "Use the 38 RICHES Fit Builder to pair an available top and bottom, choose each size, preview the combined price, and add both pieces to your bag together.",
  alternates: { canonical: "/fit-builder" },
  openGraph: {
    type: "website",
    title: "38 RICHES Fit Builder | Mix & Match Oversized Streetwear",
    description: "Pair an available 38 RICHES top and bottom, select each size, preview the total, and add both pieces to your bag together.",
    url: "/fit-builder",
  },
};

export default async function FitBuilderPage() {
  const products = await getProducts();

  return (
    <main className="fit-builder-page page-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>/</span><span>Fit Builder</span>
      </nav>
      <header className="fit-builder-page__intro">
        <p className="eyebrow">THE 38 RICHES FIT BUILDER</p>
        <h1>Build your fit.<br /><span>Your way.</span></h1>
        <p>The 38 RICHES Fit Builder is an outfit pairing tool for the current collection. Choose an available top and bottom from the selectors, then select each garment’s size independently. The builder updates the combined item price as you make choices; when you’re ready, choose “Add both to bag” to place both selected pieces in your shopping bag together.</p>
        <p>Each selection follows current catalog availability, so products and size options can change as the collection rotates. Open each product page to review its listed fabric, color options, sizes, and stock. The Fit Builder keeps the two size choices separate so you can choose the fit you want for each piece.</p>
        <p>38 RICHES is a Ghana-based streetwear label. Checkout currently accepts delivery addresses in Ghana. Ghana shipping is free when your discounted order subtotal is GH₵100 or more; orders below GH₵100 have an GH₵8 shipping fee. Contact the brand to ask whether delivery outside Ghana can be arranged.</p>
        <p>Use the Fit Builder to explore pieces together, see their combined price, and add the look to your bag in one step. <Link href="/#shop">Browse the full collection</Link> or build an outfit below.</p>
      </header>
      <FitBuilder products={products} />
    </main>
  );
}
