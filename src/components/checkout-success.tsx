"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

type Passport = { orderNumber: string; createdAt: string; items: { title: string; size: string; color?: string; quantity: number; dropName?: string; preOrder?: boolean }[] };

export default function CheckoutSuccess({ verified, paymentProvider, orderReference, passport }: { verified: boolean; paymentProvider: "Paystack" | "Stripe"; orderReference: string; passport?: Passport }) {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    if (verified) clearCart();
  }, [clearCart, verified]);

  return (
    <main className="message-page">
      <p className="eyebrow">{verified ? "PAYMENT CONFIRMED / 38 RICHES" : "CHECKOUT / 38 RICHES"}</p>
      <h1>{verified ? <>THANK YOU<br />FOR YOUR ORDER.</> : <>PAYMENT<br />UNCONFIRMED.</>}</h1>
      <p>{verified
        ? `Thank you for choosing 38 RICHES. Your ${paymentProvider} payment is confirmed. Save your tracking code below and use it with your checkout email to follow your order through delivery.${passport?.items.some((item) => item.preOrder) ? " Pre-order items are paid in full; their shipping date will be announced later." : ""}`
        : `We could not confirm a completed payment. Your bag is still saved; return to checkout or check your ${paymentProvider} confirmation.`}</p>
      {verified && orderReference && <p className="message-page__reference">Your order / tracking code <code>{orderReference}</code></p>}
      {verified && passport && <section className="drop-passport" aria-label="38 RICHES Drop Passport">
        <div className="drop-passport__topline"><span>38 RICHES / DROP PASSPORT</span><span>PAID / VERIFIED</span></div>
        <p className="drop-passport__number">{passport.orderNumber}</p>
        <p className="drop-passport__date">ISSUED {new Date(passport.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })}</p>
        <ul>{passport.items.map((item, index) => <li key={`${item.title}-${item.size}-${index}`}><span><strong>{item.title}</strong><small>{item.preOrder ? "PRE-ORDER / SHIPPING DATE TO BE ANNOUNCED" : item.dropName ?? "38 RICHES ARCHIVE"} / {item.size}{item.color ? ` / ${item.color}` : ""}</small></span><span>× {item.quantity}</span></li>)}</ul>
      </section>}
      <div className="message-page__actions">
        <Link className="button button--lime" href={verified ? "/#shop" : "/cart"}>{verified ? "Continue shopping" : "Return to your bag"}<span aria-hidden="true">↗</span></Link>
        {verified && orderReference && <Link className="message-page__track" href={`/track?reference=${encodeURIComponent(orderReference)}`}>Track your order ↗</Link>}
      </div>
    </main>
  );
}