"use client";

import { useState, useSyncExternalStore } from "react";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/products";

const favoritesStorageKey = "38-riches-favorites";
const favoritesChangeEvent = "38-riches-favorites-change";

function subscribeToFavorites(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(favoritesChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(favoritesChangeEvent, onChange);
  };
}

function getFavoriteSnapshot() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(favoritesStorageKey) ?? "[]") as unknown;
    return JSON.stringify(Array.isArray(stored) ? stored.filter((slug): slug is string => typeof slug === "string") : []);
  } catch {
    return "[]";
  }
}

function getServerFavoriteSnapshot() {
  return "[]";
}

export default function ProductCollection({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All pieces");
  const [sortOrder, setSortOrder] = useState("newest");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favoriteSnapshot = useSyncExternalStore(subscribeToFavorites, getFavoriteSnapshot, getServerFavoriteSnapshot);
  const favoriteSlugs = JSON.parse(favoriteSnapshot) as string[];
  const categories = ["All pieces", ...new Set(products.map((product) => product.category))];

  function toggleFavorite(slug: string) {
    const nextFavorites = favoriteSlugs.includes(slug) ? favoriteSlugs.filter((favorite) => favorite !== slug) : [...favoriteSlugs, slug];
    try {
      window.localStorage.setItem(favoritesStorageKey, JSON.stringify(nextFavorites));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(favoritesChangeEvent));
  }

  const filtered = products.filter((product) => {
    const matchesQuery = `${product.title} ${product.category} ${product.badge} ${product.printMethod ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "All pieces" || product.category === category;
    const matchesFavorites = !favoritesOnly || favoriteSlugs.includes(product.slug);
    return matchesQuery && matchesCategory && matchesFavorites;
  });
  const visibleProducts = [...filtered].sort((left, right) => {
    if (sortOrder === "price-low") return left.priceCents - right.priceCents || left.title.localeCompare(right.title);
    if (sortOrder === "price-high") return right.priceCents - left.priceCents || left.title.localeCompare(right.title);
    const createdAtDifference = Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "");
    return Number.isNaN(createdAtDifference) || createdAtDifference === 0 ? products.indexOf(left) - products.indexOf(right) : createdAtDifference;
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
        <div className="collection-actions">
          <label className="collection-sort"><span>Sort</span><select aria-label="Sort products" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
          <button className="collection-favorites" type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((current) => !current)}><span aria-hidden="true">{favoritesOnly ? "♥" : "♡"}</span> Saved <span className="collection-favorites__count">{favoriteSlugs.length}</span></button>
        </div>
        <p className="collection-count">{visibleProducts.length} PIECES</p>
      </div>
      {visibleProducts.length ? (
        <div className="product-grid">
          {visibleProducts.map((product) => <ProductCard key={product.slug} product={product} isFavorite={favoriteSlugs.includes(product.slug)} onToggleFavorite={toggleFavorite} />)}
        </div>
      ) : <p className="collection-empty">{favoritesOnly ? "No saved pieces match these filters." : "No pieces match that search. Try another name or category."}</p>}
    </>
  );
}