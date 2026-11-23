"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { Product } from "@/lib/products";
import { formatCurrency } from "@/lib/currency";
import styles from "./clothing-rack.module.css";

type RackProduct = Pick<Product, "slug" | "title" | "description" | "category" | "priceCents" | "image">;

// Preserve the actual catalog photo and its proportions. Perspective animates
// the photograph itself; it does not fabricate a garment's unseen geometry.
function ProductPhoto({ product }: { product?: RackProduct }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.suspended}>
      <svg viewBox="0 0 220 100" fill="none" aria-hidden="true" className={styles.hanger}>
        <path d="M110 53V37C110 28 124 28 124 17C124 7 110 4 104 13" stroke="#858889" strokeWidth="3" strokeLinecap="round" />
        <path d="M110 52L39 89Q35 94 44 94H176Q185 94 181 89L110 52Z" stroke="#c6ab8c" strokeWidth="7" strokeLinejoin="round" />
        <path d="M47 89H173" stroke="#e6d0b5" strokeWidth="2" />
      </svg>
      <span className={styles.photoFrame}>
        {product && !failed ? <Image className={styles.photo} src={product.image} alt={`${product.title} — catalog photograph`} fill unoptimized sizes="(max-width: 900px) 140px, 180px" draggable={false} onError={() => setFailed(true)} /> : <span className={styles.photoFallback}>{product ? "Photo unavailable" : "Next on the rail"}</span>}
        <span className={styles.photoShine} aria-hidden="true" />
      </span>
    </span>
  );
}

function resetTilt(event: PointerEvent<HTMLButtonElement>) {
  event.currentTarget.style.removeProperty("--tilt-x");
  event.currentTarget.style.removeProperty("--tilt-y");
}

function tiltPhoto(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - y) * 10}deg`);
  event.currentTarget.style.setProperty("--tilt-y", `${(x - 0.5) * 16}deg`);
}

export default function ClothingRack({ products }: { products: RackProduct[] }) {
  const [selected, setSelected] = useState(products.length > 1 ? 1 : 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? selected;
  const product = products[active];

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = Math.min(products.length, 6);
    if (!count) return;
    const next = event.key === "ArrowRight" ? (index + 1) % count : event.key === "ArrowLeft" ? (index + count - 1) % count : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : null;
    if (next === null) return;
    event.preventDefault();
    if (!products[next]) return;
    setSelected(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <section className={styles.hero} aria-labelledby="rack-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>NEW COLLECTION <span aria-hidden="true">|</span> PREMIUM STREETWEAR</p>
        <h1 id="rack-title">Good things.<br /><span>Hang here.</span></h1>
        <p>Considered essentials. Uncompromising character.<br />Find the pieces that feel like you.</p>
      </div>
      <div className={styles.rackWrap}>
        <div className={styles.rackMeta}><span>THE EVERYDAY ROTATION / 001</span><span>DESIGNED TO BE LIVED IN</span></div>
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Interactive clothing rack. Swipe to browse all six garments.">
          <div className={styles.rack}>
            <div className={styles.rail} aria-hidden="true" /><div className={styles.postLeft} aria-hidden="true" /><div className={styles.postRight} aria-hidden="true" />
            <div className={styles.garments} role="group" aria-label="Select a garment" onMouseLeave={() => setHovered(null)}>
              {Array.from({ length: 6 }, (_, index) => {
                const item = products[index];
                return (
                  <button key={item?.slug ?? index} type="button" className={`${styles.item} ${active === index ? styles.active : ""}`} style={{ "--lean": `${[-4, 2, -2, 3, -2, 4][index]}deg`, "--delay": `${index * -0.38}s` } as CSSProperties}
                    disabled={!item} aria-label={item ? `Select ${item.title}` : "Empty rack position"} aria-pressed={selected === index} aria-controls="rack-product-details"
                    onPointerMove={tiltPhoto} onPointerLeave={resetTilt} onPointerCancel={resetTilt}
                    onMouseEnter={() => { if (item) setHovered(index); }} onFocus={() => { setHovered(null); setSelected(index); }} onClick={() => { setHovered(null); setSelected(index); }} onKeyDown={(event) => moveSelection(event, index)}>
                    <span className={styles.badge}>Product <span aria-hidden="true">↗</span></span>
                    <ProductPhoto key={item?.image ?? index} product={item} />
                    <span className={styles.itemIndex}>{String(index + 1).padStart(2, "0")}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.floor} aria-hidden="true" />
          </div>
        </div>
        <div className={styles.rackFoot}><span><i /> HOVER, TAP & FIND YOUR FIT</span><span>01 — 06 <span className={styles.swipe}> / SWIPE TO EXPLORE →</span></span></div>
      </div>
      <div className={styles.details} id="rack-product-details" aria-live="polite" aria-atomic="true">
        <div key={active} className={styles.detailsCopy}>
          <p className={styles.category}>{product?.category ?? "THE COLLECTION"} <span> / {String(active + 1).padStart(2, "0")}</span></p>
          <h2>{product?.title ?? "New pieces coming soon"}</h2>
          <p>{product?.description ?? "Explore the catalog for available pieces and upcoming releases."}</p>
          {product && <Link className={styles.productLink} href={`/product/${product.slug}`}>View piece · {formatCurrency(product.priceCents / 100)} <span aria-hidden="true">↗</span></Link>}
        </div>
        <Link className={styles.cta} href="#shop">Shop the Collection <span aria-hidden="true">↗</span></Link>
        <p className={styles.note}>Your collection in motion. Original product photography, brought to life with 3D perspective.</p>
      </div>
    </section>
  );
}
