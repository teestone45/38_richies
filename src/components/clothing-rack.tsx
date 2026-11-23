"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Product } from "@/lib/products";
import { formatCurrency } from "@/lib/currency";
import styles from "./clothing-rack.module.css";

type RackProduct = Pick<Product, "slug" | "title" | "description" | "category" | "priceCents">;
const fabrics = ["#e8e3d8", "#303336", "#76806a", "#ccc1af", "#242426", "#b3c3cf"];
const studioNames = ["Studio Tee", "Heavy Hoodie", "Everyday Tee", "Relaxed Longsleeve", "After Hours Tee", "Skyline Tee"];

// Original silhouette illustrations, not product photography. Every SVG instance has
// its own paint IDs so selection and multiple garments cannot collide.
function Garment({ index, hoodie }: { index: number; hoodie: boolean }) {
  const id = useId().replace(/:/g, "");
  const longSleeve = hoodie || index === 3;
  const shape = longSleeve
    ? "M67 91 L39 103 7 226 36 236 62 162 59 300 Q110 309 161 300 L158 162 184 236 213 226 181 103 153 91 Q133 104 110 104 Q87 104 67 91Z"
    : "M68 92 L40 103 9 154 45 178 63 148 59 285 Q110 295 161 285 L157 148 175 178 211 154 180 103 152 92 Q131 103 110 103 Q89 103 68 92Z";
  return (
    <svg viewBox="0 0 220 330" fill="none" aria-hidden="true" className={styles.garment}>
      <defs>
        <linearGradient id={`${id}-fabric`} x1="45" y1="130" x2="177" y2="230" gradientUnits="userSpaceOnUse">
          <stop stopColor={fabrics[index]} /><stop offset=".25" stopColor={fabrics[index]} /><stop offset=".48" stopColor="#fff" stopOpacity=".07" /><stop offset=".58" stopColor={fabrics[index]} /><stop offset="1" stopColor={fabrics[index]} />
        </linearGradient>
        <linearGradient id={`${id}-fold`}><stop stopColor="#000" stopOpacity=".13" /><stop offset=".45" stopColor="#fff" stopOpacity=".07" /><stop offset="1" stopColor="#000" stopOpacity=".07" /></linearGradient>
        <linearGradient id={`${id}-wood`} x1="40" y1="60" x2="180" y2="98" gradientUnits="userSpaceOnUse"><stop stopColor="#bea183" /><stop offset=".5" stopColor="#e4c9aa" /><stop offset="1" stopColor="#a88a6d" /></linearGradient>
        <clipPath id={`${id}-clip`}><path d={shape} /></clipPath>
        <filter id={`${id}-shadow`} x="-30%" y="-10%" width="170%" height="150%"><feDropShadow dx="3" dy="12" stdDeviation="7" floodOpacity=".14" /></filter>
      </defs>
      <path d="M110 59V42C110 33 124 33 124 22C124 12 110 9 104 18" stroke="#858889" strokeWidth="3" strokeLinecap="round" />
      <path d="M110 58L43 93Q38 97 46 99H174Q182 97 177 93L110 58Z" stroke={`url(#${id}-wood)`} strokeWidth="8" strokeLinejoin="round" />
      <g filter={`url(#${id}-shadow)`}>
        {hoodie && <path d="M72 94Q73 58 110 58Q147 58 148 94L130 117H90Z" fill={fabrics[index]} stroke="#000" strokeOpacity=".17" strokeWidth="2" />}
        <path d={shape} fill={`url(#${id}-fabric)`} stroke="#000" strokeOpacity=".1" />
        <g clipPath={`url(#${id}-clip)`}>
          <path d="M68 100Q82 154 69 290L83 295Q92 164 76 98ZM151 101Q135 175 151 301L137 306Q128 173 143 98Z" fill={`url(#${id}-fold)`} />
          <path d="M100 120Q111 200 101 300H116Q108 194 119 120Z" fill={`url(#${id}-fold)`} opacity=".45" />
          <path d="M46 110L64 146M174 110L156 146M63 279Q110 286 158 279" stroke="#000" strokeOpacity=".12" />
          <path d="M66 274Q109 281 157 274" stroke="#fff" strokeOpacity=".16" />
        </g>
        <path d="M80 96Q110 127 140 96" stroke="#000" strokeOpacity=".22" strokeWidth="6" />
        <path d="M80 93Q110 121 140 93" stroke={fabrics[index]} strokeWidth="5" />
        {hoodie ? <><path d="M94 114L91 158M126 114L129 158" stroke="#c7c5bc" strokeWidth="2" /><path d="M84 229L76 269Q110 274 144 269L136 229Z" stroke="#fff" strokeOpacity=".13" /></> : null}
        <text x="110" y={hoodie ? 187 : 165} textAnchor="middle" fill={index === 1 || index === 4 ? "#d9d7ce" : "#30342e"} fontFamily="Arial, sans-serif" fontSize={index === 4 ? 32 : 12} fontWeight="700" letterSpacing={index === 4 ? -2 : 1}>{index === 4 ? "38" : "38 RICHES"}</text>
        {index === 0 && <text x="110" y="179" textAnchor="middle" fill="#65665e" fontFamily="Arial, sans-serif" fontSize="4" letterSpacing="2">MOVE DIFFERENT</text>}
      </g>
    </svg>
  );
}

export default function ClothingRack({ products }: { products: RackProduct[] }) {
  const [selected, setSelected] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? selected;
  const product = products[active];

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % 6 : event.key === "ArrowLeft" ? (index + 5) % 6 : event.key === "Home" ? 0 : event.key === "End" ? 5 : null;
    if (next === null) return;
    event.preventDefault();
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
                const hoodie = item ? /hood|fleece/i.test(`${item.category} ${item.title}`) : index === 1;
                return (
                  <button key={item?.slug ?? index} type="button" className={`${styles.item} ${active === index ? styles.active : ""}`} style={{ "--lean": `${[-4, 2, -2, 3, -2, 4][index]}deg` } as CSSProperties}
                    aria-label={`Select ${item?.title ?? studioNames[index]}`} aria-pressed={selected === index} aria-controls="rack-product-details"
                    onMouseEnter={() => setHovered(index)} onFocus={() => { setHovered(null); setSelected(index); }} onClick={() => { setHovered(null); setSelected(index); }} onKeyDown={(event) => moveSelection(event, index)}>
                    <span className={styles.badge}>Product <span aria-hidden="true">↗</span></span>
                    <Garment index={index} hoodie={hoodie} />
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
          <p className={styles.category}>{product?.category ?? "STUDIO CONCEPT"} <span> / {String(active + 1).padStart(2, "0")}</span></p>
          <h2>{product?.title ?? studioNames[active]}</h2>
          <p>{product?.description ?? "An exploration in shape, texture and everyday expression. Discover available designs in our catalog."}</p>
          {product && <Link className={styles.productLink} href={`/product/${product.slug}`}>View piece · {formatCurrency(product.priceCents / 100)} <span aria-hidden="true">↗</span></Link>}
        </div>
        <Link className={styles.cta} href="#shop">Shop the Collection <span aria-hidden="true">↗</span></Link>
        <p className={styles.note}>Illustrated silhouettes. See each product for actual design & availability.</p>
      </div>
    </section>
  );
}
