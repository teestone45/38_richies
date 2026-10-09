"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import { storeDashboardEvent, type StoreDashboardAction } from "@/lib/store-dashboard";
import type { Product } from "@/lib/products";

const swatches: Record<string, string> = {
  black: "#171515",
  white: "#f5f0e8",
  charcoal: "#393736",
  cream: "#e8ddc7",
  tan: "#b68b62",
  sand: "#d0b58e",
  olive: "#74734a",
  "forest green": "#31513d",
  red: "#a83838",
  "royal blue": "#315b9b",
  navy: "#272c3c",
  "heather grey": "#92918f",
  grey: "#92918f",
  "light wash blue": "#9bb4c8",
};

function getSwatch(color: string) {
  return swatches[color.toLowerCase()] ?? "#b8aa9c";
}

export default function FeaturedProductHero({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(products[0]?.colors?.[0] ?? "Black");
  const [selectedSize, setSelectedSize] = useState(products[0]?.sizes[0] ?? "XL");
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    function onDashboardAction(event: Event) {
      const action = (event as CustomEvent<StoreDashboardAction>).detail;
      if (action === "add-to-cart") document.querySelector<HTMLButtonElement>(".feature-hero__add")?.click();
      if (action === "color") document.getElementById("featured-colors")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.addEventListener(storeDashboardEvent, onDashboardAction);
    return () => window.removeEventListener(storeDashboardEvent, onDashboardAction);
  }, []);

  if (!products.length) return null;

  const product = products[activeIndex % products.length];
  const nextProduct = products[(activeIndex + 1) % products.length];
  const colors = product.colors?.length ? product.colors : ["Black"];
  const stock = product.inventory?.[selectedSize];
  const soldOut = stock !== undefined && stock < 1;
  const image = product.images[0] ?? product.image;
  const nextImage = nextProduct.images[0] ?? nextProduct.image;

  function showProduct(index: number) {
    const next = products[(index + products.length) % products.length];
    setActiveIndex((index + products.length) % products.length);
    setSelectedColor(next.colors?.[0] ?? "Black");
    setSelectedSize(next.sizes[0] ?? "XL");
  }

  return (
    <section className="feature-hero" aria-label="Featured clothing">
      <div className="feature-hero__masthead">
        <span>38 RICHES / INDEPENDENT UNIFORM</span>
        <span>ACCRA, GHANA / DROP 01</span>
      </div>
      <div className="feature-hero__layout">
        <div className="feature-hero__copy">
          <p className="eyebrow">MORE THAN CLOTHES</p>
          <h1>38 RICHES | Premium Streetwear <span>Built From Vision.</span></h1>
          <p className="feature-hero__intro">Premium streetwear for people who move differently. Distinct pieces. Strong identity.</p>
          <Link className="button button--lime" href="#shop">Shop the drop <span aria-hidden="true">↗</span></Link>
          <p className="feature-hero__edition">DROP 01 <span>·</span> 38 RICHES</p>
        </div>

        <div className="feature-hero__visual">
          <Link className="feature-hero__image-link" href={`/product/${product.slug}`} aria-label={`View ${product.title}`}>
            <Image key={product.slug} className="feature-hero__image" src={image} alt={`${product.title} in ${selectedColor}`} fill priority unoptimized sizes="(max-width: 760px) 100vw, 48vw" />
          </Link>
          <span className="feature-hero__image-label">38 RICHES / {product.category}</span>
          <div className="feature-hero__arrows" aria-label="Switch featured product">
            <button type="button" aria-label="Previous product" onClick={() => showProduct(activeIndex - 1)}>←</button>
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}</span>
            <button type="button" aria-label="Next product" onClick={() => showProduct(activeIndex + 1)}>→</button>
          </div>
        </div>

        <aside className="feature-hero__purchase" aria-live="polite">
          <p className="eyebrow">THE ROTATION / {product.badge}</p>
          <h2>{product.title}</h2>
          <p className="feature-hero__category">{product.fabric} / {product.category}</p>
          <p className="feature-hero__price">{formatCurrency(product.priceCents / 100)}</p>

          <div className="feature-hero__option">
            <span className="feature-hero__option-label">Color <strong>{selectedColor}</strong></span>
            <div className="feature-hero__swatches" id="featured-colors" role="group" aria-label="Choose color" tabIndex={-1}>
              {colors.map((color) => <button key={color} className="feature-hero__swatch" type="button" aria-label={color} aria-pressed={selectedColor === color} title={color} style={{ "--swatch-color": getSwatch(color) } as React.CSSProperties} onClick={() => setSelectedColor(color)} />)}
            </div>
          </div>

          <div className="feature-hero__option">
            <span className="feature-hero__option-label">Select size</span>
            <div className="feature-hero__sizes" role="group" aria-label="Choose size">
              {product.sizes.map((size) => {
                const sizeStock = product.inventory?.[size];
                return <button key={size} type="button" aria-pressed={selectedSize === size} disabled={sizeStock !== undefined && sizeStock < 1} onClick={() => setSelectedSize(size)}>{size}</button>;
              })}
            </div>
          </div>

          <button className="feature-hero__add button button--lime" type="button" disabled={soldOut} onClick={() => addItem(product, selectedSize, selectedColor)}>
            {soldOut ? "Sold out" : "Add to bag"}<span aria-hidden="true">↗</span>
          </button>
          <Link className="feature-hero__view" href={`/product/${product.slug}`}>View piece details <span aria-hidden="true">↗</span></Link>

          <button className="feature-hero__next" type="button" onClick={() => showProduct(activeIndex + 1)} aria-label={`Next product: ${nextProduct.title}`}>
            <span className="feature-hero__next-image"><Image src={nextImage} alt="" fill unoptimized sizes="72px" /></span>
            <span><small>UP NEXT</small><strong>{nextProduct.title}</strong></span>
            <span aria-hidden="true">↗</span>
          </button>
        </aside>
      </div>
      <div className="feature-hero__footer">
        <span>MORE THAN CLOTHES. IT’S 38 RICHES.</span>
        <a href="https://www.tiktok.com/@38richies0" target="_blank" rel="noreferrer">TIKTOK @38RICHIES0 ↗</a>
      </div>
    </section>
  );
}