"use client";

import { useState } from "react";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/products";

export default function ProductCollection({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All pieces");
  const categories = ["All pieces", ...new Set(products.map((product) => product.category))];
  const filtered = products.filter((product) => {
    const matchesQuery = `${product.title} ${product.category} ${product.badge} ${product.printMethod ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === "All pieces" || product.category === category);
  });

  return (
    <>
      <div className="collection-tools">
        <label className="collection-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" aria-label="Search products" placeholder="Search the rotation" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="collection-filters" role="group" aria-label="Filter by category">
          {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <p className="collection-count">{filtered.length} PIECES</p>
      </div>
      {filtered.length ? (
        <div className="product-grid">
          {filtered.map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}
        </div>
      ) : <p className="collection-empty">No pieces match that search. Try another name or category.</p>}
    </>
  );
}