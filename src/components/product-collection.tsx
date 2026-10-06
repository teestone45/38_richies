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
  const [selectedSize, setSelectedSize] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const favoriteSnapshot = useSyncExternalStore(subscribeToFavorites, getFavoriteSnapshot, getServerFavoriteSnapshot);
  const favoriteSlugs = JSON.parse(favoriteSnapshot) as string[];
  const categories = ["All pieces", ...new Set(products.map((product) => product.category))];
  const availableSizes = [...new Set(products.flatMap((product) => product.sizes))].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  function toggleFavorite(slug: string) {
    const nextFavorites = favoriteSlugs.includes(slug) ? favoriteSlugs.filter((favorite) => favorite !== slug) : [...favoriteSlugs, slug];
    try {
      window.localStorage.setItem(favoritesStorageKey, JSON.stringify(nextFavorites));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(favoritesChangeEvent));
  }

  function resetFilters() {
    setQuery("");
    setCategory("All pieces");
    setSortOrder("newest");
    setFavoritesOnly(false);
    setSelectedSize("");
    setInStockOnly(false);
  }

  const filtered = products.filter((product) => {
    const matchesQuery = `${product.title} ${product.category} ${product.badge} ${product.printMethod ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = category === "All pieces" || product.category === category;
    const matchesFavorites = !favoritesOnly || favoriteSlugs.includes(product.slug);
    const matchesSize = !selectedSize || product.sizes.includes(selectedSize);
    const sizeStock = selectedSize ? product.inventory?.[selectedSize] : undefined;
    const hasAvailableStock = sizeStock !== undefined ? sizeStock > 0 : selectedSize && product.inventory ? false : !product.inventory || Object.values(product.inventory).some((quantity) => quantity > 0);
    return matchesQuery && matchesCategory && matchesFavorites && matchesSize && (!inStockOnly || hasAvailableStock);
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
          {categories.map((item) => {
            const categoryProduct = item === "All pieces" ? products[0] : products.find((product) => product.category === item);
            const image = categoryProduct?.image;
            return <button type="button" key={item} aria-pressed={category === item} aria-label={`Show ${item}`} style={image ? { backgroundImage: `linear-gradient(0deg, rgba(22, 16, 17, .78), rgba(22, 16, 17, .05)), url(${JSON.stringify(image)})` } : undefined} onClick={() => setCategory(item)}><span>{item === "Graphic tee" ? "T-Shirts" : item}</span></button>;
          })}
        </div>
        <div className="collection-actions">
          <label className="collection-sort"><span>Sort</span><select aria-label="Sort products" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
          <button className="collection-favorites" type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((current) => !current)}><span aria-hidden="true">{favoritesOnly ? "♥" : "♡"}</span> Saved <span className="collection-favorites__count">{favoriteSlugs.length}</span></button>
        </div>
        <div className="collection-refinements">
          <label className="collection-size"><span>Size</span><select aria-label="Filter by size" value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}><option value="">Any size</option>{availableSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <label className="collection-stock"><input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />In stock only</label>
          <button className="collection-reset" type="button" onClick={resetFilters}>Reset filters</button>
          <p className="collection-count" aria-live="polite">{visibleProducts.length} PIECES</p>
        </div>
      </div>
      {visibleProducts.length ? (
        <div className="product-grid">
          {visibleProducts.map((product) => <ProductCard key={product.slug} product={product} isFavorite={favoriteSlugs.includes(product.slug)} onToggleFavorite={toggleFavorite} />)}
        </div>
      ) : <p className="collection-empty">{favoritesOnly ? "No saved pieces match these filters." : "No pieces match that search. Try another name or category."}</p>}
    </>
  );
}