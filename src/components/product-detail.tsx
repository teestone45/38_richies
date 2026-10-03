"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@/lib/products";
import ProductReviews from "@/components/product-reviews";

function getSwatchColor(color: string) {
  const palette: Record<string, string> = {
    black: "#111111",
    white: "#f5f0e8",
    "heather grey": "#8d8d8d",
    grey: "#8d8d8d",
    gray: "#8d8d8d",
    stone: "#b8b0a7",
    ink: "#20283a",
    cream: "#f4efe7",
    charcoal: "#2b2b2b",
    sand: "#d9c4a1",
    "off white": "#f5f0e8",
    default: "#d4d4d4",
  };

  return palette[color.trim().toLowerCase()] ?? color;
}

export default function ProductDetail({ product, restockConfirmed = false }: { product: Product; restockConfirmed?: boolean }) {
  const colors = product.colors && product.colors.length > 0 ? product.colors : ["Black", "White", "Heather Grey"];
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "Black");
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "XL");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [addedQuantity, setAddedQuantity] = useState(1);
  const [restockEmail, setRestockEmail] = useState("");
  const [restockMessage, setRestockMessage] = useState(restockConfirmed ? "Email confirmed. We'll notify you when this size is back." : "");
  const [isRequestingRestock, setIsRequestingRestock] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const quantityInBag = useCartStore((state) => state.items.find((item) => item.productId === product.slug && item.size === selectedSize && (item.color ?? "Default") === selectedColor)?.quantity ?? 0);
  const selectedStock = product.inventory?.[selectedSize];
  const outOfStock = selectedStock !== undefined && selectedStock < 1;
  const maxAddQuantity = Math.max(0, Math.min(10, selectedStock ?? 10) - quantityInBag);
  const quantityToAdd = Math.min(selectedQuantity, maxAddQuantity);

  const variantImage = useMemo(() => {
    const slug = product.slug.replace(/\s+/g, "-").toLowerCase();
    const cleanColor = selectedColor.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const cleanSize = selectedSize.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `/images/${slug}-${cleanColor}-${cleanSize}.jpg`;
  }, [product.slug, selectedColor, selectedSize]);

  const previewImage = selectedImage > 0 ? product.images[selectedImage] ?? variantImage : variantImage;

  function addToBag() {
    if (outOfStock || quantityToAdd < 1) return;
    setAddedQuantity(quantityToAdd);
    addItem(product, selectedSize, selectedColor, quantityToAdd);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  async function requestRestockAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRequestingRestock(true);
    setRestockMessage("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: restockEmail, size: selectedSize }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not request a restock alert.");
      setRestockMessage(result.message ?? "Check your email to confirm the restock alert.");
      setRestockEmail("");
    } catch (error) {
      setRestockMessage(error instanceof Error ? error.message : "Could not request a restock alert.");
    } finally {
      setIsRequestingRestock(false);
    }
  }

  return (
    <>
      <div className="product-media">
        <div className={`product-stage product-stage--${selectedSize.replaceAll(" ", "-")}`}>
          <img
            className="product-stage__image"
            src={previewImage}
            alt={`${product.title} color ${selectedColor} size ${selectedSize}`}
            onError={(event) => {
              event.currentTarget.src = product.image;
            }}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
          <span className="product-stage__size">FIT PREVIEW / {selectedSize.toUpperCase()}</span>
        </div>
        {product.images.length > 1 && <div className="product-gallery" aria-label="Product images">{product.images.map((image, index) => <button type="button" className={index === selectedImage ? "product-gallery__image is-selected" : "product-gallery__image"} key={image} aria-label={`Show product photo ${index + 1}`} aria-pressed={index === selectedImage} style={{ backgroundImage: `url("${image}")` }} onClick={() => setSelectedImage(index)} />)}</div>}
      </div>
      <div className="product-info">
        <p className="eyebrow">{product.badge} / 38 RICHES</p>
        <h1>{product.title}</h1>
        <p className="product-info__subtitle">{product.fabric} / {product.printMethod ?? "Printed"} print / Oversized fit</p>
        <p className="product-info__price">{formatCurrency(product.priceCents / 100)}</p>
        <p className="product-info__description">{product.description}</p>
        {colors.length > 0 && (
          <>
            <div className="size-label"><span>Select color</span></div>
            <div className="size-options" role="group" aria-label="Choose color">
              {colors.map((color) => (
                <button
                  className="size-option"
                  type="button"
                  key={color}
                  aria-pressed={selectedColor === color}
                  aria-label={color}
                  title={color}
                  onClick={() => { setSelectedColor(color); setSelectedQuantity(1); }}
                  style={{
                    backgroundColor: getSwatchColor(color),
                    color: color.toLowerCase().includes("white") || color.toLowerCase().includes("cream") || color.toLowerCase().includes("stone") ? "#111111" : "#f5f5f5",
                    borderColor: selectedColor === color ? "#55bfd8" : "rgba(7, 27, 42, 0.32)",
                  }}
                >
                  <span aria-hidden="true" style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", backgroundColor: getSwatchColor(color), border: "1px solid rgba(17,17,17,0.15)" }} />
                  {color}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="size-label"><span>Select size</span><a href="#size-guide">Size guide</a></div>
        <div className="size-options" role="group" aria-label="Choose size">
          {product.sizes.map((size) => {
            const stock = product.inventory?.[size];
            const unavailable = stock !== undefined && stock < 1;
            return <button className="size-option" type="button" key={size} aria-pressed={selectedSize === size} aria-label={stock === undefined ? size : `${size}, ${unavailable ? "sold out" : `${stock} in stock`}`} disabled={unavailable} onClick={() => { setSelectedSize(size); setSelectedQuantity(1); }}>{size}{stock !== undefined && <small>{unavailable ? "OUT" : stock}</small>}</button>;
          })}
        </div>
        {selectedStock !== undefined && <p className="stock-note">{outOfStock ? "This size is currently sold out." : maxAddQuantity === 0 ? "The available quantity is already in your bag." : `${maxAddQuantity} more available in ${selectedSize}.`}</p>}
        {outOfStock && <form className="restock-form" onSubmit={requestRestockAlert}>
          <label htmlFor="restock-email">Get an email when {selectedSize} returns<input id="restock-email" type="email" required autoComplete="email" value={restockEmail} onChange={(event) => setRestockEmail(event.target.value)} /></label>
          <button type="submit" disabled={isRequestingRestock}>{isRequestingRestock ? "Sending..." : "Notify me"}</button>
          {restockMessage && <p role="status">{restockMessage}</p>}
        </form>}
        <div className="product-quantity">
          <span>Quantity</span>
          <div className="quantity-stepper" role="group" aria-label="Choose quantity">
            <button type="button" aria-label="Decrease quantity" disabled={quantityToAdd <= 1 || maxAddQuantity === 0} onClick={() => setSelectedQuantity((quantity) => Math.max(1, quantity - 1))}>−</button>
            <input type="number" inputMode="numeric" min="1" max={Math.max(1, maxAddQuantity)} aria-label="Quantity to add" value={quantityToAdd || 1} disabled={outOfStock || maxAddQuantity === 0} onChange={(event) => { const value = Number(event.target.value); setSelectedQuantity(Math.max(1, Math.min(maxAddQuantity || 1, Number.isFinite(value) ? value : 1))); }} />
            <button type="button" aria-label="Increase quantity" disabled={quantityToAdd >= maxAddQuantity || maxAddQuantity === 0} onClick={() => setSelectedQuantity((quantity) => Math.min(maxAddQuantity, quantity + 1))}>+</button>
          </div>
          <span className="product-quantity__limit">Max 10 per variant</span>
        </div>
        <p className="product-info__placement">A3 DTF print fits perfectly on 2XL for the ultimate oversized look. Centered 3 inches below the collar. Size and color preview adjust with your selection.</p>
        <button className="button button--lime add-button" type="button" onClick={addToBag} disabled={outOfStock || maxAddQuantity === 0}>
          {outOfStock ? "Sold out" : maxAddQuantity === 0 ? "Maximum in bag" : added ? `Added ${addedQuantity} to bag` : `Add ${quantityToAdd} to bag`}<span aria-hidden="true">{added ? "✓" : "↗"}</span>
        </button>
        <p className="product-info__shipping">Complimentary Ghana shipping on orders over GH₵100</p>
      </div>
      <div className="product-specs" id="size-guide">
        <p><strong>Fit</strong>Relaxed oversized</p><p><strong>Fabric</strong>{product.fabric}</p><p><strong>Care</strong>Cold wash, inside out</p>
      </div>
      <ProductReviews productSlug={product.slug} reviews={product.reviews ?? []} />
    </>
  );
}