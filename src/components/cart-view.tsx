"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
  const [deliveryInfo, setDeliveryInfo] = useState({ email: "", name: "", phone: "", address: "", city: "", region: "" });
  const subtotal = items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
  const shipping = subtotal >= 10000 ? 0 : 800;

  async function beginCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCheckingOut(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ productId, size, color, quantity }) => ({ productId, size, color: color ?? "Default", quantity })),
          customer: deliveryInfo,
        }),
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
          <form className="cart-summary" onSubmit={beginCheckout}>
            <fieldset className="cart-checkout-details">
              <legend>GHANA DELIVERY DETAILS</legend>
              <label>Email<input type="email" autoComplete="email" required value={deliveryInfo.email} onChange={(event) => setDeliveryInfo((current) => ({ ...current, email: event.target.value }))} /></label>
              <label>Full name<input type="text" autoComplete="name" maxLength={120} required value={deliveryInfo.name} onChange={(event) => setDeliveryInfo((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Phone number<input type="tel" autoComplete="tel" maxLength={40} required value={deliveryInfo.phone} onChange={(event) => setDeliveryInfo((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Delivery address<textarea autoComplete="street-address" maxLength={300} required value={deliveryInfo.address} onChange={(event) => setDeliveryInfo((current) => ({ ...current, address: event.target.value }))} /></label>
              <div className="cart-checkout-details__grid">
                <label>City<input type="text" autoComplete="address-level2" maxLength={80} required value={deliveryInfo.city} onChange={(event) => setDeliveryInfo((current) => ({ ...current, city: event.target.value }))} /></label>
                <label>Region<input type="text" autoComplete="address-level1" maxLength={80} required value={deliveryInfo.region} onChange={(event) => setDeliveryInfo((current) => ({ ...current, region: event.target.value }))} /></label>
              </div>
            </fieldset>
            <p className="cart-summary__line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></p>
            <p className="cart-summary__line"><span>Shipping</span><span>{shipping ? formatPrice(shipping) : "Complimentary"}</span></p>
            <p className="cart-summary__line cart-summary__line--total"><span>Total</span><span>{formatPrice(subtotal + shipping)}</span></p>
            <p className="cart-summary__shipping">Shipping is added securely at checkout. Complimentary Ghana shipping over GH₵100.</p>
            <button className="button button--lime" type="submit" disabled={isCheckingOut}>
              {isCheckingOut ? "Opening Paystack checkout..." : "Pay securely with Paystack"}<span aria-hidden="true">↗</span>
            </button>
            {checkoutError && <p className="cart-error" role="alert">{checkoutError}</p>}
          </form>
        </>
      )}
    </section>
  );
}