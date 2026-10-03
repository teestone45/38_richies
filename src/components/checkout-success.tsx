"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

export default function CheckoutSuccess({ verified, paymentProvider, orderReference }: { verified: boolean; paymentProvider: "Paystack" | "Stripe"; orderReference: string }) {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    if (verified) clearCart();
  }, [clearCart, verified]);

  return (
    <main className="message-page">
      <p className="eyebrow">{verified ? "PAYMENT CONFIRMED / 38 RICHES" : "CHECKOUT / 38 RICHES"}</p>
      <h1>{verified ? <>YOU MOVED<br />DIFFERENT.</> : <>PAYMENT<br />UNCONFIRMED.</>}</h1>
      <p>{verified
        ? `${paymentProvider} confirmed your payment. Check your receipt for the order details.`
        : `We could not confirm a completed payment. Your bag is still saved; return to checkout or check your ${paymentProvider} confirmation.`}</p>
      {verified && orderReference && <p className="message-page__reference">Order reference <code>{orderReference}</code></p>}
      <div className="message-page__actions">
        <Link className="button button--lime" href={verified ? "/" : "/cart"}>{verified ? "Back to the drop" : "Return to your bag"}<span aria-hidden="true">↗</span></Link>
        {verified && <Link className="message-page__track" href="/track">Track your order ↗</Link>}
      </div>
    </main>
  );
}