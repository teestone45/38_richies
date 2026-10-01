"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

export default function CheckoutSuccess({ verified }: { verified: boolean }) {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    if (verified) clearCart();
  }, [clearCart, verified]);

  return (
    <main className="message-page">
      <p className="eyebrow">{verified ? "PAYMENT CONFIRMED / 38 RICHES" : "CHECKOUT / 38 RICHES"}</p>
      <h1>{verified ? <>YOU MOVED<br />DIFFERENT.</> : <>PAYMENT<br />UNCONFIRMED.</>}</h1>
      <p>{verified
        ? "Stripe confirmed your payment. Check your Stripe receipt for the order details."
        : "We could not confirm a completed payment for this session. Your bag is still saved; return to checkout or check your Stripe confirmation."}</p>
      <Link className="button button--lime" href={verified ? "/" : "/cart"}>{verified ? "Back to the drop" : "Return to your bag"}<span aria-hidden="true">↗</span></Link>
    </main>
  );
}