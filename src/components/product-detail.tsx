"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import type { Product } from "@/lib/products";

export default function ProductDetail({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const selectedStock = product.inventory?.[selectedSize];
  const outOfStock = selectedStock !== undefined && selectedStock < 1;

  function addToBag() {
    if (outOfStock) return;
    addItem(product, selectedSize);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <div className="product-media">
        <div className={`product-stage product-stage--${selectedSize.replaceAll(" ", "-")}`}>
          <div className="product-stage__image" style={{ backgroundImage: `url("${product.images[selectedImage] ?? product.image}")` }} role="img" aria-label={`${product.title} photo ${selectedImage + 1} of ${product.images.length}`} />
          <span className="product-stage__size">FIT PREVIEW / {selectedSize.toUpperCase()}</span>
        </div>
        {product.images.length > 1 && <div className="product-gallery" aria-label="Product images">{product.images.map((image, index) => <button type="button" className={index === selectedImage ? "product-gallery__image is-selected" : "product-gallery__image"} key={image} aria-label={`Show product photo ${index + 1}`} aria-pressed={index === selectedImage} style={{ backgroundImage: `url("${image}")` }} onClick={() => setSelectedImage(index)} />)}</div>}
      </div>
      <div className="product-info">
        <p className="eyebrow">{product.badge} / 38 RICHES</p>
        <h1>{product.title}</h1>
        <p className="product-info__subtitle">{product.fabric} / {product.printMethod ?? "Printed"} print / Oversized fit</p>
        <p className="product-info__price">${(product.priceCents / 100).toFixed(2)} <span className="muted">USD</span></p>
        <p className="product-info__description">{product.description}</p>
        <div className="size-label"><span>Select size</span><a href="#size-guide">Size guide</a></div>
        <div className="size-options" role="group" aria-label="Choose size">
          {product.sizes.map((size) => {
            const stock = product.inventory?.[size];
            const unavailable = stock !== undefined && stock < 1;
            return <button className="size-option" type="button" key={size} aria-pressed={selectedSize === size} aria-label={stock === undefined ? size : `${size}, ${unavailable ? "sold out" : `${stock} in stock`}`} disabled={unavailable} onClick={() => setSelectedSize(size)}>{size}{stock !== undefined && <small>{unavailable ? "OUT" : stock}</small>}</button>;
          })}
        </div>
        {selectedStock !== undefined && <p className="stock-note">{outOfStock ? "This size is currently sold out." : `${selectedStock} available in ${selectedSize}.`}</p>}
        <p className="product-info__placement">{product.dtfPlacement} Size preview adjusts with your selection.</p>
        <button className="button button--lime add-button" type="button" onClick={addToBag} disabled={outOfStock}>
          {outOfStock ? "Sold out" : added ? "Added to bag" : "Add to bag"}<span aria-hidden="true">{added ? "✓" : "↗"}</span>
        </button>
        <p className="product-info__shipping">Complimentary shipping on orders over $100</p>
      </div>
      <div className="product-specs" id="size-guide">
        <p><strong>Fit</strong>Relaxed oversized</p><p><strong>Fabric</strong>{product.fabric}</p><p><strong>Care</strong>Cold wash, inside out</p>
      </div>
    </>
  );
}