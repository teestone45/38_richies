"use client";

import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { formatCurrency } from "@/lib/currency";

const formatPrice = (pesewas: number) => formatCurrency(pesewas / 100);

export default function CartView() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const [checkoutError, setCheckoutError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const subtotal = items.reduce((total, item) => total + item.priceCents * item.quantity, 0);

  async function beginCheckout() {
    setIsCheckingOut(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ productId, size, color, quantity }) => ({ productId, size, color: color ?? "Default", quantity })) }),
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? "Checkout could not be started. Please try again.");
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not be started. Please try again.");
      setIsCheckingOut(false);
    }
  }

  return (
    <section aria-live="polite">
      <div className="cart-heading"><div><p className="eyebrow">YOUR SELECTION</p><h1>THE BAG</h1></div><p>{hasHydrated ? `${items.reduce((sum, item) => sum + item.quantity, 0)} items` : "Loading bag..."}</p></div>
      {!hasHydrated ? <div className="cart-empty">Loading your bag...</div> : items.length === 0 ? (
        <div className="cart-empty"><p>Your bag is taking a breather.</p><Link className="button button--lime" href="/#shop">Shop the drop <span aria-hidden="true">↗</span></Link></div>
      ) : (
        <>
          <ul className="cart-list">
            {items.map((item) => (
              <li className="cart-row" key={`${item.productId}-${item.size}-${item.color ?? "Default"}`}>
                <div className="cart-row__image" style={{ backgroundImage: `url("${item.image}")` }} role="img" aria-label={item.title} />
                <div className="cart-row__info">
                  <h2>{item.title}</h2><p>Color / {item.color ?? "Default"} · Size / {item.size} · {formatPrice(item.priceCents)}</p>
                  <div className="cart-row__actions" aria-label={`Quantity for ${item.title}`}>
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(item.productId, item.size, item.quantity - 1, item.color)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(item.productId, item.size, Math.min(item.quantity + 1, 10), item.color)} disabled={item.quantity >= 10}>+</button>
                  </div>
                  <button className="cart-row__remove" type="button" onClick={() => removeItem(item.productId, item.size, item.color)}>Remove</button>
                </div>
                <span className="cart-row__price">{formatPrice(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-summary">
            <p className="cart-summary__line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p>
            <p className="cart-summary__line"><span>Shipping</span><span>{subtotal >= 10000 ? "Complimentary" : "Calculated at checkout"}</span></p>
            <p className="cart-summary__line cart-summary__line--total"><span>Total before shipping</span><span>{formatPrice(subtotal)}</span></p>
            <p className="cart-summary__shipping">Shipping is added securely at checkout. Complimentary Ghana shipping over GH₵100.</p>
            <button className="button button--lime" type="button" onClick={beginCheckout} disabled={isCheckingOut}>
              {isCheckingOut ? "Opening secure checkout..." : "Checkout securely"}<span aria-hidden="true">↗</span>
            </button>
            {checkoutError && <p className="cart-error" role="alert">{checkoutError}</p>}
          </div>
        </>
      )}
    </section>
  );
}