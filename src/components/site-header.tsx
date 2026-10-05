"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/cart-store";

export default function SiteHeader() {
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="38 RICHES home"><Image src="/images/38-richies-embroidered.svg" alt="38 RICHIES embroidered logo" width={88} height={68} priority /></Link>
      <nav className="main-nav" aria-label="Main navigation"><Link href="/#shop">Shop</Link><Link href="/journal">Journal</Link><Link href="/#story">Our story</Link></nav>
      <Link className="bag-link" href="/cart" aria-label={`Shopping bag, ${count} items`}>
        Bag <span className="bag-count">{hasHydrated ? count : 0}</span>
      </Link>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        <Link href="/#shop"><span aria-hidden="true">⌕</span>Shop</Link>
        <Link href="/journal"><span aria-hidden="true">↗</span>Journal</Link>
        <Link href="/cart" aria-label={`Shopping bag, ${count} items`}><span aria-hidden="true">▣</span>Bag{hasHydrated && count ? ` (${count})` : ""}</Link>
      </nav>
    </header>
  );
}