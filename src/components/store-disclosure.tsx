"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function StoreDisclosure({
  children,
  title = "Explore the store",
  description = "Shop the collection and preview upcoming drops",
}: { children: ReactNode; title?: string; description?: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function revealAnchor() {
      const target = document.getElementById(window.location.hash.slice(1));
      const details = detailsRef.current;
      if (target && details?.contains(target)) {
        details.open = true;
        target.scrollIntoView();
      }
    }

    revealAnchor();
    window.addEventListener("hashchange", revealAnchor);
    return () => window.removeEventListener("hashchange", revealAnchor);
  }, []);

  return (
    <details className="store-disclosure" ref={detailsRef}>
      <summary className="store-disclosure__trigger page-shell">
        <span><strong>{title}</strong><small>{description}</small></span>
        <span className="store-disclosure__icon" aria-hidden="true">+</span>
      </summary>
      {children}
    </details>
  );
}
