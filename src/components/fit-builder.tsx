"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import { isComingSoon } from "@/lib/product-availability";

function availableSizes(product: Product) {
  return product.sizes.filter((size) => product.inventory?.[size] === undefined || product.inventory[size] > 0);
}

function isBottom(product: Product) {
  return /short|jogger|jean|pant|trouser/i.test(`${product.title} ${product.category}`);
}

function isAccessory(product: Product) {
  return /cap|hat|accessory|bag/i.test(`${product.title} ${product.category}`);
}

export default function FitBuilder({ products }: { products: Product[] }) {
  const tops = products.filter((product) => !isComingSoon(product) && !isBottom(product) && !isAccessory(product) && availableSizes(product).length > 0);
  const bottoms = products.filter((product) => !isComingSoon(product) && isBottom(product) && availableSizes(product).length > 0);
  const initialTop = tops[0];
  const initialBottom = bottoms[0];
  const [topSlug, setTopSlug] = useState(initialTop?.slug ?? "");
  const [bottomSlug, setBottomSlug] = useState(initialBottom?.slug ?? "");
  const [topSize, setTopSize] = useState(initialTop ? availableSizes(initialTop)[0] ?? "" : "");
  const [bottomSize, setBottomSize] = useState(initialBottom ? availableSizes(initialBottom)[0] ?? "" : "");
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const top = tops.find((product) => product.slug === topSlug) ?? tops[0];
  const bottom = bottoms.find((product) => product.slug === bottomSlug) ?? bottoms[0];

  function addFit() {
    if (!top || !bottom || !topSize || !bottomSize || !availableSizes(top).includes(topSize) || !availableSizes(bottom).includes(bottomSize)) return;
    addItem(top, topSize, top.colors?.[0] ?? "Default");
    addItem(bottom, bottomSize, bottom.colors?.[0] ?? "Default");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  if (!top || !bottom) {
    return (
      <section className="fit-builder page-shell" aria-labelledby="fit-builder-title">
        <div className="fit-builder__heading">
          <div><p className="eyebrow">THE 38 RICHES FIT BUILDER</p><h2 id="fit-builder-title">PUT THE FIT<br />TOGETHER.</h2></div>
          <p>The Fit Builder needs an available top and bottom. Check back as the collection updates.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="fit-builder page-shell" aria-labelledby="fit-builder-title">
      <div className="fit-builder__heading">
        <div><p className="eyebrow">THE 38 RICHES FIT BUILDER</p><h2 id="fit-builder-title">PUT THE FIT<br />TOGETHER.</h2></div>
        <p>Pick a top, pair it with a bottom, and add both to your bag in one move.</p>
      </div>
      <div className="fit-builder__content">
        <div className="fit-builder__pieces">
          <article className="fit-builder__piece">
            <div className="fit-builder__image" style={{ backgroundImage: `url("${top.image}")` }} role="img" aria-label={top.title} />
            <label>TOP<select value={top.slug} onChange={(event) => { const selected = tops.find((item) => item.slug === event.target.value); setTopSlug(event.target.value); setTopSize(selected ? availableSizes(selected)[0] ?? "" : ""); }}>
              {tops.map((product) => <option value={product.slug} key={product.slug}>{product.title}</option>)}
            </select></label>
            <label>SIZE<select value={topSize} onChange={(event) => setTopSize(event.target.value)}>{availableSizes(top).map((size) => <option value={size} key={size}>{size}</option>)}</select></label>
            <p>{formatCurrency(top.priceCents / 100)}</p>
          </article>
          <span className="fit-builder__plus" aria-hidden="true">+</span>
          <article className="fit-builder__piece">
            <div className="fit-builder__image" style={{ backgroundImage: `url("${bottom.image}")` }} role="img" aria-label={bottom.title} />
            <label>BOTTOM<select value={bottom.slug} onChange={(event) => { const selected = bottoms.find((item) => item.slug === event.target.value); setBottomSlug(event.target.value); setBottomSize(selected ? availableSizes(selected)[0] ?? "" : ""); }}>
              {bottoms.map((product) => <option value={product.slug} key={product.slug}>{product.title}</option>)}
            </select></label>
            <label>SIZE<select value={bottomSize} onChange={(event) => setBottomSize(event.target.value)}>{availableSizes(bottom).map((size) => <option value={size} key={size}>{size}</option>)}</select></label>
            <p>{formatCurrency(bottom.priceCents / 100)}</p>
          </article>
        </div>
        <div className="fit-builder__summary">
          <span>YOUR FIT TOTAL</span>
          <strong>{formatCurrency((top.priceCents + bottom.priceCents) / 100)}</strong>
          <button className="button button--lime" type="button" onClick={addFit} disabled={!topSize || !bottomSize}>{added ? "Fit added to bag" : "Add both to bag"}<span aria-hidden="true">↗</span></button>
          <small>Sizes are selected separately for your fit.</small>
        </div>
      </div>
    </section>
  );
}
