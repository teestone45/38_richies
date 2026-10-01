"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart-store";

export default function SiteHeader() {
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="38 RICHES home">38<span>R</span></Link>
      <nav className="main-nav" aria-label="Main navigation"><Link href="/#shop">Shop</Link><Link href="/#story">Our story</Link></nav>
      <Link className="bag-link" href="/cart" aria-label={`Shopping bag, ${count} items`}>
        Bag <span className="bag-count">{hasHydrated ? count : 0}</span>
      </Link>
    </header>
  );
}